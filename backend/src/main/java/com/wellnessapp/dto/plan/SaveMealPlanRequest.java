package com.wellnessapp.dto.plan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalTime;
import java.util.List;

public record SaveMealPlanRequest(@NotBlank @Size(max = 120) String planName,
        @NotNull @Size(max = 24) List<@Valid Item> items) {
    public record Item(@NotBlank @Size(max = 30) String type, @NotBlank @Size(max = 160) String name,
            @NotNull LocalTime time, @Min(0) @Max(10000) int calories,
            @Min(0) @Max(1000) int protein, @Size(max = 40) List<@NotBlank @Size(max = 160) String> ingredients,
            @Positive Long id, @Size(max = 30) String kind, @Size(max = 40) String category) {
        public Item(String type, String name, LocalTime time, int calories, int protein, List<String> ingredients, Long id) {
            this(type, name, time, calories, protein, ingredients, id, null, null);
        }
    }
}
