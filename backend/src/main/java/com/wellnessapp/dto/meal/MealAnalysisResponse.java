package com.wellnessapp.dto.meal;

import java.util.List;

public record MealAnalysisResponse(
        String name,
        Double calories,
        Double protein,
        Double carbs,
        Double fat,
        int confidence,
        List<String> ingredients,
        List<FoodItem> items,
        String portionBasis,
        String warning
) {
    public record FoodItem(String name, String standardPortion, double portionGrams,
            Double calories, Double protein, Double carbs, Double fat, int confidence, List<String> ingredients,
            boolean nutritionAvailable, String nutritionSource, String nutritionReference) {}
}
