package com.wellnessapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.HttpStatus.*;

/** Bounds paid requests per authenticated account on this backend instance. */
@Component
public class FoodAnalysisRateLimiter {
    private final Clock clock;
    private final int perMinute;
    private final int perDay;
    private final Map<String, Usage> accounts = new HashMap<>();

    public FoodAnalysisRateLimiter(Clock clock,
        @Value("${app.gemini.requests-per-minute:6}") int perMinute,
        @Value("${app.gemini.requests-per-day:60}") int perDay) {
        if (perMinute < 1 || perDay < 1) throw new IllegalArgumentException("Food analysis limits must be positive");
        this.clock = clock;
        this.perMinute = perMinute;
        this.perDay = perDay;
    }

    public synchronized void requireAllowance(String account) {
        if (account == null || account.isBlank()) throw new ResponseStatusException(UNAUTHORIZED);
        var now = clock.instant();
        var today = LocalDate.ofInstant(now, ZoneOffset.UTC);
        var usage = accounts.get(account);
        if (usage == null || !usage.day.equals(today)) {
            if (usage == null && accounts.size() >= 10000) {
                accounts.values().removeIf(value -> !value.day.equals(today));
                if (accounts.size() >= 10000)
                    throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Food analysis is busy. Try again later.");
            }
            usage = new Usage(today);
            accounts.put(account, usage);
        }
        long millis = now.toEpochMilli();
        while (!usage.recent.isEmpty() && usage.recent.peekFirst() <= millis - 60000) usage.recent.removeFirst();
        if (usage.daily >= perDay || usage.recent.size() >= perMinute)
            throw new ResponseStatusException(TOO_MANY_REQUESTS, "Food photo analysis limit reached. Try again later or enter nutrition manually.");
        usage.daily++;
        usage.recent.addLast(millis);
    }

    private static final class Usage {
        final LocalDate day;
        final ArrayDeque<Long> recent = new ArrayDeque<>();
        int daily;
        Usage(LocalDate day) { this.day = day; }
    }
}
