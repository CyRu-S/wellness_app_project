package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class ReminderService {
    private final UserRepository users;
    private final MealRepository meals;
    private final MissedEventRepository missed;
    private final NotificationRepository notifications;
    private final PushQueueService push;
    private final WorkflowNotificationService notices;
    private final PlanService plans;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional public void refresh() {
        for (var user : users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE).stream().sorted(Comparator.comparing(User::getId)).toList()) {
            users.lockById(user.getId()).orElseThrow();
            plans.ensureDailyMeals(user.getId());
            for (var meal : meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.now(clock.withZone(applicationZoneId)))) {
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
                if (clock.instant().isAfter(due.plusSeconds(3600)) && missed.findBySourceKey(key).isEmpty()) {
                    var attention = missed.save(MissedEvent.builder().user(user).sourceKey(key).itemType("Meals").itemTitle(meal.getType() + " check-in is overdue").missedAt(due).build());
                    notices.admins(PushDelivery.Kind.DEADLINE, "deadline-" + attention.getId(), "A member may need support", user.getFullName() + " has an overdue meal check-in. Open Attention to review it.");
                }
            }
        }
        for (var event : missed.findByResolvedFalseOrderByMissedAtDesc()) {
            if (event.getSourceKey() != null && event.getSourceKey().startsWith("meal-") &&
                    meals.findById(Long.parseLong(event.getSourceKey().substring(5))).map(Meal::isConsumed).orElse(true)) {
                event.setResolved(true); missed.save(event);
            }
        }
    }

    @Transactional(readOnly = true) public List<Map<String, Object>> attention() {
        return missed.findByResolvedFalseOrderByMissedAtDesc().stream().filter(e -> e.getUser().getStatus() == User.Status.ACTIVE).map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", e.getId()); row.put("memberId", e.getUser().getId()); row.put("memberName", e.getUser().getFullName());
            row.put("initials", AdminWorkspaceService.initials(e.getUser().getFullName())); row.put("category", e.getItemType()); row.put("title", e.getItemTitle());
            row.put("missedAt", e.getMissedAt().atZone(applicationZoneId).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a")));
            row.put("severity", e.getMissedAt().isBefore(clock.instant().minusSeconds(10800)) ? "HIGH" : "MEDIUM");
            row.put("status", notifications.existsBySourceKey("nudge-" + e.getId()) ? "NUDGED" : "OPEN"); return row;
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
