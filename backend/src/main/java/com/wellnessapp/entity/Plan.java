package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "plans")
public class Plan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 120) private String title;
    @Column(nullable = false, length = 500) private String goal;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "end_date", nullable = false) private LocalDate endDate;
    @Column(nullable = false) private boolean active;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assigned_by_user_id") private User assignedBy;
    @Builder.Default @Column(name = "z_drink_active", nullable = false) private boolean zDrinkActive = false;
    @Column(name = "previous_plan_snapshot", columnDefinition = "text") private String previousPlanSnapshot;
}

