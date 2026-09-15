package com.wellnessapp.scheduler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.schedulers.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j @Component @lombok.RequiredArgsConstructor public class ReminderScheduler {
    private final com.wellnessapp.service.ReminderService reminders;
    private final com.wellnessapp.service.WorkflowNotificationService notices;
    private final com.wellnessapp.service.NotificationService notifications;
    @Scheduled(cron = "0 * * * * *") public void queueDueReminders() {
        notifications.removeExpiredAdminNotifications();
        reminders.refresh();
        notices.morningDigest();
    }
}

