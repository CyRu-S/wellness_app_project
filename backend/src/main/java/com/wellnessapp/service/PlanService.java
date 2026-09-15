package com.wellnessapp.service;

import com.wellnessapp.dto.plan.*;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final MealPostRepository posts;
    private final Clock clock;
    private final ZoneId applicationZoneId;
    private final WorkflowNotificationService notices;
    @Value("${app.admin.email:admin@mr-care.app}")
    private String adminEmail;

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
                        todayMeals.stream().anyMatch(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()) && meal.isConsumed()), item.getSortOrder())).toList(), coachName());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> memberPlan(Long memberId) {
        Plan plan = current(memberId);
        if (plan == null) return Map.of("memberId", memberId, "planName", "", "items", List.of());
        return Map.of("memberId", memberId, "planName", plan.getTitle(), "consultant", coachName(), "updatedAt", plan.getStartDate(),
                "items", items.findByPlanIdOrderBySortOrder(plan.getId()).stream().filter(item -> item.getType() == PlanItem.Type.MEAL && item.getMealType() != null).map(item -> Map.of(
                        "id", item.getId(), "type", item.getMealType(), "name", item.getTitle(), "time", item.getScheduledTime(),
                        "calories", item.getCalories(), "protein", item.getProteinGrams(), "ingredients", split(item.getIngredients()))).toList());
    }

    @Transactional
    public Map<String, Object> save(Long memberId, SaveMealPlanRequest request) {
        User user = users.lockById(memberId).filter(u -> u.getRole() == User.Role.USER && u.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() -> new BadRequestException("Approve this member before assigning a plan"));
        Plan previous = current(memberId);
        var previousItems = previous == null ? List.<PlanItem>of() : items.findByPlanIdOrderBySortOrder(previous.getId());
        var previousIds = new HashSet<Long>();
        for (PlanItem item : previousItems) previousIds.add(item.getId());
        var seenIds = new HashSet<Long>();
        var occupiedTimes = new HashSet<LocalTime>();
        for (var item : request.items()) {
            if (item.id() != null && (!previousIds.contains(item.id()) || !seenIds.add(item.id())))
                throw new BadRequestException("The meal plan contains an invalid or repeated existing meal");
            if (!occupiedTimes.add(item.time()))
                throw new BadRequestException("Only one meal can be scheduled at the same time");
        }
        var todayMeals = meals.findByUserIdAndMealDateOrderByMealTime(memberId, today());
        Plan plan = previous;
        if (plan == null) {
            plan = plans.save(Plan.builder().user(user).title(request.planName().trim()).goal("")
                    .startDate(today()).endDate(LocalDate.of(9999, 12, 31)).active(true).build());
        } else {
            plan.setTitle(request.planName().trim());
            plans.save(plan);
        }

        // Removing a slot removes it from today's schedule too. Any associated
        // MealPost is retained with a null planned-meal reference for history.
        Set<Long> retainedIds = request.items().stream().map(SaveMealPlanRequest.Item::id)
                .filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        for (PlanItem item : previousItems) {
            if (retainedIds.contains(item.getId())) continue;
            todayMeals.stream().filter(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()))
                    .forEach(this::removeTodayMeal);
        }
        meals.flush();
        for (PlanItem item : previousItems) if (!retainedIds.contains(item.getId())) items.delete(item);

        Map<Long, PlanItem> existingItems = previousItems.stream()
                .collect(java.util.stream.Collectors.toMap(PlanItem::getId, item -> item));
        int order = 0;
        for (var item : request.items()) {
            String ingredientText = String.join("\n", item.ingredients() == null ? List.of() : item.ingredients());
            PlanItem savedItem = item.id() == null
                    ? PlanItem.builder().plan(plan).type(PlanItem.Type.MEAL).build()
                    : existingItems.get(item.id());
            savedItem.setTitle(item.name().trim());
            savedItem.setDetail(item.type());
            savedItem.setMealType(item.type());
            savedItem.setScheduledTime(item.time());
            savedItem.setCalories(item.calories());
            savedItem.setProteinGrams(item.protein());
            savedItem.setIngredients(ingredientText);
            savedItem.setSortOrder(order++);
            savedItem = items.save(savedItem);

            // Existing, unposted slots keep their identity while reflecting edits
            // immediately; posted meals remain an immutable check-in for the day.
            PlanItem planItem = savedItem;
            todayMeals.stream().filter(meal -> !meal.isConsumed() && meal.getPlanItem() != null
                            && meal.getPlanItem().getId().equals(planItem.getId()))
                    .forEach(meal -> {
                        meal.setType(planItem.getMealType());
                        meal.setName(planItem.getTitle());
                        meal.setMealTime(planItem.getScheduledTime());
                        meal.setCalories(planItem.getCalories());
                        meal.setProteinGrams(planItem.getProteinGrams());
                        ingredients.deleteAll(ingredients.findByMealId(meal.getId()));
                        for (String name : split(planItem.getIngredients()))
                            ingredients.save(MealItem.builder().meal(meal).name(name).quantity("").build());
                        meals.save(meal);
                    });
        }
        ensureDailyMeals(memberId);
        notices.notify(user, PushDelivery.Kind.PLAN, "plan-" + plan.getId(), "Your meal plan was updated", "Your coach has assigned an updated meal plan. Open your daily plan to review it.");
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
    private void removeTodayMeal(Meal meal) {
        // Keep the uploaded evidence, but detach it before deleting its schedule
        // entry so the persistence context and the database agree on the history link.
        posts.findByPlannedMealId(meal.getId()).ifPresent(post -> {
            post.setPlannedMeal(null);
            posts.save(post);
        });
        ingredients.deleteAll(ingredients.findByMealId(meal.getId()));
        meals.delete(meal);
    }
    private String coachName() {
        String name = users.findByEmailIgnoreCase(adminEmail).filter(user -> user.getRole() == User.Role.ADMIN)
                .map(User::getFullName).filter(value -> !value.isBlank()).orElse("Arjun");
        return name.regionMatches(true, 0, "Coach ", 0, 6) ? name : "Coach " + name;
    }
    private List<String> split(String value) { return value == null || value.isBlank() ? List.of() : Arrays.asList(value.split("\n")); }
}

