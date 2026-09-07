package com.wellnessapp.dto.activity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
public record ActivityRequest(@NotBlank @jakarta.validation.constraints.Size(max = 80) String activity,
        @Positive @jakarta.validation.constraints.Max(86400) int durationSeconds,
        @jakarta.validation.constraints.DecimalMin("0") @jakarta.validation.constraints.DecimalMax("1000") Double distanceKm) {}

