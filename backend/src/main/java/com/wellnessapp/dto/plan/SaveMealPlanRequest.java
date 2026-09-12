package com.wellnessapp.dto.plan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalTime;
import java.util.List;

public record SaveMealPlanRequest(@NotBlank @Size(max = 120) String planName,
        @NotEmpty @Size(max = 24) List<@Valid Item> items) {
    public record Item(@NotBlank @Size(max = 30) String type, @NotBlank @Size(max = 160) String name,
            @NotNull LocalTime time, @Min(0) @Max(10000) int calories,
            @Min(0) @Max(1000) int protein, @Size(max = 40) List<@NotBlank @Size(max = 160) String> ingredients) {}
}
