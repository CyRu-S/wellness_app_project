package com.wellnessapp.dto.leaderboard;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record LeaderboardResponse(LocalDate date, Instant generatedAt, Long viewerId, List<Row> rows) {
    public record Row(
            Long memberId,
            String name,
            String initials,
            String profileImageUrl,
            int rank,
            int score,
            int adherenceScore,
            int timingScore,
            int mealsCompleted,
            int mealsPlanned,
            int postedMeals,
            int onTimePosts,
            int averageTimingMinutes,
            int tasksCompleted,
            int tasksPlanned,
            int hydrationMl,
            int hydrationGoalMl,
            int activityMinutes,
            Instant percentageReachedAt,
            boolean viewer) {}
}
