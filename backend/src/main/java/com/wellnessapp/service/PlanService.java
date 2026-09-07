package com.wellnessapp.service;

import com.wellnessapp.dto.plan.*;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class PlanService {
    private final UserRepository users;
    private final PlanRepository plans;
    private final PlanItemRepository items;
    private final MealRepository meals;
    private final MealItemRepository ingredients;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional
    public PlanResponse today(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        ensureDailyMeals(user.getId());
        Plan plan = current(user.getId());
        if (plan == null) return null;
        var todayMeals = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), today());
        return new PlanResponse(plan.getId(), plan.getTitle(), plan.getGoal(), plan.getStartDate(), plan.getEndDate(),
                items.findByPlanIdOrderBySortOrder(plan.getId()).stream().map(item -> new PlanResponse.Item(
                        item.getId(), item.getType().name(), item.getTitle(), item.getDetail(), item.getScheduledTime(),
                        todayMeals.stream().anyMatch(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()) && meal.isConsumed()), item.getSortOrder())).toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> memberPlan(Long memberId) {
        Plan plan = current(memberId);
        if (plan == null) return Map.of("memberId", memberId, "planName", "", "items", List.of());
        return Map.of("memberId", memberId, "planName", plan.getTitle(), "consultant", "Coach Arpan", "updatedAt", plan.getStartDate(),
                "items", items.findByPlanIdOrderBySortOrder(plan.getId()).stream().filter(item -> item.getType() == PlanItem.Type.MEAL && item.getMealType() != null).map(item -> Map.of(
                        "id", item.getId(), "type", item.getMealType(), "name", item.getTitle(), "time", item.getScheduledTime(),
                        "calories", item.getCalories(), "protein", item.getProteinGrams(), "ingredients", split(item.getIngredients()))).toList());
    }

    @Transactional
    public Map<String, Object> save(Long memberId, SaveMealPlanRequest request) {
        User user = users.lockById(memberId).filter(u -> u.getRole() == User.Role.USER && u.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() -> new BadRequestException("Approve this member before assigning a plan"));
        Plan previous = current(memberId);
        if (previous != null) { previous.setActive(false); plans.save(previous); }
        for (Meal meal : meals.findByUserIdAndMealDateOrderByMealTime(memberId, today())) {
            if (!meal.isConsumed()) { ingredients.deleteAll(ingredients.findByMealId(meal.getId())); meals.delete(meal); }
        }
        Plan plan = plans.save(Plan.builder().user(user).title(request.planName().trim()).goal("")
                .startDate(today()).endDate(LocalDate.of(9999, 12, 31)).active(true).build());
        int order = 0;
        for (var item : request.items()) {
            items.save(PlanItem.builder().plan(plan).type(PlanItem.Type.MEAL).title(item.name().trim()).detail(item.type())
                    .mealType(item.type()).scheduledTime(item.time()).calories(item.calories()).proteinGrams(item.protein())
                    .ingredients(String.join("\n", item.ingredients() == null ? List.of() : item.ingredients())).sortOrder(order++).build());
        }
        ensureDailyMeals(memberId);
        return memberPlan(memberId);
    }

    @Transactional
    public void ensureDailyMeals(Long memberId) {
        User user = users.lockById(memberId).orElseThrow(() -> new NotFoundException("Member not found"));
        if (user.getStatus() != User.Status.ACTIVE) return;
        Plan plan = current(memberId);
        if (plan == null) return;
        var existing = meals.findByUserIdAndMealDateOrderByMealTime(memberId, today());
        for (PlanItem item : items.findByPlanIdOrderBySortOrder(plan.getId())) {
            if (item.getType() != PlanItem.Type.MEAL || item.getMealType() == null) continue;
            if (existing.stream().anyMatch(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()))) continue;
            Meal meal = meals.save(Meal.builder().user(user).planItem(item).type(item.getMealType()).name(item.getTitle())
                    .mealDate(today()).mealTime(item.getScheduledTime()).calories(item.getCalories()).proteinGrams(item.getProteinGrams()).build());
            for (String name : split(item.getIngredients())) ingredients.save(MealItem.builder().meal(meal).name(name).quantity("").build());
        }
    }

    private Plan current(Long memberId) {
        return plans.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(memberId)
                .filter(plan -> !today().isBefore(plan.getStartDate()) && !today().isAfter(plan.getEndDate())).orElse(null);
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(applicationZoneId)); }
    private List<String> split(String value) { return value == null || value.isBlank() ? List.of() : Arrays.asList(value.split("\n")); }
}

