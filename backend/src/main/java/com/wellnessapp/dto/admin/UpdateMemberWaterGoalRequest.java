package com.wellnessapp.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberWaterGoalRequest(
        @NotNull @Min(500) @Max(6000) Integer waterGoalMl
) {}
