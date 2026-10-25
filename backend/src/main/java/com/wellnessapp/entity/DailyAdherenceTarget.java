package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name = "daily_adherence_targets", uniqueConstraints =
        @UniqueConstraint(name = "uq_daily_adherence_user_date", columnNames = {"user_id", "target_date"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DailyAdherenceTarget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @Column(name = "target_date", nullable = false) private LocalDate targetDate;
    @Column(name = "water_goal_ml", nullable = false) private int waterGoalMl;
    @Column(name = "habit_targets", nullable = false, columnDefinition = "text") private String habitTargets;
}
