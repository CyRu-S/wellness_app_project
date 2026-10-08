package com.wellnessapp.service;

import com.wellnessapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @Transactional
class TransientRecordRetentionTests {
    @Autowired JdbcTemplate database;
    @Autowired UserRepository users;
    @Autowired TransientRecordRetentionService retention;

    @Test void removesOnlyExpiredCodesAndKeepsActiveAndRecentlyExpiredRecords() {
        long userId = users.findByEmailIgnoreCase("admin@mr-care.app").orElseThrow().getId();
        var now = Instant.now();
        for (var table : new String[]{"password_reset_otps", "email_verification_otps"}) {
            for (var expiry : new Instant[]{now.minusSeconds(8 * 86400), now.minusSeconds(86400), now.plusSeconds(600)})
                database.update("INSERT INTO " + table + " (user_id, code_hash, expires_at) VALUES (?, ?, ?)", userId, "test-only", expiry);
        }
        long before = users.count();
        assertThat(retention.removeExpiredTransientRecords()).isEqualTo(2);
        assertThat(database.queryForObject("SELECT COUNT(*) FROM password_reset_otps", Long.class)).isEqualTo(2);
        assertThat(database.queryForObject("SELECT COUNT(*) FROM email_verification_otps", Long.class)).isEqualTo(2);
        assertThat(users.count()).isEqualTo(before);
    }
}
