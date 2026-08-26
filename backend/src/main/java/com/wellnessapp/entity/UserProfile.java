package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "user_profiles")
public class UserProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(optional = false) @JoinColumn(name = "user_id", unique = true) private User user;
    @Column(length = 500) private String goal;
    @Column(name = "date_of_birth") private LocalDate dateOfBirth;
    @Column(name = "height_cm") private Integer heightCm;
    @Column(name = "weight_kg") private Double weightKg;
    @Column(name = "waist_cm") private Double waistCm;
    @Column(name = "body_fat_percent") private Double bodyFatPercent;
    @Column(name = "last_body_metrics_updated_at") private Instant lastBodyMetricsUpdatedAt;
    @Column(name = "dietary_preferences", length = 500) private String dietaryPreferences;
    @Builder.Default
    @Column(name = "water_goal_ml", nullable = false) private Integer waterGoalMl = 2000;
}

