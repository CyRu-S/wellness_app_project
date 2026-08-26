package com.wellnessapp.dto.admin;

import com.wellnessapp.dto.access.SharedMemberTodayResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AdminMemberJournalResponse(
        Member member,
        SharedMemberTodayResponse today,
        List<HistoryDay> history,
        int retentionDays
) {
    public record Member(
            Long id,
            String name,
            String email,
            String status,
            String goal,
            String dietaryPreferences,
            Integer heightCm,
            Double weightKg,
            Double waistCm,
            Double bodyFatPercent,
            Double bmi,
            Instant lastBodyMetricsUpdatedAt,
            Integer waterGoalMl
    ) {}

    public record HistoryDay(LocalDate date, List<HistoryPost> posts) {}

    public record HistoryPost(
            Long postId,
            String type,
            String name,
            Instant postedAt,
            String imageUrl,
            SharedMemberTodayResponse.Nutrition nutrition
    ) {}
}
