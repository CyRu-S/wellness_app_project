package com.wellnessapp.dto.profile;

import java.time.Instant;

public record ProfileResponse(
        Long id,
        String name,
        String email,
        String role,
        String goal,
        Integer heightCm,
        Double weightKg,
        String dietaryPreferences,
        Double waistCm,
        Double bodyFatPercent,
        Instant lastBodyMetricsUpdatedAt,
        Integer waterGoalMl
) {}

