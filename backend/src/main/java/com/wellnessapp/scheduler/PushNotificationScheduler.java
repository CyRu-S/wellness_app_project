package com.wellnessapp.scheduler;

import com.wellnessapp.service.PushDeliveryWorker;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
@ConditionalOnProperty(name = {"app.push.enabled", "app.schedulers.enabled"}, havingValue = "true")
public class PushNotificationScheduler {
    private final PushDeliveryWorker worker;
    @Scheduled(fixedDelayString = "${app.push.poll-ms:5000}")
    public void deliver() { worker.sendPending(); worker.checkReceipts(); }
}
