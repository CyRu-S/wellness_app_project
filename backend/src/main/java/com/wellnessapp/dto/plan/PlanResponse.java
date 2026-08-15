package com.wellnessapp.dto.plan;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
public record PlanResponse(Long id, String title, String goal, LocalDate startDate, LocalDate endDate, List<Item> items) {
    public record Item(Long id, String type, String title, String detail, LocalTime scheduledTime, boolean completed, int sortOrder) {}
}

