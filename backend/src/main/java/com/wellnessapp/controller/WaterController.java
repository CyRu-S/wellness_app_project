package com.wellnessapp.controller;

import com.wellnessapp.entity.WaterLog;
import com.wellnessapp.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Clock;
import java.util.Map;

@RestController @RequestMapping("/api/water") @RequiredArgsConstructor
public class WaterController {
    private final UserRepository users;
    private final WaterLogRepository water;
    private final Clock clock;
    private final java.time.ZoneId applicationZoneId;
    public record WaterRequest(@Min(1) @Max(2000) int amountMl) {}
    @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    Map<String, Object> log(Authentication auth, @Valid @RequestBody WaterRequest request) {
        var user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        var saved = water.save(WaterLog.builder().user(user).amountMl(request.amountMl()).loggedAt(clock.instant()).build());
        return Map.of("id", saved.getId(), "amountMl", saved.getAmountMl(), "loggedAt", saved.getLoggedAt());
    }
    @DeleteMapping @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) @org.springframework.transaction.annotation.Transactional
    void clearToday(Authentication auth) {
        var user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        var today = java.time.LocalDate.now(clock.withZone(applicationZoneId));
        water.deleteByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThan(user.getId(),
                today.atStartOfDay(applicationZoneId).toInstant(), today.plusDays(1).atStartOfDay(applicationZoneId).toInstant());
    }
}
