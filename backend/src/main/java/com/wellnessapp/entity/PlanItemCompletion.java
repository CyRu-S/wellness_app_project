package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "plan_item_completions", uniqueConstraints =
        @UniqueConstraint(name = "uq_plan_item_completion_day", columnNames = {"plan_item_id", "user_id", "completed_date"}))
public class PlanItemCompletion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "plan_item_id") private PlanItem planItem;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(name = "completed_date", nullable = false) private LocalDate completedDate;
    @Column(name = "completed_at", nullable = false) private Instant completedAt;
}
