package com.wellnessapp.service;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
@Service @RequiredArgsConstructor public class NotificationService {
    private final UserRepository users; private final NotificationRepository notifications;
    public List<NotificationEvent> list(String email) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); return notifications.findTop30ByUserIdOrderByScheduledAtDesc(user.getId()); }
}

