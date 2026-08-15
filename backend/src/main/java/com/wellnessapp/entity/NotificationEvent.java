package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "notification_events")
public class NotificationEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 500) private String body;
    @Column(name = "read_flag", nullable = false) private boolean read;
    @Column(name = "scheduled_at", nullable = false) private Instant scheduledAt;
}

