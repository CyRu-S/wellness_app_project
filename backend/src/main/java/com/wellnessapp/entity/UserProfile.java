package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "user_profiles")
public class UserProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(optional = false) @JoinColumn(name = "user_id", unique = true) private User user;
    @Column(length = 500) private String goal;
    @Column(name = "date_of_birth") private LocalDate dateOfBirth;
    @Column(name = "height_cm") private Integer heightCm;
    @Column(name = "weight_kg") private Double weightKg;
    @Column(name = "dietary_preferences", length = 500) private String dietaryPreferences;
}

