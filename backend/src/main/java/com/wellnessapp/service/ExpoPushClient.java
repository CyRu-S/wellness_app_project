package com.wellnessapp.service;

import com.fasterxml.jackson.databind.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

/** Tokens and payloads must not be logged. The provider address is intentionally not user-configurable. */
@Component
public class ExpoPushClient {
    private final ObjectMapper json;
    private final String accessToken;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public ExpoPushClient(ObjectMapper json, @Value("${app.push.expo-access-token:}") String accessToken) {
        this.json = json; this.accessToken = accessToken;
    }
    public static class ProviderException extends IOException {
        public final boolean retryable;
        public ProviderException(boolean retryable) { super("Push provider request failed"); this.retryable = retryable; }
    }
    private JsonNode post(String path, Object body) throws IOException, InterruptedException {
        var builder = HttpRequest.newBuilder(URI.create("https://exp.host/--/api/v2/push/" + path))
                .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json").header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (!accessToken.isBlank()) builder.header("Authorization", "Bearer " + accessToken);
        var response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300)
            throw new ProviderException(response.statusCode() == 429 || response.statusCode() >= 500);
        var data = json.readTree(response.body()).path("data");
        if (data.isMissingNode() || data.isNull()) throw new ProviderException(false);
        return data;
    }
    public JsonNode send(List<Map<String, Object>> messages) throws IOException, InterruptedException { return post("send", messages); }
    public JsonNode receipts(List<String> ids) throws IOException, InterruptedException { return post("getReceipts", Map.of("ids", ids)); }
}
