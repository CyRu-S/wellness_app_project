package com.wellnessapp.dto.auth;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record RegisterRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(120) Integer age,
        @jakarta.validation.constraints.Min(100) @jakarta.validation.constraints.Max(250) Integer heightCm,
        @jakarta.validation.constraints.DecimalMin("25") @jakarta.validation.constraints.DecimalMax("350") Double weightKg,
        @Size(max = 500) String goal,
        @Size(max = 500) String notes
) {}

