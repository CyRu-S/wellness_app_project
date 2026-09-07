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
    private final MemberAccessService memberAccess;
    private final ActivityService activityService;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @org.springframework.transaction.annotation.Transactional
    public DashboardResponse get(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        user.setLastSeenAt(clock.instant()); users.save(user);
        LocalDate date = LocalDate.now(clock.withZone(applicationZoneId));
        int waterGoalMl = profiles.findByUserId(user.getId())
                .map(profile -> profile.getWaterGoalMl() == null ? DEFAULT_WATER_GOAL_ML : profile.getWaterGoalMl())
                .orElse(DEFAULT_WATER_GOAL_ML);
        var snapshot = memberAccess.adminMemberToday(user.getId());
        var summary = snapshot.summary();
        var sessions = activityService.today(email);
        var dates = new java.util.HashSet<>(meals.consumedDates(user.getId()));
        LocalDate cursor = dates.contains(date) ? date : date.minusDays(1);
        int streak = 0;
        while (dates.contains(cursor)) { streak++; cursor = cursor.minusDays(1); }
        var lastMeal = snapshot.meals().stream().filter(meal -> meal.postedAt() != null)
                .max(java.util.Comparator.comparing(com.wellnessapp.dto.access.SharedMemberTodayResponse.MealEntry::postedAt)).orElse(null);
        return new DashboardResponse(user.getFullName(), summary.plannedMeals() == 0 ? 0 : Math.min(100, summary.completedMeals() * 100 / summary.plannedMeals()),
                summary.calories(), summary.proteinGrams(), summary.activityMinutes(), sessions.stream().mapToInt(ActivityService.Session::calories).sum(),
                summary.hydrationMl() / GLASS_SIZE_ML, waterGoalMl / GLASS_SIZE_ML, waterGoalMl, streak, "",
                sessions.isEmpty() ? null : sessions.getLast(), lastMeal);
    }
}
