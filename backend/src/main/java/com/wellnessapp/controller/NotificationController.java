package com.wellnessapp.controller;
import java.time.Instant;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.wellnessapp.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    record NotificationResponse(Long id, String title, String body, boolean read, Instant scheduledAt, String kind) {

    }
    @GetMapping
    List<NotificationResponse> list(Authentication authentication) {
        return notifications.list(authentication
            .getName())
            .stream()
            .map(item -> new NotificationResponse(item.getId(),
            item.getTitle(),
            item.getBody(),
            item.isRead(),
            item.getScheduledAt(),
            item.getKind() == null ? null : item.getKind().name())).toList();
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void read(Authentication authentication, @PathVariable Long id) {
        notifications.markRead(authentication.getName(), id);
    }

    record ReadRequest(@jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max = 30)
            List<@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long> ids) {}

    @PatchMapping("/read")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void readInbox(Authentication authentication, @jakarta.validation.Valid @RequestBody ReadRequest request) {
        notifications.markRead(authentication.getName(), request.ids());
    }
}

