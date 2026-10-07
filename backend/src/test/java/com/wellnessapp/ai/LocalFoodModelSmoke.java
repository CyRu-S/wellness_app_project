package com.wellnessapp.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit smoke check: mvn -Dtest=LocalFoodModelSmoke -DlocalFoodImage=/path/to/photo.jpg test.
 * Its name keeps it outside the default unit-test pattern; no model download is needed in CI. */
class LocalFoodModelSmoke {
    @Test void recognizesARealImageUsingOnlyTheConfiguredLocalRuntime() throws Exception {
        String filename = System.getProperty("localFoodImage");
        assertNotNull(filename, "Pass -DlocalFoodImage with a JPEG photo to run this explicit smoke check");
        var mapper = new ObjectMapper() {
            @Override public com.fasterxml.jackson.databind.JsonNode readTree(String content)
                    throws com.fasterxml.jackson.core.JsonProcessingException {
                if (Boolean.getBoolean("localFoodDebug")) System.out.println("Model nutrition JSON: " + content);
                return super.readTree(content);
            }
        };
        var client = new LocalFoodAnalysisClient(mapper, RestClient.builder());
        ReflectionTestUtils.setField(client, "baseUrl", System.getProperty("localFoodUrl", "http://127.0.0.1:11434"));
        ReflectionTestUtils.setField(client, "model", System.getProperty("localFoodModel", "qwen3-vl:2b-instruct"));
        long started = System.nanoTime();
        var result = client.analyse(Files.readAllBytes(Path.of(filename)), "image/jpeg", "meal");
        assertFalse(result.items().isEmpty());
        assertEquals("PER_100_G", result.portionBasis());
        assertTrue(result.calories() >= 0);
        String expectedFoods = System.getProperty("expectedFoods", "");
        for (String expected : expectedFoods.split(",")) {
            if (!expected.isBlank()) assertTrue(result.name().toLowerCase(java.util.Locale.ROOT)
                .contains(expected.strip().toLowerCase(java.util.Locale.ROOT)),
                "Expected visible food '" + expected + "' in: " + result.name());
        }
        System.out.printf("Local model recognized: %s; sum of per-100-g references: %.1f kcal; elapsed: %.1f s%n",
            result.name(), result.calories(), (System.nanoTime() - started) / 1_000_000_000.0);
        for (var food : result.items()) System.out.printf("  %s: %s (%.1f g), %.1f kcal, P %.1f/C %.1f/F %.1f%n",
            food.name(), food.standardPortion(), food.portionGrams(), food.calories(), food.protein(), food.carbs(), food.fat());
    }
}
