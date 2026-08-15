package com.wellnessapp.dto.profile;
public record ProfileResponse(Long id, String name, String email, String role, String goal, Integer heightCm, Double weightKg, String dietaryPreferences) {}

