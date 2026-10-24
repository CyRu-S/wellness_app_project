package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class PushAccountService {
    private final UserRepository users;
    private final PushDeviceRepository devices;
    private final NotificationPreferencesRepository preferences;
    private final PushQueueService queue;
    private final Clock clock;
    @Value("${app.push.enabled:false}") private boolean enabled;
    @Value("${app.schedulers.enabled:true}") private boolean schedulersEnabled;
    public record Preferences(boolean mealReminders, boolean coachNudges, boolean pushAvailable,
            boolean signupAlerts, boolean deadlineAlerts, boolean dailyDigest, boolean memberUpdates, boolean accountUpdates,
            boolean customSound) {}
    private Preferences response(NotificationPreferences p) {
        return new Preferences(true, true, enabled && schedulersEnabled,
                true, true, p.isDailyDigest(), true, true, p.isCustomSound());
    }

    private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(); }
    @Transactional(readOnly = true) public Preferences preferences(String email) {
        return response(preferences.findById(user(email).getId()).orElseGet(NotificationPreferences::new));
    }
    @Transactional public Preferences savePreferences(String email, boolean meals, boolean nudges) {
        return savePreferences(email, meals, nudges, null, null, null, null, null);
    }
    @Transactional public Preferences savePreferences(String email, boolean meals, boolean nudges,
            Boolean signup, Boolean deadline, Boolean digest, Boolean updates, Boolean account) {
        return savePreferences(email, meals, nudges, signup, deadline, digest, updates, account, null);
    }
    @Transactional public Preferences savePreferences(String email, boolean meals, boolean nudges,
            Boolean signup, Boolean deadline, Boolean digest, Boolean updates, Boolean account, Boolean customSound) {
        var user = user(email); users.lockById(user.getId()).orElseThrow();
        var row = preferences.findById(user.getId()).orElseGet(() -> { var p = new NotificationPreferences(); p.setUser(user); return p; });
        row.setMealReminders(true); row.setCoachNudges(true);
        row.setSignupAlerts(true);
        row.setDeadlineAlerts(true);
        if (digest != null) row.setDailyDigest(digest);
        row.setMemberUpdates(true);
        row.setAccountUpdates(true);
        if (customSound != null) row.setCustomSound(customSound);
        preferences.save(row);
        return response(row);
    }
    @Transactional public void register(String email, String token, String registrationId) {
        var user = user(email); users.lockById(user.getId()).orElseThrow();
        var row = devices.findByExpoToken(token).orElseGet(PushDevice::new);
        row.setUser(user); row.setExpoToken(token); row.setRegistrationId(registrationId);
        row.setProvider(PushDevice.Provider.EXPO); row.setEnabled(true); row.setUpdatedAt(clock.instant()); row = devices.save(row);
        queue.catchUp(row);
    }
    @Transactional public void unregister(String email, String token, String registrationId) {
        var user = user(email);
        devices.findByExpoToken(token).filter(d -> Objects.equals(d.getUser().getId(), user.getId()) && d.getRegistrationId().equals(registrationId))
                .ifPresent(d -> { d.setEnabled(false); d.setUpdatedAt(clock.instant()); });
    }
}
