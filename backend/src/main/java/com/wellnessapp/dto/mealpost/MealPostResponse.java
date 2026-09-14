package com.wellnessapp.dto.mealpost;

import java.time.Instant;
import java.math.BigDecimal;

public record MealPostResponse(
        Long id,
        Long plannedMealId,
        String mealType,
        String mealName,
        BigDecimal calories,
        BigDecimal proteinGrams,
        BigDecimal carbsGrams,
        BigDecimal fatGrams,
        Instant postedAt,
        String imageUrl,
        String clientRequestId
) {}
