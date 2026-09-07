package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service @RequiredArgsConstructor
public class PushQueueService {
    private final PushDeviceRepository devices;
    private final PushDeliveryRepository deliveries;
    private final NotificationPreferencesRepository preferences;
    private final Clock clock;

    public boolean allowed(Long userId, PushDelivery.Kind kind) {
        return preferences.findById(userId).map(p -> switch (kind) {
            case MEAL -> p.isMealReminders(); case NUDGE -> p.isCoachNudges(); case TEST -> true;
        }).orElse(true);
    }

    /** Called in the same transaction that creates the event; never sends over the network here. */
    @Transactional
    public void enqueue(NotificationEvent event, PushDelivery.Kind kind, Instant expiresAt) {
        if (event.getUser().getStatus() != User.Status.ACTIVE || !allowed(event.getUser().getId(), kind)) return;
        for (var device : devices.findByUserIdAndEnabledTrue(event.getUser().getId())) {
            var row = new PushDelivery();
            row.setNotification(event); row.setDevice(device); row.setRegistrationId(device.getRegistrationId());
            row.setKind(kind); row.setStatus(PushDelivery.Status.QUEUED);
            row.setNextAttemptAt(clock.instant()); row.setExpiresAt(expiresAt);
            deliveries.save(row);
        }
    }
}
