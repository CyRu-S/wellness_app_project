package com.wellnessapp.service;

import com.wellnessapp.dto.leaderboard.LeaderboardResponse;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {
    private static final int DEFAULT_WATER_GOAL_ML = 2000;
    private static final int DAILY_ACTIVITY_TARGET_SECONDS = 30 * 60;

    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MealRepository meals;
    private final MealPostRepository posts;
    private final PlanRepository plans;
    private final PlanItemRepository planItems;
    private final PlanItemCompletionRepository completions;
    private final WaterLogRepository water;
    private final ActivitySessionRepository activities;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional(readOnly = true)
    public LeaderboardResponse get(String viewerEmail) {
        User viewer = users.findByEmailIgnoreCase(viewerEmail)
                .orElseThrow(() -> new NotFoundException("Account not found"));
        return new LeaderboardResponse(today(), clock.instant(), viewer.getId(), rows(viewer.getId()));
    }

    @Transactional(readOnly = true)
    public List<LeaderboardResponse.Row> rows(Long viewerId) {
        LocalDate day = today();
        Instant start = day.atStartOfDay(applicationZoneId).toInstant();
        Instant end = day.plusDays(1).atStartOfDay(applicationZoneId).toInstant();
        List<User> members = users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE);
        if (members.isEmpty()) return List.of();
        List<Long> memberIds = members.stream().map(User::getId).toList();

        Map<Long, UserProfile> profileByUser = profiles.findByUserIdIn(memberIds).stream()
                .collect(Collectors.toMap(profile -> profile.getUser().getId(), Function.identity()));
        Map<Long, List<Meal>> mealsByUser = meals.findByMealDateOrderByMealTime(day).stream()
                .collect(Collectors.groupingBy(meal -> meal.getUser().getId()));
        List<MealPost> dayPosts = posts.findByPostedAtGreaterThanEqualAndPostedAtLessThan(start, end);
        Map<Long, MealPost> postByMeal = dayPosts.stream()
                .filter(post -> post.getPlannedMeal() != null && post.getPlannedMeal().getMealDate().equals(day))
                .collect(Collectors.toMap(post -> post.getPlannedMeal().getId(), Function.identity(), (first, ignored) -> first));

        Map<Long, Plan> currentPlanByUser = new HashMap<>();
        for (Plan plan : plans.findByUserIdInAndActiveTrueOrderByStartDateDescIdDesc(memberIds)) {
            currentPlanByUser.putIfAbsent(plan.getUser().getId(), plan);
        }
        currentPlanByUser.entrySet().removeIf(entry -> day.isBefore(entry.getValue().getStartDate()) || day.isAfter(entry.getValue().getEndDate()));
        Map<Long, List<PlanItem>> tasksByUser = new HashMap<>();
        if (!currentPlanByUser.isEmpty()) {
            Map<Long, Long> userByPlan = currentPlanByUser.entrySet().stream()
                    .collect(Collectors.toMap(entry -> entry.getValue().getId(), Map.Entry::getKey));
            for (PlanItem item : planItems.findByPlanIdInOrderBySortOrder(userByPlan.keySet())) {
                if (item.getType() == PlanItem.Type.HEALTHY_HABIT || item.getType() == PlanItem.Type.ACTIVITY) {
                    tasksByUser.computeIfAbsent(userByPlan.get(item.getPlan().getId()), ignored -> new ArrayList<>()).add(item);
                }
            }
        }
        List<PlanItemCompletion> dayCompletions = completions.findByUserIdInAndCompletedDate(memberIds, day);
        Map<Long, Set<Long>> completedTaskIdsByUser = dayCompletions.stream()
                .collect(Collectors.groupingBy(value -> value.getUser().getId(),
                        Collectors.mapping(value -> value.getPlanItem().getId(), Collectors.toSet())));

        Map<Long, List<PlanItemCompletion>> completionsByUser = dayCompletions.stream()
                .collect(Collectors.groupingBy(value -> value.getUser().getId()));

        Map<Long, List<WaterLog>> waterByUser = water.findByLoggedAtGreaterThanEqualAndLoggedAtLessThan(start, end).stream()
                .collect(Collectors.groupingBy(log -> log.getUser().getId()));
        Map<Long, List<ActivitySession>> activitiesByUser = activities.findByStartedAtGreaterThanEqualAndStartedAtLessThan(start, end).stream()
                .collect(Collectors.groupingBy(session -> session.getUser().getId()));
        Map<Long, Integer> activitySecondsByUser = activitiesByUser.values().stream().flatMap(Collection::stream)
                .collect(Collectors.groupingBy(session -> session.getUser().getId(), Collectors.summingInt(ActivitySession::getDurationSeconds)));

        List<RankedRow> ranked = new ArrayList<>();
        for (User member : members) {
            List<Meal> memberMeals = mealsByUser.getOrDefault(member.getId(), List.of());
            List<PlanItem> memberTasks = tasksByUser.getOrDefault(member.getId(), List.of());
            Set<Long> completedTaskIds = completedTaskIdsByUser.getOrDefault(member.getId(), Set.of());
            int completedMeals = (int) memberMeals.stream()
                    .filter(meal -> meal.isConsumed() && postByMeal.containsKey(meal.getId())).count();
            int completedTasks = (int) memberTasks.stream().filter(task -> completedTaskIds.contains(task.getId())).count();
            List<WaterLog> memberWater = waterByUser.getOrDefault(member.getId(), List.of());
            int hydrationMl = memberWater.stream().mapToInt(WaterLog::getAmountMl).sum();
            UserProfile profile = profileByUser.get(member.getId());
            int hydrationGoal = profile == null || profile.getWaterGoalMl() == null || profile.getWaterGoalMl() <= 0
                    ? DEFAULT_WATER_GOAL_ML : profile.getWaterGoalMl();
            int activitySeconds = activitySecondsByUser.getOrDefault(member.getId(), 0);

            double expected = memberMeals.size() + memberTasks.size() + 2.0;
            double earned = completedMeals + completedTasks
                    + Math.min(1.0, hydrationMl * 1.0 / hydrationGoal)
                    + Math.min(1.0, activitySeconds * 1.0 / DAILY_ACTIVITY_TARGET_SECONDS);
            int completionScore = (int) Math.round(earned * 100.0 / expected);

            List<Long> timingDifferences = memberMeals.stream()
                    .filter(meal -> postByMeal.containsKey(meal.getId()))
                    .map(meal -> timingDifferenceMinutes(meal, postByMeal.get(meal.getId()))).toList();
            double averageTiming = timingDifferences.stream().mapToLong(Long::longValue).average().orElse(Double.POSITIVE_INFINITY);
            int timingScore = timingDifferences.isEmpty() ? 0
                    : (int) Math.round(Math.max(0, 100 - averageTiming * 100.0 / 120.0));
            int averageTimingMinutes = timingDifferences.isEmpty() ? -1 : (int) Math.round(averageTiming);
            int onTimePosts = (int) timingDifferences.stream().filter(minutes -> minutes <= 15).count();
            Instant percentageReachedAt = percentageReachedAt(start, memberMeals, postByMeal,
                    completionsByUser.getOrDefault(member.getId(), List.of()), memberWater, hydrationGoal,
                    activitiesByUser.getOrDefault(member.getId(), List.of()));

            ranked.add(new RankedRow(member, completionScore, completionScore, timingScore, completedMeals, memberMeals.size(),
                    timingDifferences.size(), onTimePosts, averageTiming, averageTimingMinutes, completedTasks,
                    memberTasks.size(), hydrationMl, hydrationGoal, activitySeconds / 60, percentageReachedAt));
        }
        ranked.sort(Comparator.comparingInt(RankedRow::score).reversed()
                .thenComparing(RankedRow::percentageReachedAt)
                .thenComparing(row -> row.member().getFullName(), String.CASE_INSENSITIVE_ORDER));

        List<LeaderboardResponse.Row> result = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index++) {
            RankedRow row = ranked.get(index);
            result.add(new LeaderboardResponse.Row(row.member().getId(), row.member().getFullName(),
                    AdminWorkspaceService.initials(row.member().getFullName()), photoUrl(profileByUser.get(row.member().getId())), index + 1, row.score(),
                    row.completionScore(), row.timingScore(), row.mealsCompleted(), row.mealsPlanned(),
                    row.postedMeals(), row.onTimePosts(), row.averageTimingMinutes(), row.tasksCompleted(),
                    row.tasksPlanned(), row.hydrationMl(), row.hydrationGoalMl(), row.activityMinutes(),
                    row.percentageReachedAt(), Objects.equals(viewerId, row.member().getId())));
        }
        return List.copyOf(result);
    }

    private String photoUrl(UserProfile profile) {
        return profile == null || profile.getPhotoMediaKey() == null ? null
                : "/api/leaderboard/members/" + profile.getUser().getId() + "/photo?v=" + profile.getPhotoMediaKey();
    }

    private long timingDifferenceMinutes(Meal meal, MealPost post) {
        Instant scheduledAt = ZonedDateTime.of(meal.getMealDate(), meal.getMealTime(), applicationZoneId).toInstant();
        return Math.abs(Duration.between(scheduledAt, post.getPostedAt()).toMinutes());
    }

    private Instant percentageReachedAt(Instant start, List<Meal> memberMeals, Map<Long, MealPost> postByMeal,
                                        List<PlanItemCompletion> taskCompletions, List<WaterLog> waterLogs,
                                        int hydrationGoal, List<ActivitySession> activitySessions) {
        List<Instant> milestones = new ArrayList<>();
        memberMeals.stream().map(Meal::getId).map(postByMeal::get).filter(Objects::nonNull)
                .map(MealPost::getPostedAt).forEach(milestones::add);
        taskCompletions.stream().map(PlanItemCompletion::getCompletedAt).filter(Objects::nonNull).forEach(milestones::add);
        thresholdTime(waterLogs.stream().sorted(Comparator.comparing(WaterLog::getLoggedAt)).toList(), hydrationGoal,
                WaterLog::getAmountMl, WaterLog::getLoggedAt).ifPresent(milestones::add);
        thresholdTime(activitySessions.stream().sorted(Comparator.comparing(ActivitySession::getStartedAt)).toList(),
                DAILY_ACTIVITY_TARGET_SECONDS, ActivitySession::getDurationSeconds, ActivitySession::getStartedAt)
                .ifPresent(milestones::add);
        return milestones.stream().max(Comparator.naturalOrder()).orElse(start);
    }

    private <T> Optional<Instant> thresholdTime(List<T> entries, int target,
                                                 java.util.function.ToIntFunction<T> amount,
                                                 Function<T, Instant> timestamp) {
        int total = 0;
        Instant last = null;
        for (T entry : entries) {
            total += amount.applyAsInt(entry);
            last = timestamp.apply(entry);
            if (total >= target) return Optional.ofNullable(last);
        }
        return Optional.ofNullable(last);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(applicationZoneId));
    }

    private record RankedRow(User member, int score, int completionScore, int timingScore,
            int mealsCompleted, int mealsPlanned, int postedMeals, int onTimePosts, double averageTiming,
            int averageTimingMinutes, int tasksCompleted, int tasksPlanned, int hydrationMl,
            int hydrationGoalMl, int activityMinutes, Instant percentageReachedAt) {}
}
