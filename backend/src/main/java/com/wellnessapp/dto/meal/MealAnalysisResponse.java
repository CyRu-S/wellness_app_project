package com.wellnessapp.dto.meal;

import java.util.List;

public record MealAnalysisResponse(
        String name,
        int calories,
        int protein,
        int carbs,
        int fat,
        int confidence,
        List<String> ingredients
) {}
