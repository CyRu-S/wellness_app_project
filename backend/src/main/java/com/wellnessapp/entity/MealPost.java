package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "meal_posts", uniqueConstraints = {
        @UniqueConstraint(name = "uq_meal_post_user_request", columnNames = {"user_id", "client_request_id"}),
        @UniqueConstraint(name = "uq_meal_post_planned_meal", columnNames = {"planned_meal_id"})
})
public class MealPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "planned_meal_id")
    private Meal plannedMeal;

    @Column(name = "meal_type", nullable = false, length = 40)
    private String mealType;
    @Column(name = "meal_name", nullable = false, length = 160)
    private String mealName;
    @Column(nullable = false) private int calories;
    @Column(name = "protein_grams", nullable = false) private int proteinGrams;
    @Column(name = "carbs_grams", nullable = false) private int carbsGrams;
    @Column(name = "fat_grams", nullable = false) private int fatGrams;
    @Column(name = "posted_at", nullable = false) private Instant postedAt;
    @Column(name = "media_key", nullable = false, unique = true) private String mediaKey;
    @Column(name = "media_original_name") private String mediaOriginalName;
    @Column(name = "media_content_type", nullable = false, length = 80) private String mediaContentType;
    @Column(name = "media_size", nullable = false) private long mediaSize;
    @Column(name = "client_request_id", nullable = false, length = 100) private String clientRequestId;
}
