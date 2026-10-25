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
    private final PlanItemRepository planItems;
    private final PlanItemCompletionRepository completions;
    private final MemberAccessService memberAccess;
    private final jakarta.persistence.EntityManager entities;
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
        var events = missed.findByResolvedFalseOrderByMissedAtDesc().stream()
                .filter(event -> event.getSourceKey() != null && event.getSourceKey().matches("meal-\\d+")).toList();
        if (events.isEmpty()) return;
        var ids = events.stream().map(event -> Long.parseLong(event.getSourceKey().substring(5))).toList();
        var incomplete = new HashSet<>(meals.incompleteIds(ids));
        for (var event : events) {
            if (!incomplete.contains(Long.parseLong(event.getSourceKey().substring(5)))) event.setResolved(true);
        }
    }

    @Transactional(readOnly = true) public List<Map<String, Object>> attention() {
        return attentionRows(missed.findByResolvedFalseOrderByMissedAtDesc());
    }

    @Transactional(readOnly = true) public List<Map<String, Object>> sharedAttention(String viewerEmail, Long memberId) {
        requireSharedCoach(viewerEmail, memberId);
        return attentionRows(missed.findByUserIdAndResolvedFalseOrderByMissedAtDesc(memberId));
    }

    private void requireSharedCoach(String viewerEmail, Long memberId) {
        User viewer = users.findByEmailIgnoreCase(viewerEmail)
                .orElseThrow(() -> new NotFoundException("Shared member not found"));
        if (viewer.getRole() != User.Role.USER || Objects.equals(viewer.getId(), memberId)
                || !memberAccess.canReadMember(viewer, memberId)) {
            throw new NotFoundException("Shared member not found");
        }
    }

    @Transactional public NudgeResult nudgeSharedAttention(String viewerEmail, Long memberId, Long attentionId) {
        requireSharedCoach(viewerEmail, memberId);
        var event = missed.findById(attentionId)
                .filter(item -> Objects.equals(item.getUser().getId(), memberId))
                .orElseThrow(() -> new NotFoundException("Attention item not found"));
        return sendMemberNudge(event.getUser(), nudgeType(event), nudgeAction(event), event);
    }

    private List<Map<String, Object>> attentionRows(List<MissedEvent> events) {
        Map<Long, Instant> recentMemberNudges = recentMemberNudges();
        return incompleteItems(events).stream().filter(e -> e.getUser().getStatus() == User.Status.ACTIVE).map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", e.getId()); row.put("memberId", e.getUser().getId()); row.put("memberName", e.getUser().getFullName());
            row.put("initials", AdminWorkspaceService.initials(e.getUser().getFullName())); row.put("category", e.getItemType()); row.put("title", e.getItemTitle());
            row.put("missedAt", e.getMissedAt().atZone(applicationZoneId).format(java.time.format.DateTimeFormatter.ofPattern("d MMM, h:mm a")));
            row.put("severity", e.getMissedAt().isBefore(clock.instant().minusSeconds(10800)) ? "HIGH" : "MEDIUM");
            Instant lastSentAt = recentMemberNudges.get(e.getUser().getId());
            row.put("type", nudgeType(e).name());
            row.put("lastSentAt", lastSentAt);
            row.put("availableAt", lastSentAt == null ? null : lastSentAt.plus(NUDGE_COOLDOWN));
            row.put("status", lastSentAt != null ? "NUDGED" : "OPEN"); return row;
        }).toList();
    }

    private Map<Long, Instant> recentMemberNudges() {
        Map<Long, Instant> recentMemberNudges = new HashMap<>();
        for (var stamp : users.recentNudges(clock.instant().minus(NUDGE_COOLDOWN)))
            recentMemberNudges.put(stamp.getMemberId(), stamp.getSentAt());
        return recentMemberNudges;
    }
    @Transactional public void resolve(Long id) {
        var event = missed.findById(id).orElseThrow(() -> new NotFoundException("Attention item not found"));
        event.setResolved(true); missed.save(event);
    }
    @Transactional public NudgeResult nudge(Long id) {
        var event = missed.findById(id).orElseThrow(() -> new NotFoundException("Attention item not found"));
        if ("Hydration".equalsIgnoreCase(event.getItemType())) {
            throw new com.wellnessapp.exception.BadRequestException("Use the club hydration reminder from the dashboard");
        }
        return sendMemberNudge(event.getUser(), nudgeType(event), nudgeAction(event), event);
    }

    public record HydrationStatus(int notified, Instant availableAt) {}

    @Transactional(readOnly = true)
    public HydrationStatus hydrationStatus() {
        var active = users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE);
        Instant next = null;
        for (var member : active) {
            var sentAt = member.getLastNudgedAt();
            // A new member or an expired lock makes the button available.
            if (sentAt == null || !sentAt.plus(NUDGE_COOLDOWN).isAfter(clock.instant())) return new HydrationStatus(0, null);
            var available = sentAt.plus(NUDGE_COOLDOWN);
            if (next == null || available.isBefore(next)) next = available;
        }
        return new HydrationStatus(0, next);
    }

    public int nudgeHydrationForAll() {
        int notified = 0;
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactions);
        var recent = recentMemberNudges();
        for (var user : users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE).stream()
                .sorted(Comparator.comparing(User::getId)).toList()) {
            if (recent.containsKey(user.getId())) continue;
            // Commit each recipient before moving on; never hold the whole club's locks.
            var sent = transaction.execute(status -> sendMemberNudge(user, MemberNudgeType.HYDRATION,
                    nudgeMessage(MemberNudgeType.HYDRATION)).sent());
            if (Boolean.TRUE.equals(sent)) notified++;
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
        return sendMemberNudge(member, type, body, null);
    }

    private NudgeResult sendMemberNudge(User member, MemberNudgeType type, String body, MissedEvent item) {
        User lockedMember = users.lockById(member.getId())
                .orElseThrow(() -> new NotFoundException("Shared member not found"));
        // The event may have loaded this entity before a competing transaction.
        // Refresh after locking so status and cooldown both reflect its committed changes.
        entities.refresh(lockedMember);
        if (lockedMember.getStatus() != User.Status.ACTIVE)
            throw new com.wellnessapp.exception.BadRequestException("This member is no longer active. Refresh the view.");
        if (item != null && incompleteItems(List.of(item)).isEmpty())
            throw new com.wellnessapp.exception.BadRequestException("This item is already completed or resolved. Refresh the view.");
        Instant now = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Instant previous = lockedMember.getLastNudgedAt();
        if (previous != null && previous.plus(NUDGE_COOLDOWN).isAfter(now)) {
            Instant sentAt = previous;
            return new NudgeResult(false, type, sentAt, sentAt.plus(NUDGE_COOLDOWN));
        }
        notices.notify(lockedMember, PushDelivery.Kind.NUDGE, nudgeSourcePrefix(type) + now.toEpochMilli(),
                firstName(lockedMember) + " · " + nudgeTitle(type), body);
        lockedMember.setLastNudgedAt(now);
        return new NudgeResult(true, type, now, now.plus(NUDGE_COOLDOWN));
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

    /** Batch completion reads so an expired lock cannot resurrect a completed check-in. */
    private List<MissedEvent> incompleteItems(List<MissedEvent> events) {
        var mealIds = new HashSet<Long>();
        var taskIds = new HashSet<Long>();
        var taskDays = new HashSet<LocalDate>();
        var hydrationDays = new HashSet<LocalDate>();
        var hydrationMembers = new HashSet<Long>();
        for (var event : events) {
            String key = event.getSourceKey() == null ? "" : event.getSourceKey();
            if (key.matches("meal-\\d+")) mealIds.add(Long.parseLong(key.substring(5)));
            if (key.matches("habit-\\d+-\\d{4}-\\d{2}-\\d{2}")) {
                int end = key.indexOf('-', 6);
                taskIds.add(Long.parseLong(key.substring(6, end)));
                taskDays.add(LocalDate.parse(key.substring(end + 1)));
            }
            if ("Hydration".equalsIgnoreCase(event.getItemType())) {
                hydrationMembers.add(event.getUser().getId());
                hydrationDays.add(event.getMissedAt().atZone(applicationZoneId).toLocalDate());
            }
        }
        var remainingMeals = mealIds.isEmpty() ? Set.<Long>of() : new HashSet<>(meals.incompleteIds(mealIds));
        var existingTasks = taskIds.isEmpty() ? Set.<Long>of() : new HashSet<>(planItems.existingIds(taskIds));
        var completedTasks = new HashSet<String>();
        var memberIds = events.stream().map(event -> event.getUser().getId()).distinct().toList();
        for (var date : taskDays) for (var completion : completions.completedItemIds(memberIds, date))
            completedTasks.add(completion[0] + ":" + completion[1] + ":" + date);
        var waterGoals = new HashMap<Long, Integer>();
        if (!hydrationMembers.isEmpty()) profiles.findByUserIdIn(hydrationMembers).forEach(profile ->
                waterGoals.put(profile.getUser().getId(), profile.getWaterGoalMl() == null || profile.getWaterGoalMl() <= 0 ? 2000 : profile.getWaterGoalMl()));
        var totals = new HashMap<String, Long>();
        for (var date : hydrationDays) for (var total : water.totalsBetween(date.atStartOfDay(applicationZoneId).toInstant(),
                date.plusDays(1).atStartOfDay(applicationZoneId).toInstant()))
            totals.put(total[0] + ":" + date, ((Number) total[1]).longValue());
        return events.stream().filter(event -> {
            if (event.isResolved()) return false;
            String key = event.getSourceKey() == null ? "" : event.getSourceKey();
            if (key.matches("meal-\\d+")) return remainingMeals.contains(Long.parseLong(key.substring(5)));
            if (key.matches("habit-\\d+-\\d{4}-\\d{2}-\\d{2}")) {
                int end = key.indexOf('-', 6);
                Long id = Long.parseLong(key.substring(6, end));
                return existingTasks.contains(id) && !completedTasks.contains(event.getUser().getId() + ":" + id + ":" + key.substring(end + 1));
            }
            if ("Hydration".equalsIgnoreCase(event.getItemType())) {
                String day = event.getUser().getId() + ":" + event.getMissedAt().atZone(applicationZoneId).toLocalDate();
                return totals.getOrDefault(day, 0L) < Math.max(1, waterGoals.getOrDefault(event.getUser().getId(), 2000));
            }
            return true;
        }).toList();
    }

    private String nudgeAction(MissedEvent event) {
        if ("Hydration".equalsIgnoreCase(event.getItemType())) return nudgeMessage(MemberNudgeType.HYDRATION);
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
