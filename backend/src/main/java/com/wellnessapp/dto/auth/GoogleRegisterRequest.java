package com.wellnessapp.dto.auth;

import jakarta.validation.constraints.*;

public record GoogleRegisterRequest(
        @NotBlank String idToken,
        @Min(1) @Max(120) Integer age,
        @Min(100) @Max(250) Integer heightCm,
        @DecimalMin("25") @DecimalMax("350") Double weightKg,
        @Size(max = 500) String goal,
        @Size(max = 500) String notes
) {}
