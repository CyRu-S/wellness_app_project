package com.wellnessapp.entity;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "meals")
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;
    @Column(nullable = false, length = 30)
    private String type;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(name = "meal_date", nullable = false)
    private LocalDate mealDate;
    @Column(name = "meal_time", nullable = false)
    private LocalTime mealTime;
    @Column(nullable = false)
    private int calories;
    @Column(name = "protein_grams", nullable = false)
    private int proteinGrams;
    @Column(nullable = false)
    private boolean consumed;
    @ManyToOne @JoinColumn(name = "plan_item_id")
    private PlanItem planItem;
}
