package com.wellnessapp.dto.dashboard;
public record DashboardResponse(String name, int completion, int calories, int protein, int activeMinutes, int activeCalories,
        int waterGlasses, int waterTarget, int waterGoalMl, int streak, String focus, Object lastActivity, Object lastMeal) {}

