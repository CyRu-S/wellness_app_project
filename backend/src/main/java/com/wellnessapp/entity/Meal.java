package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "meals")
public class Meal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 30) private String type;
    @Column(nullable = false, length = 160) private String name;
    @Column(name = "meal_date", nullable = false) private LocalDate mealDate;
    @Column(name = "meal_time", nullable = false) private LocalTime mealTime;
    @Column(nullable = false) private int calories;
    @Column(name = "protein_grams", nullable = false) private int proteinGrams;
    @Column(nullable = false) private boolean consumed;
}

