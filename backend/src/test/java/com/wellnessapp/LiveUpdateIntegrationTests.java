package com.wellnessapp;

import com.wellnessapp.entity.User;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.demo.seed-enabled=false", "spring.datasource.url=jdbc:h2:mem:live-stream;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"})
class LiveUpdateIntegrationTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider tokens;

    @Test void authenticatedClientsBothReceiveCommittedChangesOverRealHttpStreams() throws Exception {
        var first = member("stream-one@example.com");
        var second = member("stream-two@example.com");
        try (var client = HttpClient.newHttpClient(); var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var rejected = client.send(HttpRequest.newBuilder(url("/api/live/updates")).GET().build(), HttpResponse.BodyHandlers.discarding());
            assertThat(rejected.statusCode()).isEqualTo(401);
            var stream1 = client.send(authorized(first, "/api/live/updates").GET().build(), HttpResponse.BodyHandlers.ofInputStream());
            var stream2 = client.send(authorized(second, "/api/live/updates").GET().build(), HttpResponse.BodyHandlers.ofInputStream());
            assertThat(stream1.statusCode()).isEqualTo(200);
            assertThat(stream2.statusCode()).isEqualTo(200);
            assertThat(stream1.headers().firstValue("content-type").orElse("")).contains("text/event-stream");
            try (var reader1 = new BufferedReader(new InputStreamReader(stream1.body()));
                 var reader2 = new BufferedReader(new InputStreamReader(stream2.body()))) {
                assertThat(frame(executor, reader1)).contains("event:ready");
                assertThat(frame(executor, reader2)).contains("event:ready");
                var posted = client.send(authorized(first, "/api/water").header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{\"amountMl\":250}")).build(), HttpResponse.BodyHandlers.discarding());
                assertThat(posted.statusCode()).isEqualTo(201);
                assertThat(frame(executor, reader1)).contains("event:changed").doesNotContain("example.com");
                assertThat(frame(executor, reader2)).contains("event:changed").doesNotContain("example.com");
            }
        }
    }

    private User member(String email) {
        return users.saveAndFlush(User.builder().fullName("Stream member").email(email).passwordHash("unused")
                .role(User.Role.USER).status(User.Status.ACTIVE).emailVerifiedAt(java.time.Instant.now()).build());
    }
    private URI url(String path) { return URI.create("http://127.0.0.1:" + port + path); }
    private HttpRequest.Builder authorized(User member, String path) {
        return HttpRequest.newBuilder(url(path)).timeout(Duration.ofSeconds(5))
                .header("Authorization", "Bearer " + tokens.generate(member.getEmail(), "ROLE_USER"));
    }
    private String frame(ExecutorService executor, BufferedReader reader) throws Exception {
        return executor.submit(() -> {
            var result = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) result.append(line).append('\n');
            return result.toString();
        }).get(5, TimeUnit.SECONDS);
    }
}
