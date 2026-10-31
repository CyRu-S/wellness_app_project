package com.wellnessapp.dto.access;

import jakarta.validation.constraints.NotNull;

public record UpdateCoachPlanPermissionRequest(@NotNull Boolean canAssignPlans) {}
