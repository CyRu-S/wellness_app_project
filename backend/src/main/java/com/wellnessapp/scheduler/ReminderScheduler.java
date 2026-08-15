package com.wellnessapp.scheduler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Slf4j @Component public class ReminderScheduler {
    @Scheduled(cron = "0 */15 * * * *") public void queueDueReminders() { log.debug("Checking for due wellness reminders"); }
}

