package com.wellnessapp.dto.meal;
import java.time.LocalTime;
import java.util.List;
public record MealResponse(Long id, String type, String name, LocalTime time, int calories, int proteinGrams, boolean consumed, List<String> ingredients) {}

