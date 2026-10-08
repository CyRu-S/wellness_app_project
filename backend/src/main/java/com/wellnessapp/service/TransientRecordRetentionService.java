package com.wellnessapp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Duration;

/** Keep a seven-day diagnostic window after expiry; retain all member history and inbox entries. */
@Service @RequiredArgsConstructor
public class TransientRecordRetentionService {
    private final JdbcTemplate database;
    private final Clock clock;

    @Transactional
    public int removeExpiredTransientRecords() {
        var cutoff = clock.instant().minus(Duration.ofDays(7));
        int removed = database.update("DELETE FROM password_reset_otps WHERE expires_at < ?", cutoff);
        removed += database.update("DELETE FROM email_verification_otps WHERE expires_at < ?", cutoff);
        removed += database.update("DELETE FROM push_deliveries WHERE expires_at < ?", cutoff);
        return removed;
    }
}
