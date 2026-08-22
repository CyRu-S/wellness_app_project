package com.wellnessapp.service;
import com.wellnessapp.dto.meal.MealResponse;
import com.wellnessapp.entity.User;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.List;
@Service @RequiredArgsConstructor public class MealService {
    private final UserRepository users; private final MealRepository meals; private final MealItemRepository items;
    private final Clock clock; private final ZoneId applicationZoneId;
    public List<MealResponse> today(String email) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); return meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.now(clock.withZone(applicationZoneId))).stream().map(meal -> new MealResponse(meal.getId(), meal.getType(), meal.getName(), meal.getMealTime(), meal.getCalories(), meal.getProteinGrams(), meal.isConsumed(), items.findByMealId(meal.getId()).stream().map(item -> item.getName() + " · " + item.getQuantity()).toList())).toList(); }
}

