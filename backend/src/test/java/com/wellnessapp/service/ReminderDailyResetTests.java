package com.wellnessapp.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderDailyResetTests {
    private final ZoneId zone = ZoneId.of("Asia/Kolkata");

    private Instant at(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(zone).toInstant();
    }

    @Test
    void lateNightNudgeExpiresAtLocalMidnight() {
        Instant sentAt = at("2026-10-31T23:50:00");

        assertThat(ReminderService.nudgeActive(sentAt, at("2026-10-31T23:59:59"), zone)).isTrue();
        assertThat(ReminderService.nudgeAvailableAt(sentAt, zone)).isEqualTo(at("2026-11-01T00:00:00"));
        assertThat(ReminderService.nudgeActive(sentAt, at("2026-11-01T00:00:00"), zone)).isFalse();
    }

    @Test
    void daytimeNudgeKeepsTheThirtyMinuteCooldown() {
        Instant sentAt = at("2026-10-31T10:00:00");

        assertThat(ReminderService.nudgeAvailableAt(sentAt, zone)).isEqualTo(at("2026-10-31T10:30:00"));
        assertThat(ReminderService.nudgeActive(sentAt, at("2026-10-31T10:29:59"), zone)).isTrue();
        assertThat(ReminderService.nudgeActive(sentAt, at("2026-10-31T10:30:00"), zone)).isFalse();
    }
}
