package com.wellnessapp.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiClientTests {
    final ObjectMapper mapper = new ObjectMapper();
    GeminiClient client;
    MockRestServiceServer server;
    @BeforeEach void setup() {
        var builder = RestClient.builder();
        client = new GeminiClient(mapper, builder);
        server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(client, "client", builder.build());
        ReflectionTestUtils.setField(client, "apiKey", "test-key");
        ReflectionTestUtils.setField(client, "model", "gemini-3.6-flash");
    }
    private Map<String, Object> food(String name, double calories, double protein, double carbs, double fat) {
        return Map.of("name", name, "standardPortion", "1 katori", "portionGrams", 150, "calories", calories,
            "protein", protein, "carbs", carbs, "fat", fat, "confidence", 85, "ingredients", List.of());
    }
    private String provider(Object payload) throws Exception {
        return mapper.writeValueAsString(Map.of("candidates", List.of(Map.of("finishReason", "STOP",
            "content", Map.of("parts", List.of(Map.of("text", mapper.writeValueAsString(payload))))))));
    }
    @Test void mixedIndianPlateUsesStandardServingItemsAndServerTotals() throws Exception {
        var rice = food("Rice", 195.3, 4.1, 42.5, 1.0);
        var dal = food("Dal", 160.5, 9.1, 20.0, 5.0);
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"))
            .andExpect(header("x-goog-api-key", "test-key"))
            .andExpect(jsonPath("$.generationConfig.responseMimeType").value("application/json"))
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.properties.items.maxItems").value(12))
            .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(org.hamcrest.Matchers.containsString("ONE STANDARD SERVING")))
            .andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(rice, dal, rice))), MediaType.APPLICATION_JSON));
        var result = client.analyse(new byte[]{1}, "image/jpeg", "lunch");
        assertEquals(2, result.items().size()); assertEquals("Rice, Dal", result.name());
        assertEquals(355.8, result.calories()); assertEquals(13.2, result.protein());
        assertEquals("STANDARD_SERVING_PER_DISH", result.portionBasis());
        assertTrue(result.warning().contains("not a measurement")); server.verify();
    }
    @Test void noFoodPhotoIsRejectedInsteadOfInventingNutrition() throws Exception {
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", false, "items", List.of())), MediaType.APPLICATION_JSON));
        var error = assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
        assertEquals(422, error.getStatusCode().value()); assertTrue(error.getReason().contains("No food"));
    }
    @Test void invalidNumbersAreRejected() throws Exception {
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(food("Dal", -10, 9, 20, 5)))), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
    @Test void impossibleMacroAndCalorieValuesAreRejected() throws Exception {
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(food("Dal", 100, 90, 90, 90)))), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
    @Test void quotaFailuresDoNotLeakProviderBodiesOrCredentials() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("private provider body test-key"));
        var error = assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
        assertEquals(503, error.getStatusCode().value()); assertFalse(error.getReason().contains("test-key"));
        assertTrue(error.getReason().contains("quota"));
    }
    @Test void unavailableConfigurationFailsBeforeSendingAnImage() {
        ReflectionTestUtils.setField(client, "apiKey", "");
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }
    @Test void truncatedResponseIsNotPresentedAsValidRecognition() {
        server.expect(anything()).andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\"}]}", MediaType.APPLICATION_JSON));
        assertEquals(422, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
}
