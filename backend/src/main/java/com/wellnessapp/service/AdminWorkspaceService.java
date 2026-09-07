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
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MealRepository meals;
    private final MealPostRepository posts;
    private final PlanService plans;
    private final MemberAccessService access;
    private final Clock clock;
    private final ZoneId applicationZoneId;
    private final ReminderService reminders;
    private final ProductRepository products;

    @Transactional
    public Map<String, Object> workspace() {
        var all = users.findAll().stream().filter(u -> u.getRole() == User.Role.USER).sorted(Comparator.comparing(User::getId)).toList();
        var active = all.stream().filter(u -> u.getStatus() == User.Status.ACTIVE).toList();
        List<Map<String, Object>> members = new ArrayList<>();
        List<Map<String, Object>> approvals = new ArrayList<>();
        Map<Long, Object> memberPlans = new LinkedHashMap<>();
        for (User user : all) {
            var profile = profiles.findByUserId(user.getId()).orElse(null);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", user.getId()); row.put("name", user.getFullName()); row.put("email", user.getEmail());
            row.put("status", user.getStatus()); row.put("initials", initials(user.getFullName()));
            row.put("goal", profile == null ? null : profile.getGoal()); row.put("age", profile == null ? null : profile.getAge());
            row.put("profileImageUrl", profile == null || profile.getPhotoMediaKey() == null ? null : "/api/admin/users/" + user.getId() + "/profile-photo?v=" + profile.getPhotoMediaKey());
            if (user.getStatus() == User.Status.PENDING) {
                row.put("requestedAt", user.getCreatedAt().atZone(applicationZoneId).format(DateTimeFormatter.ofPattern("d MMM, h:mm a")));
                row.put("recommendedPlan", "Not assigned"); approvals.add(row); continue;
            }
            if (user.getStatus() != User.Status.ACTIVE) continue;
            var today = access.adminMemberToday(user.getId());
            var s = today.summary();
            var plan = plans.memberPlan(user.getId()); memberPlans.put(user.getId(), plan);
            row.put("plan", ((String) plan.get("planName")).isBlank() ? "No plan assigned" : plan.get("planName"));
            row.put("adherence", s.plannedMeals() == 0 ? 0 : Math.min(100, s.completedMeals() * 100 / s.plannedMeals()));
            row.put("meals", s.mealPosts()); row.put("hydration", Math.min(100, s.hydrationMl() * 100 / (profile == null ? 2000 : profile.getWaterGoalMl())));
            row.put("streak", streak(user.getId())); row.put("lastActiveAt", user.getLastSeenAt() == null ? "No activity yet" :
                    user.getLastSeenAt().isAfter(clock.instant().minusSeconds(120)) ? "Active now" : user.getLastSeenAt().atZone(applicationZoneId).format(DateTimeFormatter.ofPattern("d MMM, h:mm a")));
            row.put("attentionLevel", "NONE"); row.put("attentionReason", ""); members.add(row);
        }
        reminders.refresh();
        var attention = reminders.attention();
        for (var row : members) {
            var alerts = attention.stream().filter(a -> a.get("memberId").equals(row.get("id"))).toList();
            if (!alerts.isEmpty()) { row.put("attentionLevel", "NEEDS_ATTENTION"); row.put("attentionReason", alerts.getFirst().get("title")); }
        }
        LocalDate date = LocalDate.now(clock.withZone(applicationZoneId));
        var recent = posts.findByPostedAtGreaterThanEqual(date.minusDays(29).atStartOfDay(applicationZoneId).toInstant());
        var todayPosts = recent.stream().filter(p -> p.getPostedAt().atZone(applicationZoneId).toLocalDate().equals(date)).toList();
        var todayMeals = meals.findByMealDateOrderByMealTime(date);
        var history = meals.findByMealDateBetween(date.minusDays(59), date);
        for (var row : members) {
            var memberHistory = history.stream().filter(m -> m.getUser().getId().equals(row.get("id")) && !m.getMealDate().isBefore(date.minusDays(6))).toList();
            List<Map<String, Object>> adherence = new ArrayList<>();
            if (!memberHistory.isEmpty()) {
                for (int i = 6; i >= 0; i--) {
                    LocalDate day = date.minusDays(i);
                    var dayMeals = memberHistory.stream().filter(m -> m.getMealDate().equals(day)).toList();
                    adherence.add(Map.of("label", day.format(DateTimeFormatter.ofPattern("d MMM")), "value",
                            dayMeals.isEmpty() ? 0 : dayMeals.stream().filter(Meal::isConsumed).count() * 100 / dayMeals.size()));
                }
            }
            row.put("adherenceSeries", adherence);
            row.put("adherence", memberHistory.isEmpty() ? 0 : memberHistory.stream().filter(Meal::isConsumed).count() * 100 / memberHistory.size());
        }
        int rate = todayMeals.isEmpty() ? 0 : (int) (todayMeals.stream().filter(Meal::isConsumed).count() * 100 / todayMeals.size());
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("pendingApprovals", approvals.size()); summary.put("totalMembers", members.size());
        summary.put("activeUsers", active.stream().filter(u -> u.getLastSeenAt() != null && u.getLastSeenAt().isAfter(clock.instant().minusSeconds(120))).count());
        summary.put("mealLogsToday", todayPosts.size()); summary.put("mealComparison", comparison(todayPosts.size(), history.stream().filter(m -> m.isConsumed() && m.getMealDate().equals(date.minusDays(1))).count())); summary.put("missedItems", attention.size());
        summary.put("averageAdherence", rate); summary.put("onTrackPercentage", rate);
        summary.put("activePlans", memberPlans.values().stream().filter(p -> !((Map<?, ?>) p).get("planName").equals("")).count()); summary.put("products", products.countByActiveTrue());
        Map<String, Object> ranges = new LinkedHashMap<>();
        for (int days : new int[]{1, 7, 30}) {
            var selected = recent.stream().filter(p -> !p.getPostedAt().atZone(applicationZoneId).toLocalDate().isBefore(date.minusDays(days - 1))).toList();
            var rangeMeals = history.stream().filter(m -> !m.getMealDate().isBefore(date.minusDays(days - 1))).toList();
            long logged = rangeMeals.stream().filter(Meal::isConsumed).count();
            long previousLogged = history.stream().filter(m -> m.isConsumed() && m.getMealDate().isBefore(date.minusDays(days - 1)) && !m.getMealDate().isBefore(date.minusDays(days * 2 - 1))).count();
            int rangeRate = rangeMeals.isEmpty() ? 0 : (int) (logged * 100 / rangeMeals.size());
            List<Map<String, Object>> series = new ArrayList<>();
            if (logged > 0) {
                int buckets = days == 1 ? 8 : days;
                for (int i = 0; i < buckets; i++) {
                    final int bucket = i;
                    long count = days == 1
                            ? selected.stream().filter(p -> p.getPostedAt().atZone(applicationZoneId).getHour() / 3 == bucket).map(p -> p.getUser().getId()).distinct().count()
                            : rangeMeals.stream().filter(m -> m.isConsumed() && m.getMealDate().equals(date.minusDays(days - 1 - bucket))).map(m -> m.getUser().getId()).distinct().count();
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
                "mealInsights", Map.of("selectedRange", "TODAY", "ranges", ranges, "mealTypes", mealTypes, "missingMembers", missing));
    }

    @Transactional public void decide(Long id, String decision) {
        var user = users.lockById(id).filter(u -> u.getRole() == User.Role.USER).orElseThrow(() -> new NotFoundException("Member not found"));
        if (user.getStatus() != User.Status.PENDING) throw new ConflictException("This request has already been reviewed");
        user.setStatus(switch (decision) { case "APPROVE" -> User.Status.ACTIVE; case "DECLINE" -> User.Status.SUSPENDED; default -> throw new BadRequestException("Invalid decision"); });
        users.save(user);
    }
    private int comparison(long current, long previous) { return previous == 0 ? 0 : (int) Math.round((current - previous) * 100.0 / previous); }
    private int streak(Long id) {
        var dates = new HashSet<>(meals.consumedDates(id));
        var day = LocalDate.now(clock.withZone(applicationZoneId)); if (!dates.contains(day)) day = day.minusDays(1);
        int count = 0; while (dates.contains(day)) { count++; day = day.minusDays(1); } return count;
    }
    static String initials(String name) { return Arrays.stream(name.split("\\s+")).filter(p -> !p.isEmpty()).limit(2).map(p -> p.substring(0, 1)).reduce("", String::concat).toUpperCase(Locale.ROOT); }
}
