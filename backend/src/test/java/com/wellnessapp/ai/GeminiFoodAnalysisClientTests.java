package com.wellnessapp.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiFoodAnalysisClientTests {
    final ObjectMapper mapper = new ObjectMapper();
    GeminiFoodAnalysisClient client;
    MockRestServiceServer server;

    @BeforeEach void setup() {
        var builder = RestClient.builder();
        client = new GeminiFoodAnalysisClient(mapper, builder);
        server = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(client, "client", builder.build());
        ReflectionTestUtils.setField(client, "apiKey", "test-private-key");
        ReflectionTestUtils.setField(client, "model", "gemini-3.1-flash-lite");
    }

    Map<String, Object> food(String name, double protein, double carbs, double fat, boolean available) {
        var item = new LinkedHashMap<String, Object>();
        item.put("name", name);
        item.put("portionGrams", 100);
        item.put("protein", available ? protein : null);
        item.put("carbs", available ? carbs : null);
        item.put("fat", available ? fat : null);
        return item;
    }

    String provider(Object payload) throws Exception {
        return mapper.writeValueAsString(Map.of("candidates", List.of(Map.of("finishReason", "STOP",
            "content", Map.of("parts", List.of(Map.of("text", mapper.writeValueAsString(payload))))))));
    }

    @Test void oneCompactVisionRequestProducesTotalsForEstimatedPhotographedServings() throws Exception {
        var rice = food("Rice", 4.1, 42.5, 1, true);
        rice.put("portionGrams", 200);
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent"))
            .andExpect(method(HttpMethod.POST)).andExpect(header("x-goog-api-key", "test-private-key"))
            .andExpect(headerDoesNotExist("Authorization"))
            .andExpect(jsonPath("$.contents[0].parts[0].inlineData.mimeType").value("image/jpeg"))
            .andExpect(jsonPath("$.contents[0].parts[0].inlineData.data").value("AQ=="))
            .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(org.hamcrest.Matchers.containsString("PER 100 GRAMS")))
            .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(org.hamcrest.Matchers.containsString("standard serving")))
            .andExpect(jsonPath("$.generationConfig.responseMimeType").value("application/json"))
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.properties.items.maxItems").value(12))
            .andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingLevel").value("MINIMAL"))
            .andExpect(jsonPath("$.generationConfig.mediaResolution").value("MEDIA_RESOLUTION_MEDIUM"))
            .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(768))
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.properties.foodDetected").doesNotExist())
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.properties.items.items.properties.confidence").doesNotExist())
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.properties.items.items.properties.nutritionAvailable").doesNotExist())
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.properties.items.items.properties.portionGrams.maximum").value(2000))
            .andRespond(withSuccess(provider(Map.of("items", List.of(rice, food("Dal", 9.1, 20, 5, true), rice))), MediaType.APPLICATION_JSON));
        var result = client.analyse(new byte[]{1}, "image/jpeg", "lunch");
        assertEquals("Rice, Dal", result.name());
        assertEquals(2, result.items().size());
        assertEquals(552.2, result.calories());
        assertEquals(17.3, result.protein());
        assertEquals("ESTIMATED_PORTION", result.portionBasis());
        assertEquals(200, result.items().getFirst().portionGrams());
        assertEquals(390.8, result.items().getFirst().calories());
        assertFalse(result.warning().contains("Enter the eaten weight"));
        assertEquals(0, result.confidence());
        server.verify();
    }

    @Test void unknownFoodRetainsItsNameAndDoesNotProducePartialNutritionTotals() throws Exception {
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items",
            List.of(food("Dal", 9, 20, 5, true), food("Unknown curry", 0, 0, 0, false)))), MediaType.APPLICATION_JSON));
        var result = client.analyse(new byte[]{1}, "image/webp", "meal");
        assertNull(result.calories());
        assertFalse(result.items().get(1).nutritionAvailable());
        assertEquals("Unknown curry", result.items().get(1).name());
        server.verify();
    }

    @Test void nonFoodImagesAreRejected() throws Exception {
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items", List.of())), MediaType.APPLICATION_JSON));
        assertEquals(422, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/png", "meal")).getStatusCode().value());
        server.verify();
    }

    @Test void missingKeyNeverSendsARequest() {
        ReflectionTestUtils.setField(client, "apiKey", " ");
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }

    @Test void providerFailuresDoNotExposeBodiesOrCredentials() {
        for (var status : List.of(HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR))
            server.expect(anything()).andRespond(withStatus(status).body("private provider body test-private-key"));
        for (int i = 0; i < 4; i++) {
            var error = assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal"));
            assertEquals(503, error.getStatusCode().value());
            assertFalse(error.getReason().contains("test-private-key"));
            assertFalse(error.getReason().contains("provider body"));
        }
        server.verify();
    }

    @Test void truncatedBlockedAndEmptyResponsesCannotBecomeValidNutrition() throws Exception {
        for (String response : List.of("{}", "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}",
            "{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\",\"content\":{\"parts\":[{\"text\":\"{}\"}]}}]}"))
            server.expect(anything()).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        for (int i = 0; i < 3; i++)
            assertEquals(422, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }

    @Test void invalidJsonMissingFieldsAndImpossibleMacrosAreRejected() throws Exception {
        server.expect(anything()).andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"broken\"}]}}]}", MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items", List.of(Map.of("name", "Dal")))), MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items", List.of(food("Dal", 90, 90, 90, true)))), MediaType.APPLICATION_JSON));
        for (int i = 0; i < 3; i++)
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }

    @Test void connectionFailureAllowsTheNextRequestToSucceed() throws Exception {
        server.expect(anything()).andRespond(withException(new IOException("private connection details")));
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items", List.of(food("Dal", 9, 20, 5, true)))), MediaType.APPLICATION_JSON));
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        assertEquals("Dal", client.analyse(new byte[]{1}, "image/jpeg", "meal").name());
        server.verify();
    }

    @Test void partlyMissingNutritionAndMoreThanTwelveFoodsAreRejected() throws Exception {
        var partial = new LinkedHashMap<String, Object>(food("Curry", 9, 20, 5, true));
        partial.put("fat", null);
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items", List.of(partial))), MediaType.APPLICATION_JSON));
        server.expect(anything()).andRespond(withSuccess(provider(Map.of("items",
            Collections.nCopies(13, food("Rice", 4, 28, 1, true)))), MediaType.APPLICATION_JSON));
        for (int i = 0; i < 2; i++)
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }

    @Test void invalidOrMissingPortionEstimatesNeverBecomeNutritionTotals() throws Exception {
        for (Object grams : List.of(0, -1, 2001, "150", "missing")) {
            var item = food("Dal", 9, 20, 5, true);
            if ("missing".equals(grams)) item.remove("portionGrams"); else item.put("portionGrams", grams);
            server.expect(anything()).andRespond(withSuccess(provider(Map.of("items", List.of(item))), MediaType.APPLICATION_JSON));
        }
        for (int i = 0; i < 5; i++)
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> client.analyse(new byte[]{1}, "image/jpeg", "meal")).getStatusCode().value());
        server.verify();
    }
}
