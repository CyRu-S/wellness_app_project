package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "health_profile_history")
public class HealthProfileHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(name = "height_cm") private Integer heightCm;
    @Column(name = "weight_kg") private Double weightKg;
    private Integer age;
    @Column(name = "body_fat_percent") private Double bodyFatPercent;
    @Column(name = "dietary_preferences", length = 500) private String dietaryPreferences;
    @Column(name = "recorded_at", nullable = false) private Instant recordedAt;
}
