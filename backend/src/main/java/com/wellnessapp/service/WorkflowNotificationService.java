package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service @RequiredArgsConstructor
public class WorkflowNotificationService {
    private final UserRepository users;
    private final NotificationRepository events;
    private final PushQueueService push;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional public void notify(User recipient, PushDelivery.Kind kind, String source, String title, String body) {
        if (recipient.getStatus() != User.Status.ACTIVE) return;
        String key = source + "-to-" + recipient.getId();
        if (events.existsBySourceKey(key)) return;
        var event = events.save(NotificationEvent.builder().user(recipient).kind(kind).sourceKey(key)
                .title(title).body(body).scheduledAt(clock.instant()).build());
        push.enqueue(event, kind, clock.instant().plusSeconds(kind == PushDelivery.Kind.DIGEST ? 14400
                : kind == PushDelivery.Kind.NUDGE ? 1800 : 86400));
    }
    @Transactional public void admins(PushDelivery.Kind kind, String source, String title, String body) {
        // Admin push is intentionally centralized into the two-hour care reminder below.
    }
    /** One idempotent care prompt every two hours for active administrators. */
    @Transactional public void adminCareReminder() {
        var local = clock.instant().atZone(applicationZoneId);
        if (local.getMinute() != 0 || local.getHour() % 2 != 0) return;
        String slot = local.toLocalDate() + "-" + String.format("%02d", local.getHour());
        for (var admin : users.findByRoleAndStatusOrderByFullName(User.Role.ADMIN, User.Status.ACTIVE)) {
            users.lockById(admin.getId()).orElseThrow();
            notify(admin, PushDelivery.Kind.DIGEST, "admin-care-" + slot,
                    "Check member care", "Review Attention and send reminders to members who need support.");
        }
    }
}
