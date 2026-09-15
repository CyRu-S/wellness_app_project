package com.wellnessapp.service;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;
@Service @RequiredArgsConstructor public class NotificationService {
    private final UserRepository users; private final NotificationRepository notifications;
    private final Clock clock; private final ZoneId applicationZoneId;

    @Transactional
    public List<NotificationEvent> list(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        if (user.getRole() != User.Role.ADMIN) return notifications.findTop30ByUserIdOrderByScheduledAtDesc(user.getId());
        Instant start = todayStart();
        notifications.deleteByUserRoleAndScheduledAtBefore(User.Role.ADMIN, start);
        return notifications.findByUserIdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtDesc(
                user.getId(), start, start.plus(Duration.ofDays(1)));
    }

    @Transactional
    public int removeExpiredAdminNotifications() {
        return notifications.deleteByUserRoleAndScheduledAtBefore(User.Role.ADMIN, todayStart());
    }

    public void markRead(String email, Long id) {
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        var event = notifications.findById(id).filter(n -> n.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new com.wellnessapp.exception.NotFoundException("Notification not found"));
        event.setRead(true);
    }

    private Instant todayStart() {
        return LocalDate.now(clock.withZone(applicationZoneId)).atStartOfDay(applicationZoneId).toInstant();
    }
}

