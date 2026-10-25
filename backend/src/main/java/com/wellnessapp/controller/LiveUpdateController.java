package com.wellnessapp.controller;

import com.wellnessapp.service.LiveUpdateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController @RequiredArgsConstructor
public class LiveUpdateController {
    private final LiveUpdateService updates;

    @GetMapping(value = "/api/live/updates", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    ResponseEntity<SseEmitter> subscribe(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Accel-Buffering", "no")
                .body(updates.subscribe(authentication.getName()));
    }
}
