package com.wellnessapp.ai;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/** Small offline reference set; a photographed recipe can differ from the published reference. */
final class LocalFoodNutritionReferences {
    private LocalFoodNutritionReferences() {}
    record Reference(double calories, double protein, double carbs, double fat, String description) {}

    // Per 100 g, checked 2026-10-07. Published approximate values, not a brand identification:
    // https://www.haldirams.com/product/premium-sweets/besan-ladoo-250-gms
    private static final Reference BESAN_LADDU = new Reference(506, 8.4, 63.42, 24.32,
        "Besan laddu reference; other laddu recipes can differ. Edit the values if needed.");
    private static final Set<String> BESAN_ALIASES = Set.of("laddu", "ladoo", "laddoo", "laddu sweet",
        "besan laddu", "besan ladoo", "besan laddoo", "besan ladu", "लड्डू", "बेसन लड्डू");

    static Optional<Reference> find(String foodName) {
        String name = foodName.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{M}\\p{N}]+", " ").strip();
        return BESAN_ALIASES.contains(name) ? Optional.of(BESAN_LADDU) : Optional.empty();
    }
}
