package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "plan_items")
public class PlanItem {
    public enum Type { MEAL, ACTIVITY, HYDRATION, MINDFULNESS }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "plan_id") private Plan plan;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private Type type;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 500) private String detail;
    @Column(name = "scheduled_time") private LocalTime scheduledTime;
    @Column(nullable = false) private boolean completed;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
}

