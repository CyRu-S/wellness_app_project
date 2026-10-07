package com.wellnessapp.service;

import com.wellnessapp.entity.PushDevice;
import com.wellnessapp.repository.*;
import com.wellnessapp.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.Clock;
import java.util.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Service @RequiredArgsConstructor
public class WebPushAccountService {
    private final UserRepository users;
    private final PushDeviceRepository devices;
    private final WebPushClient web;
    private final Clock clock;
    @Value("${app.push.enabled:false}") private boolean pushEnabled;
    @Value("${app.schedulers.enabled:true}") private boolean schedulersEnabled;
    public boolean available() { return pushEnabled && schedulersEnabled && web.available(); }
    public Map<String, Object> config() { return Map.of("available", available(), "publicKey", available() ? web.publicKey() : ""); }
    public static void validateEndpoint(String endpoint) {
        try {
            var uri = URI.create(endpoint);
            var host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            boolean trusted = host.equals("fcm.googleapis.com") || host.endsWith(".push.apple.com")
                    || host.equals("updates.push.services.mozilla.com") || host.endsWith(".push.services.mozilla.com")
                    || host.endsWith(".notify.windows.com");
            if (!trusted || !"https".equals(uri.getScheme()) || uri.getUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443) || uri.getFragment() != null
                    || uri.getRawPath() == null || uri.getRawPath().length() < 2 || endpoint.length() > 2048)
                throw new IllegalArgumentException();
        } catch (Exception error) { throw new BadRequestException("Unsupported web push endpoint"); }
    }
    private static String deviceKey(String endpoint) {
        validateEndpoint(endpoint);
        try { return "web:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(endpoint.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
    private static void validateKeys(String p256dh, String auth) {
        try {
            byte[] publicKey = Base64.getUrlDecoder().decode(p256dh), secret = Base64.getUrlDecoder().decode(auth);
            if (publicKey.length != 65 || publicKey[0] != 4 || secret.length != 16) throw new IllegalArgumentException();
        } catch (Exception error) { throw new BadRequestException("Invalid web push subscription keys"); }
    }
    @Transactional public void register(String email, String endpoint, String p256dh, String auth, String registrationId) {
        if (!available()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Web notifications are not enabled on the server yet");
        var key = deviceKey(endpoint); validateKeys(p256dh, auth);
        var user = users.findByEmailIgnoreCase(email).orElseThrow(); users.lockById(user.getId()).orElseThrow();
        var row = devices.findByExpoToken(key).orElseGet(PushDevice::new);
        row.setProvider(PushDevice.Provider.WEB); row.setExpoToken(key); row.setWebEndpoint(endpoint);
        row.setWebP256dh(p256dh); row.setWebAuth(auth); row.setUser(user); row.setRegistrationId(registrationId);
        row.setEnabled(true); row.setUpdatedAt(clock.instant()); devices.save(row);
    }
    @Transactional public void unregister(String email, String endpoint, String registrationId) {
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        devices.findByExpoToken(deviceKey(endpoint)).filter(row -> row.getProvider() == PushDevice.Provider.WEB
                && row.getUser().getId().equals(user.getId()) && row.getRegistrationId().equals(registrationId))
                .ifPresent(row -> { row.setEnabled(false); row.setUpdatedAt(clock.instant()); });
    }
}
