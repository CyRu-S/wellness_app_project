package com.wellnessapp.dto.meal;

import java.util.List;

public record MealAnalysisResponse(
        String name,
        double calories,
        double protein,
        double carbs,
        double fat,
        int confidence,
        List<String> ingredients,
        List<FoodItem> items,
        String portionBasis,
        String warning
) {
    public record FoodItem(String name, String standardPortion, double portionGrams,
            double calories, double protein, double carbs, double fat, int confidence, List<String> ingredients) {}
}
