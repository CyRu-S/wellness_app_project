package com.wellnessapp.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.wellnessapp.dto.meal.MealAnalysisResponse;
import com.wellnessapp.dto.meal.MealAnalysisResponse.FoodItem;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;

final class FoodAnalysisNormalizer {
    private FoodAnalysisNormalizer() {}
    private static String text(JsonNode node, String field, int max) {
        var value = node.path(field);
        if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > max) throw new IllegalArgumentException(field);
        return value.asText().strip();
    }
    private static double number(JsonNode node, String field, double max) {
        var value = node.path(field);
        double result = value.asDouble(Double.NaN);
        if (!value.isNumber() || !Double.isFinite(result) || result < 0 || result > max) throw new IllegalArgumentException(field);
        return Math.round(result * 10) / 10.0;
    }
    private static double rounded(double value) { return Math.round(value * 10) / 10.0; }
    static MealAnalysisResponse normalize(JsonNode root) {
        return normalize(root, false);
    }
    static MealAnalysisResponse normalizeEstimatedPortions(JsonNode root) {
        return normalize(root, true);
    }
    private static MealAnalysisResponse normalize(JsonNode root, boolean estimatedPortions) {
        if (!root.path("foodDetected").isBoolean() || !root.path("items").isArray() || root.path("items").size() > 12)
            throw new IllegalArgumentException("Invalid recognition result");
        if (!root.path("foodDetected").asBoolean() || root.path("items").isEmpty())
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "No food could be identified. Take a clear food photo or enter meal details manually.");
        var distinct = new LinkedHashMap<String, FoodItem>();
        var ingredients = new LinkedHashSet<String>();
        for (var item : root.path("items")) {
            String name = text(item, "name", 100), portion = text(item, "standardPortion", 140);
            double grams = number(item, "portionGrams", estimatedPortions ? 2000 : 100);
            double protein = number(item, "protein", 100), carbs = number(item, "carbs", 100), fat = number(item, "fat", 100);
            if ((estimatedPortions ? grams < 1 : grams != 100 || !"100 g".equals(portion)) || !item.path("confidence").isIntegralNumber())
                throw new IllegalArgumentException("Expected nutrition per 100 g");
            int confidence = (int) number(item, "confidence", 100);
            if (protein + carbs + fat > 115) throw new IllegalArgumentException("Macros exceed reference weight");
            double calories = rounded(protein * 4 + carbs * 4 + fat * 9);
            if (calories > 1000) throw new IllegalArgumentException("Invalid energy per 100 g");
            if (item.has("nutritionAvailable") && !item.path("nutritionAvailable").isBoolean())
                throw new IllegalArgumentException("Invalid nutrition availability");
            boolean nutritionAvailable = calories > 0 && (!item.has("nutritionAvailable")
                || item.path("nutritionAvailable").asBoolean(false));
            var reference = LocalFoodNutritionReferences.find(name);
            if (reference.isPresent()) {
                var values = reference.get();
                calories = values.calories(); protein = values.protein(); carbs = values.carbs(); fat = values.fat();
                nutritionAvailable = true;
            }
            if (estimatedPortions && nutritionAvailable) {
                double scale = grams / 100;
                calories = rounded(calories * scale); protein = rounded(protein * scale);
                carbs = rounded(carbs * scale); fat = rounded(fat * scale);
            }
            if (!item.path("ingredients").isArray() || item.path("ingredients").size() > 6) throw new IllegalArgumentException("Ingredients");
            var visible = new ArrayList<String>();
            for (var ingredient : item.path("ingredients")) {
                if (!ingredient.isTextual() || ingredient.asText().isBlank() || ingredient.asText().length() > 80)
                    throw new IllegalArgumentException("Ingredient");
                visible.add(ingredient.asText().strip());
            }
            var food = new FoodItem(name, portion, grams, nutritionAvailable ? calories : null,
                nutritionAvailable ? protein : null, nutritionAvailable ? carbs : null, nutritionAvailable ? fat : null,
                confidence, List.copyOf(visible), nutritionAvailable,
                reference.isPresent() ? "reference" : nutritionAvailable ? "estimated" : "unavailable",
                reference.map(LocalFoodNutritionReferences.Reference::description).orElse(null));
            distinct.merge(name.toLowerCase(Locale.ROOT), food,
                (previous, next) -> !previous.nutritionAvailable() && next.nutritionAvailable() ? next : previous);
        }
        var items = List.copyOf(distinct.values());
        items.forEach(item -> ingredients.addAll(item.ingredients()));
        var available = items.stream().filter(FoodItem::nutritionAvailable).toList();
        double calories = rounded(available.stream().mapToDouble(FoodItem::calories).sum());
        double protein = rounded(available.stream().mapToDouble(FoodItem::protein).sum());
        double carbs = rounded(available.stream().mapToDouble(FoodItem::carbs).sum());
        double fat = rounded(available.stream().mapToDouble(FoodItem::fat).sum());
        if (calories > 10000 || protein > 1000 || carbs > 2000 || fat > 1000) throw new IllegalArgumentException("Meal too large");
        int confidence = items.stream().mapToInt(FoodItem::confidence).min().orElse(0);
        String warning = estimatedPortions
            ? "Estimated portions and nutrition; recipes and cooking oil vary."
            : "Approximate nutrition per 100 g. Enter the eaten weight of each food in grams. Recipes and cooking oil vary; review before saving.";
        if (confidence > 0 && confidence < 60) warning = "Some foods are uncertain. Confirm the dish names or retake the photo. " + warning;
        boolean completeNutrition = available.size() == items.size();
        if (!completeNutrition) warning = "Nutrition is unavailable for some detected foods. Enter their "
            + (estimatedPortions ? "serving values" : "per-100-g values") + " or remove them. " + warning;
        String name = String.join(", ", items.stream().map(FoodItem::name).toList());
        if (name.length() > 160) name = name.substring(0, 157) + "...";
        return new MealAnalysisResponse(name, completeNutrition ? calories : null, completeNutrition ? protein : null,
            completeNutrition ? carbs : null, completeNutrition ? fat : null, confidence, List.copyOf(ingredients), items,
            estimatedPortions ? "ESTIMATED_PORTION" : "PER_100_G", warning);
    }
}
