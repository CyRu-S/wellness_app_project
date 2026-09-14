package com.wellnessapp.dto.mealpost;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateMealPostRequest(
        Long plannedMealId,
        @NotBlank @Size(max = 40) String mealType,
        @NotBlank @Size(max = 160) String mealName,
        @NotNull @DecimalMin("0") @DecimalMax("10000") @Digits(integer = 5, fraction = 4) BigDecimal calories,
        @NotNull @DecimalMin("0") @DecimalMax("1000") @Digits(integer = 5, fraction = 4) BigDecimal proteinGrams,
        @NotNull @DecimalMin("0") @DecimalMax("2000") @Digits(integer = 5, fraction = 4) BigDecimal carbsGrams,
        @NotNull @DecimalMin("0") @DecimalMax("1000") @Digits(integer = 5, fraction = 4) BigDecimal fatGrams,
        @NotBlank @Size(max = 100) String clientRequestId
) {}
