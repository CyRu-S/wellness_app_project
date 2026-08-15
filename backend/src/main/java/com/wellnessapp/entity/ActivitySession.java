package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "activity_sessions")
public class ActivitySession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 80) private String activity;
    @Column(name = "duration_seconds", nullable = false) private int durationSeconds;
    @Column(name = "distance_km") private Double distanceKm;
    @Column(name = "started_at", nullable = false) private Instant startedAt;
}

