package com.wellnessapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real HTTP requests with separate committed transactions, never the configured Supabase database. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=", "app.demo.seed-enabled=false", "app.schedulers.enabled=false",
        "app.push.enabled=false", "app.web-push.enabled=false", "app.mail.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:http-e2e;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
        "app.admin.initial-password=test-admin-password"})
class ApiEndToEndTests {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired NotificationRepository notifications;
    @Autowired ProductRepository products;
    @Autowired ReminderService reminders;
    @MockitoBean Clock clock;
    @MockitoBean PasswordResetMailService mail;
    private final Map<String, String> verification = new ConcurrentHashMap<>();
    private final Map<String, String> reset = new ConcurrentHashMap<>();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private static final byte[] PNG = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=");

    private JsonNode call(String method, String path, Object body, String token, int expected) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body)));
        var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as("%s %s: %s", method, path, response.body()).isEqualTo(expected);
        return response.body().isBlank() ? json.nullNode() : json.readTree(response.body());
    }

    private JsonNode upload(String method, String path, String token, Object metadata, int expected) throws Exception {
        String boundary = "e2e-" + UUID.randomUUID();
        var bytes = new ByteArrayOutputStream();
        if (metadata != null) {
            bytes.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"metadata\"\r\nContent-Type: text/plain\r\n\r\n"
                    + json.writeValueAsString(metadata) + "\r\n").getBytes(StandardCharsets.UTF_8));
        }
        bytes.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"meal.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        bytes.write(PNG);
        bytes.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        var response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10)).header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .method(method, HttpRequest.BodyPublishers.ofByteArray(bytes.toByteArray())).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as("%s %s: %s", method, path, response.body()).isEqualTo(expected);
        return json.readTree(response.body());
    }

    private String login(String email, String password) throws Exception {
        return call("POST", "/auth/login", Map.of("email", email, "password", password), null, 200).path("token").asText();
    }

    private long register(String email, String name) throws Exception {
        var result = call("POST", "/auth/register", Map.of("email", email, "name", name, "password", "MemberPass123!",
                "age", 28, "heightCm", 174, "weightKg", 72.4), null, 201);
        assertThat(result.path("token").isNull()).isTrue();
        call("POST", "/auth/login", Map.of("email", email, "password", "MemberPass123!"), null, 403);
        call("POST", "/auth/resend-verification", Map.of("email", email), null, 200);
        call("POST", "/auth/verify-email", Map.of("email", email, "otp", verification.get(email)), null, 200);
        return result.path("id").asLong();
    }

    @Test void adminThenMemberWorkflowAcrossRealHttpTransactions() throws Exception {
        when(clock.withZone(any())).thenReturn(clock);
        when(clock.getZone()).thenReturn(ZoneId.of("Asia/Kolkata"));
        when(clock.instant()).thenReturn(Instant.parse("2026-10-08T05:00:00Z"));
        doAnswer(invocation -> { verification.put(invocation.getArgument(0), invocation.getArgument(2)); return null; })
                .when(mail).sendVerificationOtp(anyString(), anyString(), anyString(), anyLong());
        doAnswer(invocation -> { reset.put(invocation.getArgument(0), invocation.getArgument(2)); return null; })
                .when(mail).sendOtp(anyString(), anyString(), anyString(), anyLong());

        call("GET", "/health", null, null, 200);
        call("GET", "/admin/workspace", null, null, 401);
        var admin = login("admin@mr-care.app", "test-admin-password");
        assertThat(call("GET", "/admin/workspace", null, admin, 200).path("members").size()).isZero();
        call("GET", "/admin/dashboard", null, admin, 200);
        call("GET", "/admin/missed-items", null, admin, 200);
        call("GET", "/profile", null, admin, 200);
        call("PATCH", "/profile", Map.of("name", "QA Coach", "phone", "+919876543210", "clubName", "QA Club"), admin, 200);
        call("GET", "/notifications/preferences", null, admin, 200);
        call("PUT", "/notifications/preferences", Map.of("mealReminders", true, "coachNudges", true,
                "signupAlerts", true, "deadlineAlerts", true, "dailyDigest", true, "memberUpdates", true, "accountUpdates", true), admin, 200);
        products.save(HerbalifeProduct.builder().name("QA Product").sku("QA-001").price(new java.math.BigDecimal("250"))
                .stockQuantity(5).active(true).build());
        assertThat(call("GET", "/admin/products", null, admin, 200).get(0).path("name").asText()).isEqualTo("QA Product");

        var memberId = register("e2e-member@example.com", "QA Member");
        var viewerId = register("e2e-viewer@example.com", "QA Viewer");
        var declinedId = register("e2e-declined@example.com", "QA Declined");
        assertThat(call("GET", "/admin/approvals", null, admin, 200).size()).isEqualTo(3);
        for (long id : new long[]{memberId, viewerId})
            call("PATCH", "/admin/users/" + id + "/approval", Map.of("decision", "APPROVE"), admin, 204);
        call("PATCH", "/admin/users/" + declinedId + "/approval", Map.of("decision", "DECLINE"), admin, 204);
        call("PATCH", "/admin/users/" + memberId + "/approval", Map.of("decision", "APPROVE"), admin, 409);
        assertThat(call("GET", "/admin/approvals", null, admin, 200).size()).isZero();
        assertThat(call("GET", "/admin/members", null, admin, 200).size()).isEqualTo(2);
        call("GET", "/admin/users", null, admin, 200);
        var plan = Map.of("planName", "QA Daily", "items", List.of(Map.of("type", "Breakfast", "name", "Oats",
                "time", "08:00:00", "calories", 400, "protein", 20, "ingredients", List.of("Oats", "Milk"))));
        var assigned = call("PUT", "/admin/plans/members/" + memberId, plan, admin, 200);
        assertThat(assigned.path("consultant").asText()).isEqualTo("Coach QA Coach");
        call("PUT", "/admin/plans/members/" + memberId,
                Map.of("planName", "QA Revised", "items", assigned.path("items")), admin, 200);
        assertThat(notifications.findAll().stream().filter(event -> event.getUser().getId().equals(memberId)
                && event.getKind() == PushDelivery.Kind.PLAN).count()).isEqualTo(2);
        call("GET", "/admin/plans/members/" + memberId, null, admin, 200);
        call("GET", "/admin/plans", null, admin, 200);
        call("PATCH", "/admin/users/" + memberId + "/water-goal", Map.of("waterGoalMl", 2500), admin, 200);
        call("GET", "/admin/member-access", null, admin, 200);
        call("PUT", "/admin/member-access/" + viewerId, Map.of("memberIds", List.of(memberId)), admin, 200);
        reminders.refresh();
        var attention = call("GET", "/admin/attention", null, admin, 200);
        assertThat(attention.size()).isEqualTo(1);
        long attentionId = attention.get(0).path("id").asLong();
        call("POST", "/admin/attention/" + attentionId + "/nudge", null, admin, 204);
        assertThat(call("GET", "/admin/attention", null, admin, 200).get(0).path("status").asText()).isEqualTo("NUDGED");
        call("PATCH", "/admin/attention/" + attentionId + "/resolve", null, admin, 204);
        assertThat(call("GET", "/admin/attention", null, admin, 200).size()).isZero();
        call("PATCH", "/admin/attention/999999/resolve", null, admin, 404);
        call("GET", "/admin/users/" + memberId + "/journal", null, admin, 200);
        assertThat(call("GET", "/admin/workspace", null, admin, 200).path("summary").path("totalMembers").asInt()).isEqualTo(2);

        var member = login("e2e-member@example.com", "MemberPass123!");
        var viewer = login("e2e-viewer@example.com", "MemberPass123!");
        call("GET", "/admin/workspace", null, member, 403);
        call("POST", "/presence", null, member, 204);
        assertThat(call("GET", "/dashboard", null, member, 200).path("calories").asInt()).isZero();
        call("GET", "/plans/today", null, member, 200);
        var schedule = call("GET", "/meals/today", null, member, 200);
        assertThat(schedule.size()).isEqualTo(1);
        call("POST", "/water", Map.of("amountMl", 250), member, 201);
        call("POST", "/activities", Map.of("activity", "Walk", "durationSeconds", 120, "distanceKm", 0.2), member, 201);
        call("GET", "/activities", null, member, 200);
        var post = Map.of("plannedMealId", schedule.get(0).path("id").asLong(), "mealType", "Breakfast", "mealName", "Manual oats",
                "calories", 410.5, "proteinGrams", 20.25, "carbsGrams", 55.5, "fatGrams", 10.0, "clientRequestId", "http-e2e-meal");
        var posted = upload("POST", "/meal-posts", member, post, 201);
        // A replay after a lost response must not duplicate the meal.
        assertThat(upload("POST", "/meal-posts", member, post, 201).path("id").asLong()).isEqualTo(posted.path("id").asLong());
        assertThat(call("GET", "/meal-posts", null, member, 200).size()).isEqualTo(1);
        assertThat(call("GET", "/dashboard", null, member, 200).path("completion").asInt()).isEqualTo(100);
        reminders.refresh();
        assertThat(call("GET", "/admin/attention", null, admin, 200).size()).isZero();
        assertThat(call("GET", "/admin/users/" + memberId + "/journal", null, admin, 200)
                .path("today").path("summary").path("hydrationMl").asInt()).isEqualTo(250);
        assertThat(call("GET", "/shared-members", null, viewer, 200).path("total").asInt()).isEqualTo(1);
        call("GET", "/shared-members/" + memberId + "/today", null, viewer, 200);
        call("GET", "/shared-members/" + viewerId + "/today", null, member, 404);
        upload("PUT", "/profile/photo", member, null, 200);
        for (var imagePath : List.of("/profile/photo", "/meal-posts/" + posted.path("id").asLong() + "/image")) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + imagePath))
                    .header("Authorization", "Bearer " + member).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
            assertThat(response.statusCode()).isEqualTo(200); assertThat(response.body()).isEqualTo(PNG);
        }
        call("PATCH", "/profile", Map.of("name", "Updated Member", "dietaryPreferences", "Vegetarian"), member, 200);
        assertThat(call("GET", "/profile", null, member, 200).path("name").asText()).isEqualTo("Updated Member");
        call("PATCH", "/profile/body-metrics", Map.of("heightCm", 174, "weightKg", 71.5, "age", 28, "bodyFatPercent", 19.2), member, 200);
        call("PATCH", "/profile/body-metrics", Map.of("heightCm", 174, "weightKg", 71.0, "age", 28), member, 409);
        call("PUT", "/notifications/preferences", Map.of("mealReminders", false, "coachNudges", false), member, 200);
        assertThat(call("GET", "/notifications/preferences", null, member, 200).path("coachNudges").asBoolean()).isFalse();
        var inbox = call("GET", "/notifications", null, member, 200);
        assertThat(inbox.size()).isPositive();
        long noticeId = inbox.get(0).path("id").asLong();
        call("PATCH", "/notifications/" + noticeId + "/read", null, member, 204);
        assertThat(notifications.findById(noticeId).orElseThrow().isRead()).isTrue();
        call("PATCH", "/notifications/" + noticeId + "/read", null, viewer, 404);
        var seenIds = new ArrayList<Long>();
        inbox.forEach(item -> seenIds.add(item.path("id").asLong()));
        var unseen = notifications.save(NotificationEvent.builder().user(users.findById(memberId).orElseThrow())
                .title("New message").body("Arrived after the inbox snapshot").scheduledAt(clock.instant()).read(false).build());
        var foreign = notifications.save(NotificationEvent.builder().user(users.findById(viewerId).orElseThrow())
                .title("Other account").body("Private").scheduledAt(clock.instant()).read(false).build());
        call("PATCH", "/notifications/read", Map.of("ids", seenIds), null, 401);
        call("PATCH", "/notifications/read", Map.of("ids", List.of()), member, 400);
        call("PATCH", "/notifications/read", Map.of("ids", Collections.nCopies(31, noticeId)), member, 400);
        call("PATCH", "/notifications/read", Map.of("ids", seenIds), member, 204);
        // A repeated acknowledgement is safe, while unseen messages remain unread.
        call("PATCH", "/notifications/read", Map.of("ids", seenIds), member, 204);
        assertThat(notifications.findAllById(seenIds)).allMatch(NotificationEvent::isRead);
        assertThat(notifications.findById(unseen.getId()).orElseThrow().isRead()).isFalse();
        call("PATCH", "/notifications/read", Map.of("ids", List.of(unseen.getId(), foreign.getId())), member, 404);
        assertThat(notifications.findById(unseen.getId()).orElseThrow().isRead()).isFalse();
        assertThat(notifications.findById(foreign.getId()).orElseThrow().isRead()).isFalse();
        call("PATCH", "/notifications/read", Map.of("ids", List.of(unseen.getId())), member, 204);
        assertThat(call("GET", "/notifications", null, member, 200).findValues("read")).allMatch(JsonNode::asBoolean);
        var device = Map.of("token", "ExpoPushToken[qa_device]", "registrationId", UUID.randomUUID().toString());
        call("PUT", "/notifications/devices", device, member, 204);
        call("POST", "/notifications/devices/unregister", device, member, 204);
        call("GET", "/notifications/web/config", null, member, 200);
        call("PUT", "/admin/member-access/" + viewerId, Map.of("memberIds", List.of()), admin, 200);
        call("GET", "/shared-members/" + memberId + "/today", null, viewer, 404);
        call("POST", "/auth/forgot-password", Map.of("email", "e2e-member@example.com"), null, 200);
        call("POST", "/auth/reset-password", Map.of("email", "e2e-member@example.com", "otp", reset.get("e2e-member@example.com"),
                "newPassword", "ChangedPass123!"), null, 200);
        call("GET", "/profile", null, member, 401);
        assertThat(login("e2e-member@example.com", "ChangedPass123!")).isNotBlank();
    }
}
