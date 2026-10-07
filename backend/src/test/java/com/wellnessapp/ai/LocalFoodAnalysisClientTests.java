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

class LocalFoodAnalysisClientTests {
    final ObjectMapper mapper = new ObjectMapper();
    LocalFoodAnalysisClient client;
    MockRestServiceServer server;
    @BeforeEach void setup() {
        var builder = RestClient.builder();
        client = new LocalFoodAnalysisClient(mapper, builder);
        server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(client, "client", builder.build());
        ReflectionTestUtils.setField(client, "baseUrl", "http://127.0.0.1:11434");
        ReflectionTestUtils.setField(client, "model", "qwen3-vl:2b-instruct");
    }
    private Map<String, Object> food(String name, double calories, double protein, double carbs, double fat) {
        return Map.of("name", name, "standardPortion", "100 g", "portionGrams", 100, "calories", calories,
            "protein", protein, "carbs", carbs, "fat", fat, "confidence", 85, "ingredients", List.of());
    }
    private String provider(Object payload) throws Exception {
        return mapper.writeValueAsString(Map.of("done", true, "done_reason", "stop",
            "message", Map.of("content", mapper.writeValueAsString(payload))));
    }
    private String observation(String content) throws Exception {
        return mapper.writeValueAsString(Map.of("done", true, "done_reason", "stop", "message", Map.of("content", content)));
    }
    private void expectObservation(String content) throws Exception {
        server.expect(requestTo("http://127.0.0.1:11434/api/chat"))
            .andExpect(headerDoesNotExist("Authorization"))
            .andExpect(headerDoesNotExist("x-goog-api-key"))
            .andExpect(jsonPath("$.format").doesNotExist())
            .andExpect(jsonPath("$.messages[0].images[0]").value("AQ=="))
            .andRespond(withSuccess(observation(content), MediaType.APPLICATION_JSON));
    }
    @Test void mixedIndianPlateUsesPer100GramItemsAndServerComputedEnergy() throws Exception {
        var rice = food("Rice", 195.3, 4.1, 42.5, 1.0);
        var dal = food("Dal", 160.5, 9.1, 20.0, 5.0);
        expectObservation("Cooked rice and dal are visible.");
        server.expect(requestTo("http://127.0.0.1:11434/api/chat"))
            .andExpect(headerDoesNotExist("Authorization"))
            .andExpect(headerDoesNotExist("x-goog-api-key"))
            .andExpect(headerDoesNotExist("X-Model-Service-Token"))
            .andExpect(jsonPath("$.model").value("qwen3-vl:2b-instruct"))
            .andExpect(jsonPath("$.stream").value(false))
            .andExpect(jsonPath("$.format.type").value("object"))
            .andExpect(jsonPath("$.format.properties.items.maxItems").value(12))
            .andExpect(jsonPath("$.format.properties.items.items.properties.portionGrams.const").value(100))
            .andExpect(jsonPath("$.format.properties.items.items.properties.nutritionAvailable.type").value("boolean"))
            .andExpect(jsonPath("$.format.properties.items.items.required").value(org.hamcrest.Matchers.hasItem("nutritionAvailable")))
            .andExpect(jsonPath("$.messages[0].content").value(org.hamcrest.Matchers.containsString("PER 100 GRAMS")))
            .andExpect(jsonPath("$.messages[1].content").value(org.hamcrest.Matchers.containsString("Cooked rice and dal are visible.")))
            .andExpect(jsonPath("$.messages[1].images").doesNotExist())
            .andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(rice, dal, rice))), MediaType.APPLICATION_JSON));
        var result = client.analyse(new byte[]{1}, "image/jpeg", "lunch");
        assertEquals(2, result.items().size()); assertEquals("Rice, Dal", result.name());
        assertEquals(356.8, result.calories()); assertEquals(13.2, result.protein());
        assertEquals("PER_100_G", result.portionBasis());
        assertTrue(result.warning().contains("Enter the eaten weight")); server.verify();
    }
    @Test void ladduGetsAnExplicitBesanReferenceWhenTheModelReturnsZeroOrImplausiblyLowValues() throws Exception {
        for (String name : List.of("Laddu", "Ladoo", "Laddoo", "Besan laddu", "Besan Ladoo", "बेसन लड्डू")) {
            for (double carbs : List.of(0.0, 10.0)) {
                var result = LocalFoodAnalysisClient.normalize(mapper.valueToTree(Map.of("foodDetected", true,
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
            var result = LocalFoodAnalysisClient.normalize(mapper.valueToTree(Map.of("foodDetected", true,
                "items", List.of(food(name, 0, 0, 0, 0)))));
            var item = result.items().getFirst();
            assertEquals(name, item.name()); assertFalse(item.nutritionAvailable());
            assertEquals("unavailable", item.nutritionSource()); assertNull(item.calories()); assertNull(result.calories());
        }
    }
    @Test void unknownNutritionIsSerializedAsUnavailableWhilePreservingTheDetectedFood() throws Exception {
        var item = new HashMap<String, Object>(food("Unknown sweet", 0, 0, 0, 0));
        expectObservation("An unknown sweet is visible.");
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(item))), MediaType.APPLICATION_JSON));
        var result = client.analyse(new byte[]{1}, "image/jpeg", "snacks");
        assertEquals("Unknown sweet", result.name()); assertNull(result.calories());
        assertFalse(result.items().getFirst().nutritionAvailable());
        assertTrue(result.warning().contains("unavailable"));
        var json = mapper.readTree(mapper.writeValueAsString(result));
        assertTrue(json.path("calories").isNull());
        assertTrue(json.path("items").get(0).path("protein").isNull());
        assertFalse(json.path("items").get(0).path("nutritionAvailable").asBoolean());
        assertEquals("Unknown sweet", json.path("items").get(0).path("name").asText());
        server.verify();
    }
    @Test void explicitUnknownNutritionDoesNotProducePartialMealTotals() {
        var unknown = new HashMap<String, Object>(food("Unidentified curry", 160, 9, 20, 5));
        unknown.put("nutritionAvailable", false);
        var result = LocalFoodAnalysisClient.normalize(mapper.valueToTree(Map.of("foodDetected", true,
            "items", List.of(food("Dal", 160, 9, 20, 5), unknown))));
        assertEquals(2, result.items().size()); assertTrue(result.items().getFirst().nutritionAvailable());
        assertFalse(result.items().get(1).nutritionAvailable()); assertNull(result.items().get(1).fat());
        assertNull(result.calories()); assertNull(result.protein()); assertNull(result.carbs()); assertNull(result.fat());
    }
    @Test void availableNutritionWinsWhenADishWasAlsoReturnedAsUnknown() {
        var result = LocalFoodAnalysisClient.normalize(mapper.valueToTree(Map.of("foodDetected", true,
            "items", List.of(food("Dal", 0, 0, 0, 0), food("Dal", 160, 9, 20, 5)))));
        assertEquals(1, result.items().size()); assertTrue(result.items().getFirst().nutritionAvailable());
        assertEquals("estimated", result.items().getFirst().nutritionSource()); assertEquals(161, result.calories());
    }
    @Test void invalidAvailabilityIsRejected() {
        var item = new HashMap<String, Object>(food("Dal", 160, 9, 20, 5));
        item.put("nutritionAvailable", "true");
        assertThrows(IllegalArgumentException.class, () -> LocalFoodAnalysisClient.normalize(mapper.valueToTree(
            Map.of("foodDetected", true, "items", List.of(item)))));
    }
    @Test void noFoodPhotoIsRejectedInsteadOfInventingNutrition() throws Exception {
        expectObservation("No food is visible.");
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", false, "items", List.of())), MediaType.APPLICATION_JSON));
        var error = assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
        assertEquals(422, error.getStatusCode().value()); assertTrue(error.getReason().contains("No food"));
    }
    @Test void selfHostedProxyCanRequireAnInternalServiceToken() throws Exception {
        ReflectionTestUtils.setField(client, "serviceToken", "internal-test-token");
        expectObservation("Dal is visible.");
        server.expect(requestTo("http://127.0.0.1:11434/api/chat"))
            .andExpect(header("X-Model-Service-Token", "internal-test-token"))
            .andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(food("Dal", 160, 9, 20, 5)))), MediaType.APPLICATION_JSON));
        assertEquals("Dal", client.analyse(new byte[]{1}, "image/jpeg", "meal").name());
        server.verify();
    }
    @Test void invalidNumbersAreRejected() throws Exception {
        expectObservation("Dal is visible.");
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(food("Dal", 160, -9, 20, 5)))), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
    @Test void impossibleMacroAndCalorieValuesAreRejected() throws Exception {
        expectObservation("Dal is visible.");
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(food("Dal", 100, 90, 90, 90)))), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
    @Test void estimatesForADifferentReferenceWeightCannotBeUsedAsPer100Grams() throws Exception {
        expectObservation("Dal is visible.");
        var item = new HashMap<String, Object>(food("Dal", 160, 9, 20, 5));
        item.put("portionGrams", 150);
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("foodDetected", true, "items", List.of(item))), MediaType.APPLICATION_JSON));
        assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
    @Test void missingModelsDoNotLeakRuntimeErrors() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.NOT_FOUND).body("private provider body test-key"));
        var error = assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
        assertEquals(503, error.getStatusCode().value()); assertFalse(error.getReason().contains("test-key"));
        assertTrue(error.getReason().contains("not installed"));
    }
    @Test void cloudModelsAreRejectedBeforeSendingAnImage() {
        ReflectionTestUtils.setField(client, "model", "qwen3-vl:235b-cloud");
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }
    @Test void truncatedResponseIsNotPresentedAsValidRecognition() {
        server.expect(anything()).andRespond(withSuccess("{\"done\":true,\"done_reason\":\"length\"}", MediaType.APPLICATION_JSON));
        assertEquals(422, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
    }
    @Test void aBusyModelDoesNotStartParallelInferenceAndRecoversAfterCompletion() throws Exception {
        var entered = new java.util.concurrent.CountDownLatch(1);
        var release = new java.util.concurrent.CountDownLatch(1);
        String result = provider(Map.of("foodDetected", true, "items", List.of(food("Dal", 160, 9, 20, 5))));
        String visibleDal = observation("Dal is visible.");
        server.expect(anything()).andRespond(request -> {
            entered.countDown();
            try { if (!release.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new java.io.IOException("Test timed out"); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new java.io.IOException(error); }
            return withSuccess(visibleDal, MediaType.APPLICATION_JSON).createResponse(request);
        });
        server.expect(anything()).andRespond(withSuccess(result, MediaType.APPLICATION_JSON));
        expectObservation("Dal is visible.");
        server.expect(anything()).andRespond(withSuccess(result, MediaType.APPLICATION_JSON));
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        try {
            var pending = executor.submit(() -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
            assertTrue(entered.await(5, java.util.concurrent.TimeUnit.SECONDS));
            var busy = assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
            assertEquals(503, busy.getStatusCode().value()); assertTrue(busy.getReason().contains("busy"));
            release.countDown(); assertEquals("Dal", pending.get(5, java.util.concurrent.TimeUnit.SECONDS).name());
            assertEquals("Dal", client.analyse(new byte[]{1}, "image/jpeg", "meal").name()); server.verify();
        } finally { release.countDown(); executor.shutdownNow(); }
    }

}
