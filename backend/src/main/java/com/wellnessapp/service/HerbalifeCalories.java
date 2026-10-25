package com.wellnessapp.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Fixed calories per selected product; decorations and punctuation do not affect matching. */
public final class HerbalifeCalories {
    private HerbalifeCalories() {}
    private static final Map<String, BigDecimal> VALUES = Map.of(
        "afresh", new BigDecimal("4"), "shake", new BigDecimal("220"),
        "hydrate", new BigDecimal("14"), "betaheart", new BigDecimal("47.5"),
        "rebuild", new BigDecimal("174.75"), "liftoff", new BigDecimal("13.39"));

    public static boolean isProduct(String type) {
        return type != null && Set.of("product", "herbalife", "herbalife product").contains(type.strip().toLowerCase(Locale.ROOT));
    }

    public static Optional<BigDecimal> find(String type, String name) {
        if (!isProduct(type) || name == null) return Optional.empty();
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        var matches = VALUES.entrySet().stream().filter(entry -> normalized.contains(entry.getKey())).toList();
        return matches.isEmpty() ? Optional.empty()
            : Optional.of(matches.stream().map(Map.Entry::getValue).reduce(BigDecimal.ZERO, BigDecimal::add));
    }
}
