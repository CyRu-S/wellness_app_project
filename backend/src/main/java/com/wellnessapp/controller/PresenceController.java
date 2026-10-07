package com.wellnessapp.controller;

import com.wellnessapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.Clock;

@RestController @RequestMapping("/api/presence") @RequiredArgsConstructor
public class PresenceController {
    private final UserRepository users;
    private final Clock clock;

    @PostMapping @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void heartbeat(Authentication authentication) {
        users.recordPresence(authentication.getName(), clock.instant());
    }
}
