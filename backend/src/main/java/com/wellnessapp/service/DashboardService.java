package com.wellnessapp.service;
import com.wellnessapp.dto.dashboard.DashboardResponse;
import com.wellnessapp.entity.User;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
@Service @RequiredArgsConstructor public class DashboardService {
    private final UserRepository users; private final MealRepository meals; private final ActivitySessionRepository activities; private final WaterLogRepository water;
    public DashboardResponse get(String email) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); int calories = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.now()).stream().filter(meal -> meal.isConsumed()).mapToInt(meal -> meal.getCalories()).sum(); Instant today = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant(); int activeMinutes = activities.findByUserIdAndStartedAtAfter(user.getId(), today).stream().mapToInt(item -> item.getDurationSeconds() / 60).sum(); int glasses = water.findByUserIdAndLoggedAtAfter(user.getId(), today).stream().mapToInt(item -> item.getAmountMl() / 250).sum(); return new DashboardResponse(user.getFullName(), 72, calories, activeMinutes, glasses, 8, 8, "Steady energy"); }
}

