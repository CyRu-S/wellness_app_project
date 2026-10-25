package com.wellnessapp.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
@ConditionalOnProperty(name = "app.schedulers.enabled", havingValue = "true", matchIfMissing = true)
public class ReminderSchedulingConfig {
    @Bean public ThreadPoolTaskScheduler taskScheduler() { return scheduler("maintenance-", 1); }
    @Bean public ThreadPoolTaskScheduler reminderTaskScheduler() { return scheduler("reminder-", 1); }
    @Bean public ThreadPoolTaskScheduler pushTaskScheduler() { return scheduler("push-", 2); }

    private ThreadPoolTaskScheduler scheduler(String prefix, int size) {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setThreadNamePrefix(prefix);
        scheduler.setPoolSize(size);
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
