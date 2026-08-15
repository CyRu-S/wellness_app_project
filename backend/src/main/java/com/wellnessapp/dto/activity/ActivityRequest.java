package com.wellnessapp.dto.activity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
public record ActivityRequest(@NotBlank String activity, @Positive int durationSeconds, Double distanceKm) {}

