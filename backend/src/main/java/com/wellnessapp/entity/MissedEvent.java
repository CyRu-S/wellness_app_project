package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "missed_events")
public class MissedEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(name = "item_type", nullable = false, length = 40) private String itemType;
    @Column(name = "item_title", nullable = false, length = 160) private String itemTitle;
    @Column(name = "missed_at", nullable = false) private Instant missedAt;
    @Column(nullable = false) private boolean resolved;
}

