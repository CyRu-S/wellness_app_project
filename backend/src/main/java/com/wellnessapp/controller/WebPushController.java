package com.wellnessapp.controller;

import com.wellnessapp.service.WebPushAccountService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Map;

@RestController @RequestMapping("/api/notifications/web") @RequiredArgsConstructor
public class WebPushController {
    private final WebPushAccountService web;
    public record SubscriptionRequest(@NotBlank @Size(max = 2048) String endpoint,
            @NotBlank @Size(max = 128) String p256dh, @NotBlank @Size(max = 64) String auth,
            @NotBlank @Pattern(regexp = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}") String registrationId) {}
    public record UnregisterRequest(@NotBlank @Size(max = 2048) String endpoint,
            @NotBlank @Pattern(regexp = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}") String registrationId) {}
    @GetMapping("/config") public Map<String, Object> config() { return web.config(); }
    @PutMapping("/subscriptions") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(Authentication auth, @Valid @RequestBody SubscriptionRequest request) {
        web.register(auth.getName(), request.endpoint(), request.p256dh(), request.auth(), request.registrationId());
    }
    @PostMapping("/subscriptions/unregister") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(Authentication auth, @Valid @RequestBody UnregisterRequest request) {
        web.unregister(auth.getName(), request.endpoint(), request.registrationId());
    }
}
