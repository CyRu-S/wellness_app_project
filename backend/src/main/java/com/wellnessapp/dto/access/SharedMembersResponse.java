package com.wellnessapp.dto.access;

import java.util.List;

public record SharedMembersResponse(int total, List<SharedMemberSummary> members) {
    public record SharedMemberSummary(
            Long id,
            String name,
            int plannedMeals,
            int completedMeals,
            int mealPosts,
            int calories,
            int proteinGrams,
            int hydrationMl,
            int activityMinutes
    ) {}
}
