package com.wellnessapp.service;

import com.wellnessapp.dto.access.MemberNudgeType;
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
    private static final Duration NUDGE_COOLDOWN = Duration.ofMinutes(30);

    public record NudgeResult(boolean sent, MemberNudgeType type, Instant lastSentAt, Instant availableAt) {}

    private final UserRepository users;
    private final MealRepository meals;
    private final MissedEventRepository missed;
    private final NotificationRepository notifications;
    private final PushQueueService push;
    private final WorkflowNotificationService notices;
    private final PlanService plans;
    private final UserProfileRepository profiles;
    private final WaterLogRepository water;
    private final MemberAccessService memberAccess;
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
                Instant reminderAt = due.minusSeconds(300);
                if (!clock.instant().isBefore(reminderAt) && clock.instant().isBefore(reminderAt.plusSeconds(60))
                        && !notifications.existsBySourceKey(notificationKey)) {
                    var notification = notifications.save(NotificationEvent.builder().user(user).sourceKey(notificationKey)
                            .title(firstName(user) + " · " + meal.getName())
                            .body("Log " + meal.getName() + " in 5 minutes.")
                            .scheduledAt(reminderAt).build());
                    push.enqueue(notification, PushDelivery.Kind.MEAL, due);
                }
                if (clock.instant().isAfter(due)) {
                    var attention = missed.findBySourceKey(key).orElseGet(() -> missed.save(MissedEvent.builder().user(user).sourceKey(key)
                            .itemType("Meals").itemTitle(meal.getType() + " check-in is overdue").missedAt(due).build()));
                }
            }
            for (var habit : plans.scheduledTasks(user.getId())) {
                var due = today.atTime(habit.getScheduledTime()).atZone(applicationZoneId).toInstant();
                String dayKey = "habit-" + habit.getId() + "-" + today;
                String reminderKey = "habit-reminder-" + habit.getId() + "-" + today;
                if (plans.habitCompleted(user.getId(), habit.getId(), today)) {
                    missed.findBySourceKey(dayKey).ifPresent(event -> { event.setResolved(true); missed.save(event); });
                    continue;
                }
                Instant reminderAt = due.minusSeconds(300);
                if (!clock.instant().isBefore(reminderAt) && clock.instant().isBefore(reminderAt.plusSeconds(60))
                        && !notifications.existsBySourceKey(reminderKey)) {
                    var notification = notifications.save(NotificationEvent.builder().user(user).sourceKey(reminderKey)
                            .title(firstName(user) + " · " + habit.getTitle())
                            .body("Complete this daily task in 5 minutes.")
                            .scheduledAt(reminderAt).build());
                    push.enqueue(notification, PushDelivery.Kind.HABIT, due);
                }
                if (clock.instant().isAfter(due)) {
                    var attention = missed.findBySourceKey(dayKey).orElseGet(() -> missed.save(MissedEvent.builder().user(user)
                            .sourceKey(dayKey).itemType(habit.getDetail()).itemTitle(habit.getTitle() + " is overdue")
                            .missedAt(due).build()));
                }
            }
            if (user.getFollowUpAt() != null && !clock.instant().isBefore(user.getFollowUpAt())) {
                Instant due = user.getFollowUpAt();
                String key = "followup-" + user.getId() + "-" + due.getEpochSecond();
                var attention = missed.findBySourceKey(key).orElseGet(() -> missed.save(MissedEvent.builder().user(user)
                        .sourceKey(key).itemType("Follow-up").itemTitle("Scheduled member follow-up")
                        .missedAt(due).build()));
                user.setFollowUpAt(null);
                users.save(user);
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
        Set<Long> nudgedIds = notifications.sourceKeysStartingWith("nudge-").stream().map(key -> {
            try { return Long.parseLong(key.substring(6).split("-")[0]); }
            catch (RuntimeException ignored) { return null; }
        }).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        String dailyPrefix = "care-nudge-" + LocalDate.now(clock.withZone(applicationZoneId)) + "-to-";
        Set<Long> nudgedMemberIds = notifications.sourceKeysStartingWith(dailyPrefix).stream().map(key -> {
            try { return Long.parseLong(key.substring(dailyPrefix.length())); }
            catch (RuntimeException ignored) { return null; }
        }).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        Set<String> recentMemberNudges = notifications
                .sourceKeysStartingWithSince("member-nudge-", clock.instant().minus(NUDGE_COOLDOWN)).stream()
                .map(this::nudgeAudienceFromKey)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        return events.stream().filter(e -> e.getUser().getStatus() == User.Status.ACTIVE).map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", e.getId()); row.put("memberId", e.getUser().getId()); row.put("memberName", e.getUser().getFullName());
            row.put("initials", AdminWorkspaceService.initials(e.getUser().getFullName())); row.put("category", e.getItemType()); row.put("title", e.getItemTitle());
            row.put("missedAt", e.getMissedAt().atZone(applicationZoneId).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a")));
            row.put("severity", e.getMissedAt().isBefore(clock.instant().minusSeconds(10800)) ? "HIGH" : "MEDIUM");
            String audience = e.getUser().getId() + ":" + nudgeType(e).name();
            row.put("status", nudgedIds.contains(e.getId()) || nudgedMemberIds.contains(e.getUser().getId())
                    || recentMemberNudges.contains(audience) ? "NUDGED" : "OPEN"); return row;
        }).toList();
    }
    @Transactional public void resolve(Long id) {
        var event = missed.findById(id).orElseThrow(() -> new NotFoundException("Attention item not found"));
        event.setResolved(true); missed.save(event);
    }
    @Transactional public void nudge(Long id) {
        var event = missed.findById(id).orElseThrow(() -> new NotFoundException("Attention item not found"));
        if ("Hydration".equalsIgnoreCase(event.getItemType())) {
            throw new com.wellnessapp.exception.BadRequestException("Use the club hydration reminder from the dashboard");
        }
        if (event.isResolved()) return;
        sendMemberNudge(event.getUser(), nudgeType(event), nudgeAction(event));
    }

    @Transactional public int nudgeHydrationForAll() {
        var today = LocalDate.now(clock.withZone(applicationZoneId));
        int notified = 0;
        for (var user : users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE)) {
            String source = nudgeSourcePrefix(MemberNudgeType.HYDRATION) + "club-" + today;
            boolean existed = notifications.existsBySourceKey(source + "-to-" + user.getId());
            notices.notify(user, PushDelivery.Kind.NUDGE, source, firstName(user) + " · Hydration",
                    "Drink water and log your intake.");
            if (!existed) notified++;
        }
        return notified;
    }

    @Transactional public NudgeResult nudgeSharedMember(String viewerEmail, Long memberId, MemberNudgeType type) {
        User viewer = users.findByEmailIgnoreCase(viewerEmail)
                .orElseThrow(() -> new NotFoundException("Shared member not found"));
        if (!memberAccess.canReadMember(viewer, memberId) || viewer.getRole() == User.Role.ADMIN) {
            throw new NotFoundException("Shared member not found");
        }
        User member = users.findById(memberId).orElseThrow(() -> new NotFoundException("Shared member not found"));
        return sendMemberNudge(member, type, nudgeMessage(type));
    }

    static String nudgeSourcePrefix(MemberNudgeType type) {
        return "member-nudge-" + type.name() + "-";
    }

    private NudgeResult sendMemberNudge(User member, MemberNudgeType type, String body) {
        User lockedMember = users.lockById(member.getId())
                .orElseThrow(() -> new NotFoundException("Shared member not found"));
        Instant now = clock.instant();
        var recent = notifications
                .findFirstByUserIdAndSourceKeyStartingWithAndScheduledAtGreaterThanEqualOrderByScheduledAtDesc(
                        lockedMember.getId(), nudgeSourcePrefix(type), now.minus(NUDGE_COOLDOWN));
        if (recent.isPresent()) {
            Instant sentAt = recent.get().getScheduledAt();
            return new NudgeResult(false, type, sentAt, sentAt.plus(NUDGE_COOLDOWN));
        }
        notices.notify(lockedMember, PushDelivery.Kind.NUDGE, nudgeSourcePrefix(type) + now.toEpochMilli(),
                firstName(lockedMember) + " · " + nudgeTitle(type), body);
        Instant sentAt = notifications
                .findFirstByUserIdAndSourceKeyStartingWithAndScheduledAtGreaterThanEqualOrderByScheduledAtDesc(
                        lockedMember.getId(), nudgeSourcePrefix(type), now.minus(NUDGE_COOLDOWN))
                .map(NotificationEvent::getScheduledAt)
                .orElse(now);
        return new NudgeResult(true, type, sentAt, sentAt.plus(NUDGE_COOLDOWN));
    }

    private MemberNudgeType nudgeType(MissedEvent event) {
        String value = (event.getItemType() + " " + event.getItemTitle()).toLowerCase(Locale.ROOT);
        if (value.contains("meal")) return MemberNudgeType.MEALS;
        if (value.contains("hydration") || value.contains("water")) return MemberNudgeType.HYDRATION;
        if (value.contains("exercise") || value.contains("activity") || value.contains("move")) return MemberNudgeType.EXERCISE;
        return MemberNudgeType.HABITS;
    }

    private String nudgeTitle(MemberNudgeType type) {
        return switch (type) {
            case MEALS -> "Meal reminder";
            case HYDRATION -> "Hydration";
            case EXERCISE -> "Move reminder";
            case HABITS -> "To-do reminder";
        };
    }

    private String nudgeMessage(MemberNudgeType type) {
        return switch (type) {
            case MEALS -> "Complete and log your assigned meal.";
            case HYDRATION -> "Drink water and log your intake.";
            case EXERCISE -> "Complete your movement and log it.";
            case HABITS -> "Complete your assigned to-do items.";
        };
    }

    private String nudgeAudienceFromKey(String key) {
        try {
            String prefix = "member-nudge-";
            int typeEnd = key.indexOf('-', prefix.length());
            String type = key.substring(prefix.length(), typeEnd);
            Long memberId = Long.parseLong(key.substring(key.lastIndexOf("-to-") + 4));
            return memberId + ":" + type;
        }
        catch (RuntimeException ignored) { return null; }
    }

    private String nudgeAction(MissedEvent event) {
        String item = event.getItemTitle().replaceAll("(?i)\\s+(check-in\\s+)?is overdue$", "")
                .replaceAll("(?i)\\s+overdue$", "").trim();
        if ("Meals".equalsIgnoreCase(event.getItemType())) {
            return "Take your scheduled " + item.toLowerCase(Locale.ROOT) + " and post the check-in.";
        }
        return "Complete " + item + ".";
    }

    private String firstName(User user) {
        String name = user.getFullName() == null ? "Member" : user.getFullName().trim();
        int space = name.indexOf(' ');
        return space > 0 ? name.substring(0, space) : name;
    }
}
