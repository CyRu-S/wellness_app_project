package com.wellnessapp.dto.access;

import java.time.*;
import java.util.List;
import java.math.BigDecimal;

public record SharedMemberTodayResponse(
        Member member,
        LocalDate date,
        String timeZone,
        Summary summary,
        boolean nudgedToday,
        List<NudgeOption> nudges,
        List<MealEntry> meals,
        List<TaskEntry> tasks,
        List<WaterEntry> waterLogs,
        List<ActivityEntry> activities
) {
    public record Member(Long id, String name) {}

    public record Summary(
            int plannedMeals,
            int completedMeals,
            int mealPosts,
            int calories,
            int proteinGrams,
            int hydrationMl,
            int hydrationGoalMl,
            int activityMinutes,
            int activityGoalMinutes,
            int plannedTasks,
            int completedTasks,
            int completionPercentage
    ) {}

    public record Nutrition(BigDecimal calories, BigDecimal proteinGrams, BigDecimal carbsGrams, BigDecimal fatGrams) {}

    public record NudgeOption(
            MemberNudgeType type,
            String title,
            String detail,
            boolean needed,
            Instant lastSentAt,
            Instant availableAt
    ) {}

    public record MealEntry(
            Long plannedMealId,
            Long postId,
            String type,
            String name,
            LocalTime scheduledTime,
            Instant postedAt,
            boolean completed,
            String imageUrl,
            Nutrition nutrition
    ) {}

    public record WaterEntry(Long id, int amountMl, Instant loggedAt) {}
    public record TaskEntry(Long id, String type, String title, String detail, LocalTime scheduledTime,
                            boolean completed, Instant completedAt) {}
    public record ActivityEntry(Long id, String activity, int durationMinutes, Double distanceKm, Instant startedAt) {}
}
