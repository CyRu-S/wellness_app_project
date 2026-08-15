package com.wellnessapp.controller;
import com.wellnessapp.entity.NotificationEvent;
import com.wellnessapp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor public class NotificationController {
    private final NotificationService notifications;
    record NotificationResponse(Long id, String title, String body, boolean read, Instant scheduledAt) {}
    @GetMapping List<NotificationResponse> list(Authentication authentication) { return notifications.list(authentication.getName()).stream().map(item -> new NotificationResponse(item.getId(), item.getTitle(), item.getBody(), item.isRead(), item.getScheduledAt())).toList(); }
}

