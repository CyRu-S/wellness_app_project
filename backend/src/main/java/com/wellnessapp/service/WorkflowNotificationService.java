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
    private final MissedEventRepository missed;
    private final PushQueueService push;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional public void notify(User recipient, PushDelivery.Kind kind, String source, String title, String body) {
        if (recipient.getStatus() != User.Status.ACTIVE) return;
        String key = source + "-to-" + recipient.getId();
        if (events.existsBySourceKey(key)) return;
        var event = events.save(NotificationEvent.builder().user(recipient).kind(kind).sourceKey(key)
                .title(title).body(body).scheduledAt(clock.instant()).build());
        push.enqueue(event, kind, clock.instant().plusSeconds(kind == PushDelivery.Kind.DIGEST ? 14400 : 86400));
    }
    @Transactional public void admins(PushDelivery.Kind kind, String source, String title, String body) {
        for (var admin : users.findByRoleAndStatusOrderByFullName(User.Role.ADMIN, User.Status.ACTIVE)) notify(admin, kind, source, title, body);
    }
    /** No historical catch-up: one optional summary during today's 08:00–09:00 application-time window. */
    @Transactional public void morningDigest() {
        var local = clock.instant().atZone(applicationZoneId);
        if (local.getHour() != 8) return;
        String body = users.countByStatus(User.Status.PENDING) + " signup requests awaiting review; "
                + missed.countByResolvedFalse() + " unresolved attention items.";
        for (var admin : users.findByRoleAndStatusOrderByFullName(User.Role.ADMIN, User.Status.ACTIVE)) {
            users.lockById(admin.getId()).orElseThrow();
            if (push.allowed(admin.getId(), PushDelivery.Kind.DIGEST)) notify(admin, PushDelivery.Kind.DIGEST,
                    "digest-" + local.toLocalDate(), "Morning club summary", body);
        }
    }
}
