package com.wellnessapp.dto.access;

import java.util.List;
import java.math.BigDecimal;

public record SharedMembersResponse(int total, boolean canAssignPlans, List<SharedMemberSummary> members) {
    public record SharedMemberSummary(
            Long id,
            String name,
            int plannedMeals,
            int completedMeals,
            int mealPosts,
            BigDecimal calories,
            int proteinGrams,
            int hydrationMl,
            int hydrationGoalMl,
            int activityMinutes,
            int activityGoalMinutes,
            int plannedTasks,
            int completedTasks,
            int completionPercentage,
            boolean nudgedToday
    ) {}
}
