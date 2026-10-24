package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.Set;

@Service @RequiredArgsConstructor
public class PushQueueService {
    private final PushDeviceRepository devices;
    private final PushDeliveryRepository deliveries;
    private final NotificationPreferencesRepository preferences;
    private final NotificationRepository events;
    private final Clock clock;

    public boolean allowed(Long userId, PushDelivery.Kind kind) {
        var preference = preferences.findById(userId).orElse(null);
        if (preference != null && !preference.isNotificationsEnabled()) return false;
        if (kind != PushDelivery.Kind.DIGEST) return true;
        return preference != null && preference.isDailyDigest();
    }

    public boolean customSound(Long userId) {
        return preferences.findById(userId).map(NotificationPreferences::isCustomSound).orElse(true);
    }

    /** Called in the same transaction that creates the event; never sends over the network here. */
    @Transactional
    public void enqueue(NotificationEvent event, PushDelivery.Kind kind, Instant expiresAt) {
        event.setKind(kind);
        if (event.getUser().getStatus() != User.Status.ACTIVE || !allowed(event.getUser().getId(), kind)) return;
        for (var device : devices.findByUserIdAndEnabledTrue(event.getUser().getId())) {
            enqueueForDevice(event, device, kind, expiresAt);
        }
    }

    private void enqueueForDevice(NotificationEvent event, PushDevice device, PushDelivery.Kind kind, Instant expiresAt) {
        var existing = deliveries.findByNotificationIdAndDeviceId(event.getId(), device.getId()).orElse(null);
        // A delivery belongs to the registration that existed when it was queued. Never
        // retarget it after an account/session switch; the worker safely cancels stale rows.
        if (existing != null) return;
        var row = new PushDelivery();
        row.setNotification(event); row.setDevice(device); row.setRegistrationId(device.getRegistrationId());
        row.setKind(kind); row.setStatus(PushDelivery.Status.QUEUED); row.setAttempts(0); row.setLastError(null); row.setReceiptId(null);
        row.setNextAttemptAt(event.getScheduledAt().isAfter(clock.instant()) ? event.getScheduledAt() : clock.instant());
        row.setExpiresAt(expiresAt);
        deliveries.save(row);
    }

    /** Attach reminders created shortly before a browser/device finished registering. */
    @Transactional
    public void catchUp(PushDevice device) {
        var now = clock.instant();
        for (var event : events.findByUserIdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtDesc(
                device.getUser().getId(), now.minusSeconds(3900), now.plusSeconds(1))) {
            if (event.getKind() == null || !allowed(device.getUser().getId(), event.getKind())) continue;
            var expires = event.getScheduledAt().plusSeconds(Set.of(PushDelivery.Kind.MEAL, PushDelivery.Kind.HABIT).contains(event.getKind()) ? 300 : 86400);
            if (now.isBefore(expires)) enqueueForDevice(event, device, event.getKind(), expires);
        }
    }
}
