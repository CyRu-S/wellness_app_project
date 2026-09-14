package com.wellnessapp.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String dietaryPreferences,
        @Size(max = 30) String phone,
        @Size(max = 120) String clubName
) {}
