package com.wellnessapp.dto.profile;

import jakarta.validation.constraints.*;

public record BodyMetricsRequest(
        @NotNull @Min(100) @Max(250) Integer heightCm,
        @NotNull @DecimalMin("25.0") @DecimalMax("350.0") Double weightKg,
        @NotNull @Min(1) @Max(120) Integer age,
        @DecimalMin("3.0") @DecimalMax("70.0") Double bodyFatPercent
) {}
