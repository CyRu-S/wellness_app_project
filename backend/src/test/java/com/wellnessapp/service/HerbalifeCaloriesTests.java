package com.wellnessapp.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class HerbalifeCaloriesTests {
    @Test void productNamesMatchInsideDecoratedAdminTextWithExactDecimals() {
        Map.of("Afresh", "4", "Shake", "220", "Hydrate", "14", "Beta heart", "47.5", "Rebuild", "174.75", "Liftoff", "13.39")
            .forEach((name, calories) -> assertEquals(0, new BigDecimal(calories).compareTo(
                HerbalifeCalories.find("Herbalife product", "🌿 Morning " + name.toUpperCase() + " 🥤 serving").orElseThrow())));
        assertEquals(0, new BigDecimal("47.5").compareTo(HerbalifeCalories.find("PRODUCT", "Beta💚heart").orElseThrow()));
        assertEquals(0, new BigDecimal("13.39").compareTo(HerbalifeCalories.find("herbalife", "Lift-off 🚀").orElseThrow()));
    }

    @Test void combinedProductsAreAddedOnceEach() {
        assertEquals(0, new BigDecimal("237.39").compareTo(
            HerbalifeCalories.find("product", "Shake + Afresh + Liftoff + Shake").orElseThrow()));
    }

    @Test void ordinaryMealsAndUnlistedProductsAreNotOverridden() {
        assertTrue(HerbalifeCalories.find("Breakfast", "Banana shake").isEmpty());
        assertTrue(HerbalifeCalories.find("product", "Other supplement").isEmpty());
        assertTrue(HerbalifeCalories.find(null, "Afresh").isEmpty());
    }
}
