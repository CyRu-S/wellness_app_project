package com.wellnessapp.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class FoodAnalysisNormalizerTests {
    final ObjectMapper mapper = new ObjectMapper();
    private Map<String, Object> food(String name, double calories, double protein, double carbs, double fat) {
        return Map.of("name", name, "standardPortion", "100 g", "portionGrams", 100, "calories", calories,
            "protein", protein, "carbs", carbs, "fat", fat, "confidence", 85, "ingredients", List.of());
    }
    @Test void ladduGetsAnExplicitBesanReferenceWhenTheModelReturnsZeroOrImplausiblyLowValues() throws Exception {
        for (String name : List.of("Laddu", "Ladoo", "Laddoo", "Besan laddu", "Besan Ladoo", "बेसन लड्डू")) {
            for (double carbs : List.of(0.0, 10.0)) {
                var result = FoodAnalysisNormalizer.normalize(mapper.valueToTree(Map.of("foodDetected", true,
                    "items", List.of(food(name, 0, 0, carbs, 0)))));
                var item = result.items().getFirst();
                assertEquals(name, item.name()); assertEquals(506, item.calories());
                assertEquals(8.4, item.protein()); assertEquals(63.42, item.carbs()); assertEquals(24.32, item.fat());
                assertEquals(100, item.portionGrams()); assertTrue(item.nutritionAvailable());
                assertEquals("reference", item.nutritionSource()); assertTrue(item.nutritionReference().contains("Besan"));
                assertEquals(506, result.calories());
            }
        }
    }
    @Test void otherLadduRecipesAndMixedNamesDoNotInheritBesanNutrition() {
        for (String name : List.of("Coconut laddu", "Ragi ladoo", "Motichoor laddu", "Roti, Laddu")) {
            var result = FoodAnalysisNormalizer.normalize(mapper.valueToTree(Map.of("foodDetected", true,
                "items", List.of(food(name, 0, 0, 0, 0)))));
            var item = result.items().getFirst();
            assertEquals(name, item.name()); assertFalse(item.nutritionAvailable());
            assertEquals("unavailable", item.nutritionSource()); assertNull(item.calories()); assertNull(result.calories());
        }
    }
    @Test void explicitUnknownNutritionDoesNotProducePartialMealTotals() {
        var unknown = new HashMap<String, Object>(food("Unidentified curry", 160, 9, 20, 5));
        unknown.put("nutritionAvailable", false);
        var result = FoodAnalysisNormalizer.normalize(mapper.valueToTree(Map.of("foodDetected", true,
            "items", List.of(food("Dal", 160, 9, 20, 5), unknown))));
        assertEquals(2, result.items().size()); assertTrue(result.items().getFirst().nutritionAvailable());
        assertFalse(result.items().get(1).nutritionAvailable()); assertNull(result.items().get(1).fat());
        assertNull(result.calories()); assertNull(result.protein()); assertNull(result.carbs()); assertNull(result.fat());
    }
    @Test void availableNutritionWinsWhenADishWasAlsoReturnedAsUnknown() {
        var result = FoodAnalysisNormalizer.normalize(mapper.valueToTree(Map.of("foodDetected", true,
            "items", List.of(food("Dal", 0, 0, 0, 0), food("Dal", 160, 9, 20, 5)))));
        assertEquals(1, result.items().size()); assertTrue(result.items().getFirst().nutritionAvailable());
        assertEquals("estimated", result.items().getFirst().nutritionSource()); assertEquals(161, result.calories());
    }
    @Test void invalidAvailabilityIsRejected() {
        var item = new HashMap<String, Object>(food("Dal", 160, 9, 20, 5));
        item.put("nutritionAvailable", "true");
        assertThrows(IllegalArgumentException.class, () -> FoodAnalysisNormalizer.normalize(mapper.valueToTree(
            Map.of("foodDetected", true, "items", List.of(item)))));
    }
}
