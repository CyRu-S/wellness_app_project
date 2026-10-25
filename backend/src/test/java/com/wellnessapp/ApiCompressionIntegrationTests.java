package com.wellnessapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.entity.User;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.zip.GZIPInputStream;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.demo.seed-enabled=false",
        "server.compression.enabled=true", "server.compression.min-response-size=2KB",
        "springdoc.api-docs.enabled=false", "springdoc.swagger-ui.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:compression;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"})
class ApiCompressionIntegrationTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider tokens;
    @Autowired ObjectMapper json;

    @Test void authenticatedReportsAreCompressedAndProtectedEndpointsRemainPrivate() throws Exception {
        for (int i = 0; i < 15; i++) users.save(User.builder().email("compression-" + i + "@example.com")
                .fullName("Compression test member " + i).passwordHash("unused").role(User.Role.USER)
                .status(User.Status.ACTIVE).emailVerifiedAt(Instant.now()).build());
        var client = HttpClient.newHttpClient();
        var uri = URI.create("http://localhost:" + port + "/api/admin/members");
        var token = tokens.generate("admin@mr-care.app", "ROLE_ADMIN");
        var response = client.send(HttpRequest.newBuilder(uri).header("Authorization", "Bearer " + token)
                .header("Accept-Encoding", "gzip").build(), HttpResponse.BodyHandlers.ofByteArray());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Content-Encoding")).contains("gzip");
        byte[] plain;
        try (var gzip = new GZIPInputStream(new ByteArrayInputStream(response.body()))) { plain = gzip.readAllBytes(); }
        assertThat(json.readTree(plain)).hasSize(15);
        assertThat(response.body().length).isLessThan(plain.length);
        assertThat(response.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        var preflight = client.send(HttpRequest.newBuilder(uri).method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", "https://wellnessappproject-frontend.vercel.app")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "authorization").build(), HttpResponse.BodyHandlers.discarding());
        assertThat(preflight.statusCode()).isEqualTo(200);
        assertThat(preflight.headers().firstValue("Access-Control-Max-Age")).contains("1800");
        System.out.printf("Admin directory compression: %d -> %d bytes%n", plain.length, response.body().length);
        assertThat(client.send(HttpRequest.newBuilder(uri).build(), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
        var member = tokens.generate("compression-0@example.com", "ROLE_USER");
        var status = URI.create("http://localhost:" + port + "/api/admin/hydration/nudge-all");
        assertThat(client.send(HttpRequest.newBuilder(status).header("Authorization", "Bearer " + member).build(),
                HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(403);
        var docs = URI.create("http://localhost:" + port + "/v3/api-docs");
        assertThat(client.send(HttpRequest.newBuilder(docs).build(), HttpResponse.BodyHandlers.discarding()).statusCode()).isNotEqualTo(200);
    }
}
