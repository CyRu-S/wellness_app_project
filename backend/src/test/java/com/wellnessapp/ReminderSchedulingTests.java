package com.wellnessapp;

import com.wellnessapp.config.ReminderSchedulingConfig;
import com.wellnessapp.scheduler.PushNotificationScheduler;
import com.wellnessapp.service.PushDeliveryWorker;
import com.wellnessapp.service.WebPushAccountService;
import com.wellnessapp.service.WebPushClient;
import com.wellnessapp.service.PushQueueService;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.repository.PushDeviceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReminderSchedulingTests {
    @Test void pwaRegistrationDoesNotDependOnTheNativePushFlag() {
        var client = mock(WebPushClient.class);
        when(client.available()).thenReturn(true);
        var accounts = new WebPushAccountService(mock(UserRepository.class), mock(PushDeviceRepository.class), client,
                mock(PushQueueService.class), java.time.Clock.systemUTC());
        org.springframework.test.util.ReflectionTestUtils.setField(accounts, "schedulersEnabled", true);
        assertThat(accounts.available()).isTrue();
    }
    @Test void slowWebDeliveryCannotBlockExpoOrReminderGeneration() throws Exception {
        var config = new ReminderSchedulingConfig();
        var pushes = config.pushTaskScheduler(); var reminders = config.reminderTaskScheduler();
        pushes.initialize(); reminders.initialize();
        var blocked = new CountDownLatch(1); var release = new CountDownLatch(1);
        var expoRan = new CountDownLatch(1); var reminderRan = new CountDownLatch(1);
        try {
            pushes.execute(() -> { blocked.countDown(); try { release.await(5, TimeUnit.SECONDS); }
                catch (InterruptedException error) { Thread.currentThread().interrupt(); } });
            assertThat(blocked.await(2, TimeUnit.SECONDS)).isTrue();
            pushes.execute(expoRan::countDown);
            reminders.execute(reminderRan::countDown);
            assertThat(expoRan.await(2, TimeUnit.SECONDS)).isTrue();
            assertThat(reminderRan.await(2, TimeUnit.SECONDS)).isTrue();
        } finally { release.countDown(); pushes.shutdown(); reminders.shutdown(); }
    }

    @Test void pwaPushWorksWhenNativeExpoPushIsDisabled() {
        var worker = mock(PushDeliveryWorker.class);
        new ApplicationContextRunner().withUserConfiguration(PushNotificationScheduler.class)
                .withBean(PushDeliveryWorker.class, () -> worker)
                .withPropertyValues("app.schedulers.enabled=true", "app.push.enabled=false", "app.web-push.enabled=true")
                .run(context -> {
                    assertThat(context).hasSingleBean(PushNotificationScheduler.class);
                    var scheduler = context.getBean(PushNotificationScheduler.class);
                    scheduler.deliverExpo(); scheduler.deliverWeb(); scheduler.receipts();
                    verify(worker).sendWebPending();
                    verify(worker, never()).sendExpoPending();
                    verify(worker, never()).checkReceipts();
                });
    }

    @Test void nativeOnlyBackendsDoNotRunTheBrowserQueue() {
        var worker = mock(PushDeliveryWorker.class);
        new ApplicationContextRunner().withUserConfiguration(PushNotificationScheduler.class)
                .withBean(PushDeliveryWorker.class, () -> worker)
                .withPropertyValues("app.schedulers.enabled=true", "app.push.enabled=true", "app.web-push.enabled=false")
                .run(context -> {
                    var scheduler = context.getBean(PushNotificationScheduler.class);
                    scheduler.deliverExpo(); scheduler.deliverWeb();
                    verify(worker).sendExpoPending();
                    verify(worker, never()).sendWebPending();
                });
    }
}
