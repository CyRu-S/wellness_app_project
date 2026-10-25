package com.wellnessapp.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FoodAnalysisRateLimiterTests {
    @Test void accountLimitsExpireAtMinuteAndUtcDayBoundaries() {
        var clock = mock(Clock.class);
        var start = Instant.parse("2026-10-25T12:00:00Z");
        when(clock.instant()).thenReturn(start);
        var limit = new FoodAnalysisRateLimiter(clock, 2, 3);
        limit.requireAllowance("member"); limit.requireAllowance("member");
        assertEquals(429, assertThrows(ResponseStatusException.class, () -> limit.requireAllowance("member")).getStatusCode().value());
        limit.requireAllowance("other");
        when(clock.instant()).thenReturn(start.plusSeconds(59));
        assertThrows(ResponseStatusException.class, () -> limit.requireAllowance("member"));
        when(clock.instant()).thenReturn(start.plusSeconds(60));
        limit.requireAllowance("member");
        when(clock.instant()).thenReturn(start.plusSeconds(120));
        assertThrows(ResponseStatusException.class, () -> limit.requireAllowance("member"));
        when(clock.instant()).thenReturn(Instant.parse("2026-10-26T00:00:00Z"));
        limit.requireAllowance("member");
        assertEquals(401, assertThrows(ResponseStatusException.class, () -> limit.requireAllowance(null)).getStatusCode().value());
    }

    @Test void parallelRequestsCannotExceedTheAccountLimit() throws Exception {
        var limit = new FoodAnalysisRateLimiter(Clock.systemUTC(), 2, 10);
        var allowed = new AtomicInteger();
        try (var workers = Executors.newFixedThreadPool(8)) {
            var jobs = new java.util.ArrayList<Future<?>>();
            for (int i = 0; i < 20; i++) jobs.add(workers.submit(() -> {
                try { limit.requireAllowance("member"); allowed.incrementAndGet(); }
                catch (ResponseStatusException error) { assertEquals(429, error.getStatusCode().value()); }
            }));
            for (var job : jobs) job.get();
        }
        assertEquals(2, allowed.get());
    }
}
