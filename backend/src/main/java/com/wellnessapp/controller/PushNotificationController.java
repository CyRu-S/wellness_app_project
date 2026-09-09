package com.wellnessapp.controller;

import com.wellnessapp.service.PushAccountService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class PushNotificationController {
    private final PushAccountService accounts;
    public record DeviceRequest(
            @NotBlank @Size(max = 255) @Pattern(regexp = "(ExpoPushToken|ExponentPushToken)\\[[A-Za-z0-9_-]+\\]") String token,
            @NotBlank @Pattern(regexp = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}") String registrationId) {}
    public record PreferencesRequest(@NotNull Boolean mealReminders, @NotNull Boolean coachNudges,
            Boolean signupAlerts, Boolean deadlineAlerts, Boolean dailyDigest, Boolean memberUpdates, Boolean accountUpdates) {}
    @GetMapping("/preferences") public PushAccountService.Preferences preferences(Authentication auth) { return accounts.preferences(auth.getName()); }
    @PutMapping("/preferences") public PushAccountService.Preferences save(Authentication auth, @Valid @RequestBody PreferencesRequest body) {
        return accounts.savePreferences(auth.getName(), body.mealReminders(), body.coachNudges(),
                body.signupAlerts(), body.deadlineAlerts(), body.dailyDigest(), body.memberUpdates(), body.accountUpdates());
    }
    @PutMapping("/devices") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(Authentication auth, @Valid @RequestBody DeviceRequest body) { accounts.register(auth.getName(), body.token(), body.registrationId()); }
    @PostMapping("/devices/unregister") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(Authentication auth, @Valid @RequestBody DeviceRequest body) { accounts.unregister(auth.getName(), body.token(), body.registrationId()); }
    @PostMapping("/test") @ResponseStatus(HttpStatus.ACCEPTED)
    public void test(Authentication auth) { accounts.test(auth.getName()); }
}
