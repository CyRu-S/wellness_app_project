package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "meal_items")
public class MealItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "meal_id") private Meal meal;
    @Column(nullable = false, length = 160) private String name;
    @Column(nullable = false, length = 80) private String quantity;
}

