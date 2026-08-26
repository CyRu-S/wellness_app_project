package com.wellnessapp.service;
import com.wellnessapp.dto.dashboard.DashboardResponse;
import com.wellnessapp.entity.User;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private static final int DEFAULT_WATER_GOAL_ML = 2000;
    private static final int GLASS_SIZE_ML = 250;

    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MealRepository meals;
    private final ActivitySessionRepository activities;
    private final WaterLogRepository water;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    public DashboardResponse get(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        LocalDate date = LocalDate.now(clock.withZone(applicationZoneId));
        int calories = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), date).stream()
                .filter(meal -> meal.isConsumed())
                .mapToInt(meal -> meal.getCalories())
                .sum();
        Instant today = date.atStartOfDay(applicationZoneId).toInstant();
        Instant tomorrow = date.plusDays(1).atStartOfDay(applicationZoneId).toInstant();
        int activeMinutes = activities
                .findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAt(user.getId(), today, tomorrow)
                .stream()
                .mapToInt(item -> item.getDurationSeconds() / 60)
                .sum();
        int glasses = water
                .findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAt(user.getId(), today, tomorrow)
                .stream()
                .mapToInt(item -> item.getAmountMl() / GLASS_SIZE_ML)
                .sum();
        int waterGoalMl = profiles.findByUserId(user.getId())
                .map(profile -> profile.getWaterGoalMl() == null ? DEFAULT_WATER_GOAL_ML : profile.getWaterGoalMl())
                .orElse(DEFAULT_WATER_GOAL_ML);
        return new DashboardResponse(
                user.getFullName(), 72, calories, activeMinutes, glasses,
                waterGoalMl / GLASS_SIZE_ML, waterGoalMl, 8, "Steady energy");
    }
}

