package com.wellnessapp.scheduler;

import com.wellnessapp.service.PushDeliveryWorker;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
@ConditionalOnProperty(name = "app.schedulers.enabled", havingValue = "true", matchIfMissing = true)
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("${app.push.enabled:false} or ${app.web-push.enabled:false}")
public class PushNotificationScheduler {
    private final PushDeliveryWorker worker;
    @org.springframework.beans.factory.annotation.Value("${app.push.enabled:false}") private boolean expoEnabled;
    @org.springframework.beans.factory.annotation.Value("${app.web-push.enabled:false}") private boolean webEnabled;
    @Scheduled(fixedDelayString = "${app.push.poll-ms:5000}", scheduler = "pushTaskScheduler")
    public void deliverExpo() { if (expoEnabled) worker.sendExpoPending(); }
    @Scheduled(fixedDelayString = "${app.push.poll-ms:5000}", scheduler = "pushTaskScheduler")
    public void deliverWeb() { if (webEnabled) worker.sendWebPending(); }
    @Scheduled(fixedDelayString = "${app.push.receipt-poll-ms:60000}", scheduler = "taskScheduler")
    public void receipts() { if (expoEnabled) worker.checkReceipts(); }
}
