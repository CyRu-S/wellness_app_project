package com.wellnessapp.dto.mealpost;

import java.time.Instant;

public record MealPostResponse(
        Long id,
        Long plannedMealId,
        String mealType,
        String mealName,
        int calories,
        int proteinGrams,
        int carbsGrams,
        int fatGrams,
        Instant postedAt,
        String imageUrl,
        String clientRequestId
) {}
