package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.exception.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service @RequiredArgsConstructor
public class AdminWorkspaceService {
    private final WorkflowNotificationService notices;
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MealRepository meals;
    private final MealPostRepository posts;
    private final PlanService plans;
    private final WaterLogRepository water;
    private final Clock clock;
    private final ZoneId applicationZoneId;
    private final ReminderService reminders;
    private final ProductRepository products;
    private final LeaderboardService leaderboards;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> members() {
        var active = users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE);
        return memberRows(active, plans.memberPlans(active.stream().map(User::getId).toList()));
    }

    private List<Map<String, Object>> memberRows(List<User> active, Map<Long, Map<String, Object>> memberPlans) {
        if (active.isEmpty()) return List.of();
        var date = LocalDate.now(clock.withZone(applicationZoneId));
        var start = date.atStartOfDay(applicationZoneId).toInstant();
        var end = date.plusDays(1).atStartOfDay(applicationZoneId).toInstant();
        var profileByUser = profiles.findByUserIdIn(active.stream().map(User::getId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(p -> p.getUser().getId(), p -> p));
        var historyByUser = meals.findByMealDateBetween(date.minusDays(6), date).stream()
                .collect(java.util.stream.Collectors.groupingBy(m -> m.getUser().getId()));
        var attentionByUser = reminders.attention().stream()
                .collect(java.util.stream.Collectors.groupingBy(a -> (Long) a.get("memberId")));
        Map<Long, Integer> hydrationByUser = new HashMap<>();
        for (var total : water.totalsBetween(start, end)) hydrationByUser.put((Long) total[0], ((Number) total[1]).intValue());
        Map<Long, Long> postsByUser = new HashMap<>();
        for (var total : posts.countsBetween(start, end)) postsByUser.put((Long) total[0], ((Number) total[1]).longValue());
        Map<Long, Set<LocalDate>> datesByUser = new HashMap<>();
        for (var pair : meals.allConsumedDates()) datesByUser.computeIfAbsent((Long) pair[0], key -> new HashSet<>()).add((LocalDate) pair[1]);
        return active.stream().map(user -> {
            var profile = profileByUser.get(user.getId());
            var plan = memberPlans.get(user.getId());
            var memberHistory = historyByUser.getOrDefault(user.getId(), List.of());
            var alerts = attentionByUser.getOrDefault(user.getId(), List.of());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", user.getId()); row.put("name", user.getFullName()); row.put("email", user.getEmail());
            row.put("status", user.getStatus()); row.put("initials", initials(user.getFullName()));
            row.put("goal", profile == null ? null : profile.getGoal());
            row.put("age", profile == null ? null : profile.getAge());
            row.put("profileImageUrl", profile == null || profile.getPhotoMediaKey() == null ? null
                    : "/api/admin/users/" + user.getId() + "/profile-photo?v=" + profile.getPhotoMediaKey());
            row.put("plan", ((String) plan.get("planName")).isBlank() ? "No plan assigned" : plan.get("planName"));
            row.put("adherence", memberHistory.isEmpty() ? 0 : memberHistory.stream().filter(Meal::isConsumed).count() * 100 / memberHistory.size());
            row.put("meals", postsByUser.getOrDefault(user.getId(), 0L));
            int goal = profile == null || profile.getWaterGoalMl() == null || profile.getWaterGoalMl() <= 0 ? 2000 : profile.getWaterGoalMl();
            row.put("hydration", Math.min(100, hydrationByUser.getOrDefault(user.getId(), 0) * 100 / goal));
            row.put("streak", streak(datesByUser.getOrDefault(user.getId(), Set.of()))); presence(row, user);
            row.put("attentionLevel", alerts.isEmpty() ? "NONE" : "NEEDS_ATTENTION");
            row.put("attentionReason", alerts.isEmpty() ? "" : alerts.getFirst().get("title"));
            List<Map<String, Object>> series = new ArrayList<>();
            if (!memberHistory.isEmpty()) for (int i = 6; i >= 0; i--) {
                var day = date.minusDays(i);
                var dayMeals = memberHistory.stream().filter(meal -> meal.getMealDate().equals(day)).toList();
                series.add(Map.of("label", day.format(DateTimeFormatter.ofPattern("d MMM")), "value",
                        dayMeals.isEmpty() ? 0 : dayMeals.stream().filter(Meal::isConsumed).count() * 100 / dayMeals.size()));
            }
            row.put("adherenceSeries", series);
            return row;
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingApprovals() {
        var pending = users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.PENDING);
        var profileByUser = pending.isEmpty() ? Map.<Long, UserProfile>of() : profiles.findByUserIdIn(pending.stream().map(User::getId).toList())
                .stream().collect(java.util.stream.Collectors.toMap(p -> p.getUser().getId(), p -> p));
        return pending.stream().filter(user -> user.getEmailVerifiedAt() != null).map(user -> {
                    var profile = profileByUser.get(user.getId());
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", user.getId()); row.put("name", user.getFullName()); row.put("email", user.getEmail());
                    row.put("status", user.getStatus()); row.put("initials", initials(user.getFullName()));
                    row.put("goal", profile == null ? null : profile.getGoal());
                    row.put("age", profile == null ? null : profile.getAge());
                    row.put("profileImageUrl", profile == null || profile.getPhotoMediaKey() == null ? null
                            : "/api/admin/users/" + user.getId() + "/profile-photo?v=" + profile.getPhotoMediaKey());
                    row.put("requestedAt", user.getCreatedAt().atZone(applicationZoneId)
                            .format(DateTimeFormatter.ofPattern("d MMM, h:mm a")));
                    row.put("recommendedPlan", "Not assigned");
                    return row;
                }).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> workspace() {
        var active = users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE);
        var memberPlans = plans.memberPlans(active.stream().map(User::getId).toList());
        var members = memberRows(active, memberPlans);
        var approvals = pendingApprovals();
        var attention = reminders.attention();
        LocalDate date = LocalDate.now(clock.withZone(applicationZoneId));
        var recent = posts.findByPostedAtGreaterThanEqual(date.minusDays(59).atStartOfDay(applicationZoneId).toInstant());
        var todayPosts = recent.stream().filter(p -> p.getPostedAt().atZone(applicationZoneId).toLocalDate().equals(date)).toList();
        var yesterdayPosts = recent.stream().filter(p -> p.getPostedAt().atZone(applicationZoneId).toLocalDate().equals(date.minusDays(1))).toList();
        var todayMeals = meals.findByMealDateOrderByMealTime(date);
        var history = meals.findByMealDateBetween(date.minusDays(59), date);
        long todayLogged = loggedCount(todayMeals, todayPosts);
        var yesterdayMeals = history.stream().filter(m -> m.getMealDate().equals(date.minusDays(1))).toList();
        int rate = todayMeals.isEmpty() ? 0 : (int) (todayMeals.stream().filter(Meal::isConsumed).count() * 100 / todayMeals.size());
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("pendingApprovals", approvals.size()); summary.put("totalMembers", members.size());
        summary.put("activeUsers", active.stream().filter(u -> u.getLastSeenAt() != null && u.getLastSeenAt().isAfter(clock.instant().minusSeconds(120))).count());
        summary.put("mealLogsToday", todayLogged);
        summary.put("membersWithMealLogsToday", loggedMemberIds(todayMeals, todayPosts).size());
        summary.put("mealComparison", comparison(todayLogged, loggedCount(yesterdayMeals, yesterdayPosts))); summary.put("missedItems", attention.size());
        summary.put("averageAdherence", rate); summary.put("onTrackPercentage", rate);
        summary.put("activePlans", memberPlans.values().stream().filter(p -> !((Map<?, ?>) p).get("planName").equals("")).count()); summary.put("products", products.countByActiveTrue());
        Map<String, Object> ranges = new LinkedHashMap<>();
        for (int days : new int[]{1, 7, 30}) {
            var selected = recent.stream().filter(p -> !p.getPostedAt().atZone(applicationZoneId).toLocalDate().isBefore(date.minusDays(days - 1))).toList();
            var rangeMeals = history.stream().filter(m -> !m.getMealDate().isBefore(date.minusDays(days - 1))).toList();
            long logged = loggedCount(rangeMeals, selected);
            var previousMeals = history.stream().filter(m -> m.getMealDate().isBefore(date.minusDays(days - 1)) && !m.getMealDate().isBefore(date.minusDays(days * 2 - 1))).toList();
            var previousPosts = recent.stream().filter(p -> {
                var postedDate = p.getPostedAt().atZone(applicationZoneId).toLocalDate();
                return postedDate.isBefore(date.minusDays(days - 1)) && !postedDate.isBefore(date.minusDays(days * 2 - 1));
            }).toList();
            long previousLogged = loggedCount(previousMeals, previousPosts);
            int rangeRate = rangeMeals.isEmpty() ? 0 : (int) (rangeMeals.stream().filter(Meal::isConsumed).count() * 100 / rangeMeals.size());
            List<Map<String, Object>> series = new ArrayList<>();
            if (logged > 0) {
                int buckets = days == 1 ? 8 : days;
                for (int i = 0; i < buckets; i++) {
                    final int bucket = i;
                    Set<Long> memberIds = new HashSet<>();
                    if (days == 1) {
                        int cutoffHour = (bucket + 1) * 3;
                        todayMeals.stream().filter(Meal::isConsumed).filter(m -> m.getMealTime().getHour() < cutoffHour).map(m -> m.getUser().getId()).forEach(memberIds::add);
                        selected.stream().filter(p -> p.getPlannedMeal() == null && p.getPostedAt().atZone(applicationZoneId).getHour() < cutoffHour).map(p -> p.getUser().getId()).forEach(memberIds::add);
                    } else {
                        var bucketDate = date.minusDays(days - 1 - bucket);
                        rangeMeals.stream().filter(Meal::isConsumed).filter(m -> m.getMealDate().equals(bucketDate)).map(m -> m.getUser().getId()).forEach(memberIds::add);
                        selected.stream().filter(p -> p.getPlannedMeal() == null && p.getPostedAt().atZone(applicationZoneId).toLocalDate().equals(bucketDate)).map(p -> p.getUser().getId()).forEach(memberIds::add);
                    }
                    long count = memberIds.size();
                    series.add(Map.of("label", days == 1 ? String.format("%02d:00", i * 3) : date.minusDays(days - 1 - i).format(DateTimeFormatter.ofPattern("d MMM")),
                            "value", members.isEmpty() ? 0 : count * 100.0 / members.size()));
                }
            }
            ranges.put(days == 1 ? "TODAY" : days + "D", Map.of("label", days == 1 ? "Today" : days + " Days", "totalLogs", logged, "completionRate", rangeRate, "comparison", comparison(logged, previousLogged), "series", series));
        }
        var mealTypes = todayMeals.stream().map(Meal::getType).distinct().map(type -> {
            long logged = todayPosts.stream().filter(p -> p.getMealType().equals(type)).map(p -> p.getUser().getId()).distinct().count();
            return Map.of("id", type.toLowerCase(Locale.ROOT), "label", type, "logged", logged, "completion", members.isEmpty() ? 0 : logged * 100 / members.size());
        }).toList();
        var missing = attention.stream().map(a -> Map.of("memberId", a.get("memberId"), "name", a.get("memberName"), "initials", a.get("initials"), "detail", a.get("title"), "severity", a.get("severity"))).toList();
        return Map.of("summary", summary, "members", members, "approvals", approvals, "attention", attention, "memberMealPlans", memberPlans,
                "leaderboard", leaderboards.rows(null),
                "mealInsights", Map.of("selectedRange", "TODAY", "ranges", ranges, "mealTypes", mealTypes, "missingMembers", missing));
    }

    private long loggedCount(List<Meal> plannedMeals, List<com.wellnessapp.entity.MealPost> mealPosts) {
        return plannedMeals.stream().filter(Meal::isConsumed).count()
                + mealPosts.stream().filter(post -> post.getPlannedMeal() == null).count();
    }

    private Set<Long> loggedMemberIds(List<Meal> plannedMeals, List<com.wellnessapp.entity.MealPost> mealPosts) {
        Set<Long> ids = plannedMeals.stream().filter(Meal::isConsumed).map(meal -> meal.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());
        mealPosts.stream().filter(post -> post.getPlannedMeal() == null).map(post -> post.getUser().getId()).forEach(ids::add);
        return ids;
    }

    private List<Map<String, Object>> leaderboard(List<User> active, LocalDate day, List<MealPost> recentPosts) {
        if (active.isEmpty()) return List.of();
        var dayMeals = meals.findByMealDateOrderByMealTime(day).stream()
                .collect(java.util.stream.Collectors.groupingBy(m -> m.getUser().getId()));
        var postByMeal = recentPosts.stream()
                .filter(post -> post.getPlannedMeal() != null && post.getPlannedMeal().getMealDate().equals(day))
                .collect(java.util.stream.Collectors.toMap(post -> post.getPlannedMeal().getId(), post -> post));
        var profileByUser = profiles.findByUserIdIn(active.stream().map(User::getId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(p -> p.getUser().getId(), p -> p));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (var user : active) {
            var memberMeals = dayMeals.getOrDefault(user.getId(), List.of());
            long completed = memberMeals.stream().filter(meal -> meal.isConsumed() || postByMeal.containsKey(meal.getId())).count();
            var linkedPosts = memberMeals.stream().map(meal -> postByMeal.get(meal.getId())).filter(Objects::nonNull).toList();
            int adherenceScore = memberMeals.isEmpty() ? 0 : (int) Math.round(completed * 100.0 / memberMeals.size());
            int timingScore = memberMeals.isEmpty() ? 0 : (int) Math.round(memberMeals.stream()
                    .mapToInt(meal -> punctualityScore(meal, postByMeal.get(meal.getId()))).sum() * 1.0 / memberMeals.size());
            int score = (int) Math.round((adherenceScore + timingScore) / 2.0);
            int averageTimingMinutes = linkedPosts.isEmpty() ? -1 : (int) Math.round(memberMeals.stream()
                    .filter(meal -> postByMeal.containsKey(meal.getId()))
                    .mapToLong(meal -> timingDifferenceMinutes(meal, postByMeal.get(meal.getId())))
                    .average().orElse(0));
            long onTimePosts = memberMeals.stream().filter(meal -> postByMeal.containsKey(meal.getId()))
                    .filter(meal -> timingDifferenceMinutes(meal, postByMeal.get(meal.getId())) <= 15).count();
            var profile = profileByUser.get(user.getId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("memberId", user.getId()); row.put("name", user.getFullName());
            row.put("initials", initials(user.getFullName()));
            row.put("score", score); row.put("adherenceScore", adherenceScore); row.put("timingScore", timingScore);
            row.put("mealsCompleted", completed); row.put("mealsPlanned", memberMeals.size());
            row.put("postedMeals", linkedPosts.size()); row.put("onTimePosts", onTimePosts);
            row.put("averageTimingMinutes", averageTimingMinutes);
            row.put("profileImageUrl", profile == null || profile.getPhotoMediaKey() == null ? null
                    : "/api/admin/users/" + user.getId() + "/profile-photo?v=" + profile.getPhotoMediaKey());
            rows.add(row);
        }
        rows.sort(Comparator.<Map<String, Object>, Integer>comparing(row -> ((Number) row.get("score")).intValue()).reversed()
                .thenComparingInt(row -> {
                    int average = ((Number) row.get("averageTimingMinutes")).intValue();
                    return average < 0 ? Integer.MAX_VALUE : average;
                })
                .thenComparing(row -> (String) row.get("name")));
        for (int i = 0; i < rows.size(); i++) rows.get(i).put("rank", i + 1);
        return List.copyOf(rows);
    }

    private int punctualityScore(Meal meal, MealPost post) {
        if (post == null) return 0;
        long difference = timingDifferenceMinutes(meal, post);
        if (difference <= 15) return 100;
        if (difference >= 120) return 0;
        return (int) Math.round((120 - difference) * 100.0 / 105);
    }

    private long timingDifferenceMinutes(Meal meal, MealPost post) {
        Instant scheduledAt = ZonedDateTime.of(meal.getMealDate(), meal.getMealTime(), applicationZoneId).toInstant();
        return Math.abs(Duration.between(scheduledAt, post.getPostedAt()).toMinutes());
    }

    @Transactional public void decide(Long id, String decision, Integer followUpDays) {
        var user = users.lockById(id).filter(u -> u.getRole() == User.Role.USER).orElseThrow(() -> new NotFoundException("Member not found"));
        if (user.getStatus() != User.Status.PENDING) throw new ConflictException("This request has already been reviewed");
        if (user.getEmailVerifiedAt() == null) throw new ConflictException("The member must verify their email before approval");
        user.setStatus(switch (decision) { case "APPROVE" -> User.Status.ACTIVE; case "DECLINE" -> User.Status.SUSPENDED; default -> throw new BadRequestException("Invalid decision"); });
        user.setFollowUpAt(user.getStatus() == User.Status.ACTIVE && followUpDays != null
                ? clock.instant().plus(Duration.ofDays(followUpDays)) : null);
        users.save(user);
        if (user.getStatus() == User.Status.ACTIVE) notices.notify(user, PushDelivery.Kind.APPROVAL, "approval-" + user.getId(),
                "Your membership is approved", "Your admin approved your registration. You can now use your member account.");
    }
    public void decide(Long id, String decision) { decide(id, decision, null); }
    private void presence(Map<String, Object> row, User user) {
        boolean online = user.getLastSeenAt() != null && user.getLastSeenAt().isAfter(clock.instant().minusSeconds(120));
        row.put("online", online);
        row.put("lastSeenAt", user.getLastSeenAt());
        row.put("lastActiveAt", user.getLastSeenAt() == null ? "No activity yet" : online ? "Active now" :
                user.getLastSeenAt().atZone(applicationZoneId).format(DateTimeFormatter.ofPattern("d MMM, h:mm a")));
    }
    private int comparison(long current, long previous) { return previous == 0 ? 0 : (int) Math.round((current - previous) * 100.0 / previous); }
    private int streak(Set<LocalDate> dates) {
        var day = LocalDate.now(clock.withZone(applicationZoneId)); if (!dates.contains(day)) day = day.minusDays(1);
        int count = 0; while (dates.contains(day)) { count++; day = day.minusDays(1); } return count;
    }
    static String initials(String name) { return Arrays.stream(name.split("\\s+")).filter(p -> !p.isEmpty()).limit(2).map(p -> p.substring(0, 1)).reduce("", String::concat).toUpperCase(Locale.ROOT); }
}
