package com.wellnessapp.dto.access;

import java.time.*;
import java.util.List;

public record SharedMemberTodayResponse(
        Member member,
        LocalDate date,
        String timeZone,
        Summary summary,
        List<MealEntry> meals,
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
            int activityMinutes
    ) {}

    public record Nutrition(int calories, int proteinGrams, int carbsGrams, int fatGrams) {}

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
    public record ActivityEntry(Long id, String activity, int durationMinutes, Double distanceKm, Instant startedAt) {}
}
