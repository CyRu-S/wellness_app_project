package com.wellnessapp.scheduler;

import com.wellnessapp.service.MealPostRetentionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.schedulers.enabled", havingValue = "true", matchIfMissing = true)
public class MealPostRetentionScheduler {
    private final MealPostRetentionService retention;
    private final com.wellnessapp.service.TransientRecordRetentionService transientRecords;

    @Scheduled(
            cron = "${app.meal-post.retention-cron:0 20 0 * * *}",
            zone = "${app.time-zone:Asia/Kolkata}")
    public void removeExpiredMealPosts() {
        int removed = retention.removeExpiredPosts();
        if (removed > 0) log.info("Removed {} expired meal posts and their stored media", removed);
        int expired = transientRecords.removeExpiredTransientRecords();
        if (expired > 0) log.info("Removed {} expired verification codes and push delivery records", expired);
    }
}
