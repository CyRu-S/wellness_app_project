package com.wellnessapp.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.dto.meal.MealAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Component
@RequiredArgsConstructor
public class GeminiClient {
    private final ObjectMapper objectMapper;

    @Value("${app.gemini.api-key:}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-3.6-flash}")
    private String model;

    public MealAnalysisResponse analyse(byte[] image, String mimeType, String category) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Meal analysis is not configured");
        }

        String prompt = """
                Analyse this %s image for a nutrition tracking application. Return only valid JSON with:
                name (short food or product name), calories, protein, carbs, fat (whole-number grams),
                confidence (0-100), and ingredients (array of up to 6 likely visible ingredients).
                Estimate one visible serving. Never include markdown. If the image is not food or a nutrition
                product, set confidence below 20 and use name \"Unrecognised item\".
                """.formatted(category);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("inline_data", Map.of(
                                "mime_type", mimeType,
                                "data", Base64.getEncoder().encodeToString(image)
                        )),
                        Map.of("text", prompt)
                ))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.1
                )
        );

        try {
            JsonNode response = RestClient.create()
                    .post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            String json = response.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
            if (json.isBlank()) throw new IllegalStateException("Empty analysis response");
            return objectMapper.readValue(json, MealAnalysisResponse.class);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(BAD_GATEWAY, "Unable to analyse this image", exception);
        }
    }
}
