package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@lombok.extern.slf4j.Slf4j
@Service @RequiredArgsConstructor
public class ReminderService {
    private final UserRepository users;
    private final MealRepository meals;
    private final MissedEventRepository missed;
    private final NotificationRepository notifications;
    private final PushQueueService push;
    private final WorkflowNotificationService notices;
    private final PlanService plans;
    private final UserProfileRepository profiles;
    private final WaterLogRepository water;
    @org.springframework.beans.factory.annotation.Value("${app.hydration.deadline:20:00}")
    private String hydrationDeadline;
    private final Clock clock;
    private final ZoneId applicationZoneId;
    private final org.springframework.transaction.PlatformTransactionManager transactions;

    public void refresh() {
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactions);
        for (var user : users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE).stream().sorted(Comparator.comparing(User::getId)).toList()) {
            try {
                // Release this member's lock before processing the next member.
                transaction.executeWithoutResult(status -> refreshMember(user.getId()));
            } catch (RuntimeException error) {
                log.warn("Reminder refresh failed for member {}: {}", user.getId(), error.getClass().getSimpleName());
            }
        }
        transaction.executeWithoutResult(status -> resolveCompletedMeals());
    }

    private void refreshMember(Long memberId) {
            var user = users.lockById(memberId).orElseThrow();
            if (user.getStatus() != User.Status.ACTIVE) return;
            plans.ensureDailyMeals(user.getId());
            var today = LocalDate.now(clock.withZone(applicationZoneId));
            var dueMeals = new ArrayList<Meal>();
            dueMeals.addAll(meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), today.minusDays(1)));
            dueMeals.addAll(meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), today));
            for (var meal : dueMeals) {
                String key = "meal-" + meal.getId();
                var due = meal.getMealDate().atTime(meal.getMealTime()).atZone(applicationZoneId).toInstant();
                String notificationKey = key + "-" + due.getEpochSecond();
                if (meal.isConsumed()) {
                    missed.findBySourceKey(key).ifPresent(event -> { event.setResolved(true); missed.save(event); });
                    continue;
                }
                if (!clock.instant().isBefore(due.minusSeconds(1800)) && !clock.instant().isAfter(due.plusSeconds(3600)) && !notifications.existsBySourceKey(notificationKey)) {
                    var notification = notifications.save(NotificationEvent.builder().user(user).sourceKey(notificationKey).title(meal.getType() + " check-in")
                            .body(meal.getName() + " is scheduled for " + meal.getMealTime()).scheduledAt(due.minusSeconds(1800)).build());
                    push.enqueue(notification, PushDelivery.Kind.MEAL, due.plusSeconds(3600));
                }
                if (clock.instant().isAfter(due)) {
                    var attention = missed.findBySourceKey(key).orElseGet(() -> missed.save(MissedEvent.builder().user(user).sourceKey(key)
                            .itemType("Meals").itemTitle(meal.getType() + " check-in is overdue").missedAt(due).build()));
                    if (!attention.isResolved()) {
                        notices.admins(PushDelivery.Kind.DEADLINE, "deadline-" + attention.getId(), "A member may need support", user.getFullName() + " missed posting " + meal.getName() + " (" + meal.getType() + ") by " + meal.getMealTime() + ". Open Attention to review it.");
                        notices.notify(user, PushDelivery.Kind.DEADLINE, "member-deadline-" + attention.getId(),
                                "Your meal check-in is overdue", "Open your timeline to review your missed meal check-in.");
                    }
                }
            }
            // A daily goal is assessed at the configured local deadline, never early in the day.
            for (var day : List.of(today.minusDays(1), today)) {
                var deadline = day.atTime(LocalTime.parse(hydrationDeadline)).atZone(applicationZoneId).toInstant();
                if (!clock.instant().isAfter(deadline)) continue;
                var profile = profiles.findByUserId(user.getId()).orElse(null);
                int goal = profile == null || profile.getWaterGoalMl() == null || profile.getWaterGoalMl() <= 0
                        ? 2000 : profile.getWaterGoalMl();
                int logged = water.findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAt(user.getId(),
                        day.atStartOfDay(applicationZoneId).toInstant(), day.plusDays(1).atStartOfDay(applicationZoneId).toInstant())
                        .stream().mapToInt(WaterLog::getAmountMl).sum();
                String key = "hydration-" + user.getId() + "-" + day;
                if (logged >= goal) {
                    missed.findBySourceKey(key).ifPresent(event -> { event.setResolved(true); missed.save(event); });
                    continue;
                }
                // Do not invent a missed day before this account was created.
                if (user.getCreatedAt().isAfter(deadline)) continue;
                var attention = missed.findBySourceKey(key).orElseGet(() -> missed.save(MissedEvent.builder().user(user)
                        .sourceKey(key).itemType("Hydration").itemTitle("Daily hydration goal is overdue")
                        .missedAt(deadline).build()));
                if (!attention.isResolved()) {
                    notices.admins(PushDelivery.Kind.DEADLINE, "deadline-" + attention.getId(), "A member missed their hydration goal",
                            user.getFullName() + " logged " + logged + " of " + goal + " ml for " + day + ". Open Attention to review it.");
                    notices.notify(user, PushDelivery.Kind.DEADLINE, "member-deadline-" + attention.getId(),
                            "Your hydration goal needs a check-in", "You logged " + logged + " of " + goal + " ml for " + day + ".");
                }
            }
    }

    private void resolveCompletedMeals() {
        for (var event : missed.findByResolvedFalseOrderByMissedAtDesc()) {
            if (event.getSourceKey() != null && event.getSourceKey().startsWith("meal-") &&
                    meals.findById(Long.parseLong(event.getSourceKey().substring(5))).map(Meal::isConsumed).orElse(true)) {
                event.setResolved(true); missed.save(event);
            }
        }
    }

    @Transactional(readOnly = true) public List<Map<String, Object>> attention() {
        var events = missed.findByResolvedFalseOrderByMissedAtDesc();
        var nudgeKeys = events.stream().map(e -> "nudge-" + e.getId()).toList();
        var nudged = nudgeKeys.isEmpty() ? Set.<String>of() : new HashSet<>(notifications.existingSourceKeys(nudgeKeys));
        return events.stream().filter(e -> e.getUser().getStatus() == User.Status.ACTIVE).map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", e.getId()); row.put("memberId", e.getUser().getId()); row.put("memberName", e.getUser().getFullName());
            row.put("initials", AdminWorkspaceService.initials(e.getUser().getFullName())); row.put("category", e.getItemType()); row.put("title", e.getItemTitle());
            row.put("missedAt", e.getMissedAt().atZone(applicationZoneId).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a")));
            row.put("severity", e.getMissedAt().isBefore(clock.instant().minusSeconds(10800)) ? "HIGH" : "MEDIUM");
            row.put("status", nudged.contains("nudge-" + e.getId()) ? "NUDGED" : "OPEN"); return row;
        }).toList();
    }
    @Transactional public void resolve(Long id) {
        var event = missed.findById(id).orElseThrow(() -> new NotFoundException("Attention item not found"));
        event.setResolved(true); missed.save(event);
    }
    @Transactional public void nudge(Long id) {
        var event = missed.findById(id).orElseThrow(() -> new NotFoundException("Attention item not found"));
        users.lockById(event.getUser().getId()).orElseThrow();
        if (event.isResolved() || notifications.existsBySourceKey("nudge-" + id)) return;
        var notification = notifications.save(NotificationEvent.builder().user(event.getUser()).sourceKey("nudge-" + id).title("A reminder from your coach")
                .body(event.getItemTitle()).scheduledAt(clock.instant()).build());
        push.enqueue(notification, PushDelivery.Kind.NUDGE, clock.instant().plusSeconds(14400));
    }
}
