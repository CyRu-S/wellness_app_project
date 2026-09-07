package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Clock;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class PushAccountService {
    private final UserRepository users;
    private final PushDeviceRepository devices;
    private final NotificationPreferencesRepository preferences;
    private final NotificationRepository events;
    private final PushQueueService queue;
    private final Clock clock;
    @Value("${app.push.enabled:false}") private boolean enabled;
    @Value("${app.schedulers.enabled:true}") private boolean schedulersEnabled;
    public record Preferences(boolean mealReminders, boolean coachNudges, boolean pushAvailable) {}

    private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(); }
    @Transactional(readOnly = true) public Preferences preferences(String email) {
        return preferences.findById(user(email).getId()).map(p -> new Preferences(p.isMealReminders(), p.isCoachNudges(), enabled && schedulersEnabled))
                .orElse(new Preferences(true, true, enabled && schedulersEnabled));
    }
    @Transactional public Preferences savePreferences(String email, boolean meals, boolean nudges) {
        var user = user(email); users.lockById(user.getId()).orElseThrow();
        var row = preferences.findById(user.getId()).orElseGet(() -> { var p = new NotificationPreferences(); p.setUser(user); return p; });
        row.setMealReminders(meals); row.setCoachNudges(nudges); preferences.save(row);
        return new Preferences(meals, nudges, enabled && schedulersEnabled);
    }
    @Transactional public void register(String email, String token, String registrationId) {
        var user = user(email); users.lockById(user.getId()).orElseThrow();
        var row = devices.findByExpoToken(token).orElseGet(PushDevice::new);
        row.setUser(user); row.setExpoToken(token); row.setRegistrationId(registrationId);
        row.setEnabled(true); row.setUpdatedAt(clock.instant()); devices.save(row);
    }
    @Transactional public void unregister(String email, String token, String registrationId) {
        var user = user(email);
        devices.findByExpoToken(token).filter(d -> Objects.equals(d.getUser().getId(), user.getId()) && d.getRegistrationId().equals(registrationId))
                .ifPresent(d -> { d.setEnabled(false); d.setUpdatedAt(clock.instant()); });
    }
    @Transactional public void test(String email) {
        var user = user(email); users.lockById(user.getId()).orElseThrow();
        if (!enabled) throw new ResponseStatusException(HttpStatus.CONFLICT, "Push delivery is not configured on the backend yet");
        if (devices.findByUserIdAndEnabledTrue(user.getId()).isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Enable notifications on your Android phone first");
        String key = "push-test-" + user.getId() + "-" + clock.instant().getEpochSecond() / 60;
        if (events.existsBySourceKey(key)) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait a minute before another test");
        var event = events.save(NotificationEvent.builder().user(user).title("Mr_Care notifications")
                .body("Phone notifications are connected.").sourceKey(key).scheduledAt(clock.instant()).build());
        queue.enqueue(event, PushDelivery.Kind.TEST, clock.instant().plusSeconds(300));
    }
}
