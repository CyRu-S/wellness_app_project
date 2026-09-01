package com.wellnessapp.dto.mealpost;

import jakarta.validation.constraints.*;

public record CreateMealPostRequest(
        Long plannedMealId,
        @NotBlank @Size(max = 40) String mealType,
        @NotBlank @Size(max = 160) String mealName,
        @NotNull @Min(0) @Max(10000) Integer calories,
        @NotNull @Min(0) @Max(1000) Integer proteinGrams,
        @NotNull @Min(0) @Max(2000) Integer carbsGrams,
        @NotNull @Min(0) @Max(1000) Integer fatGrams,
        @NotBlank @Size(max = 100) String clientRequestId
) {}
