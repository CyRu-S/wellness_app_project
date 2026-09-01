package com.wellnessapp.dto.profile;

import jakarta.validation.constraints.*;

public record BodyMetricsRequest(
        @NotNull @Min(100) @Max(250) Integer heightCm,
        @NotNull @DecimalMin("25.0") @DecimalMax("350.0") Double weightKg,
        @NotNull @DecimalMin("40.0") @DecimalMax("250.0") Double waistCm,
        @NotNull @DecimalMin("3.0") @DecimalMax("70.0") Double bodyFatPercent
) {}
