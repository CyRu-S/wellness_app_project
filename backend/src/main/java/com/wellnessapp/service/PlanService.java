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
    private final MissedEventRepository missed;
    private final PlanItemCompletionRepository completions;
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
        var completedTaskIds = completions.findByUserIdAndCompletedDate(user.getId(), today()).stream()
                .map(value -> value.getPlanItem().getId()).collect(java.util.stream.Collectors.toSet());
        var dailyItems = new ArrayList<>(items.findByPlanIdOrderBySortOrder(plan.getId()).stream().map(item -> new PlanResponse.Item(
                item.getId(), item.getType().name(), item.getTitle(), item.getDetail(), item.getScheduledTime(),
                isDailyTask(item) ? completedTaskIds.contains(item.getId())
                        : todayMeals.stream().anyMatch(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()) && meal.isConsumed()),
                item.getSortOrder(), isDailyTask(item) ? item.getDetail() : "Meals")).toList());
        // Removed templates do not recur, but a completed daily entry remains visible until midnight.
        for (Meal meal : todayMeals) {
            if (meal.getPlanItem() == null && meal.isConsumed()) dailyItems.add(new PlanResponse.Item(
                    -meal.getId(), "MEAL", meal.getName(), meal.getType(), meal.getMealTime(), true, dailyItems.size(), "Meals"));
        }
        return new PlanResponse(plan.getId(), plan.getTitle(), plan.getGoal(), plan.getStartDate(), plan.getEndDate(),
                dailyItems, coachName());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> memberPlan(Long memberId) {
        Plan plan = current(memberId);
        if (plan == null) return emptyMemberPlan(memberId);
        var planItems = items.findByPlanIdOrderBySortOrder(plan.getId());
        return Map.of("memberId", memberId, "planName", plan.getTitle(), "consultant", coachName(), "updatedAt", plan.getStartDate(),
                "items", planItems.stream().filter(item -> item.getType() == PlanItem.Type.MEAL && item.getMealType() != null).map(this::mealMap).toList(),
                "habits", planItems.stream().filter(item -> item.getType() == PlanItem.Type.HEALTHY_HABIT).map(this::taskMap).toList(),
                "exercises", planItems.stream().filter(item -> item.getType() == PlanItem.Type.ACTIVITY).map(this::taskMap).toList());
    }

    @Transactional(readOnly = true)
    public Map<Long, Map<String, Object>> memberPlans(Collection<Long> memberIds) {
        Map<Long, Map<String, Object>> result = new LinkedHashMap<>();
        if (memberIds.isEmpty()) return result;
        var currentPlans = new LinkedHashMap<Long, Plan>();
        for (var plan : plans.findByUserIdInAndActiveTrueOrderByStartDateDescIdDesc(memberIds)) {
            if (!today().isBefore(plan.getStartDate()) && !today().isAfter(plan.getEndDate()))
                currentPlans.putIfAbsent(plan.getUser().getId(), plan);
        }
        var groupedItems = currentPlans.isEmpty() ? Map.<Long, List<PlanItem>>of()
                : items.findByPlanIdInOrderBySortOrder(currentPlans.values().stream().map(Plan::getId).toList())
                .stream().collect(java.util.stream.Collectors.groupingBy(item -> item.getPlan().getId()));
        var coach = coachName();
        for (var memberId : memberIds) {
            var plan = currentPlans.get(memberId);
            if (plan == null) {
                result.put(memberId, emptyMemberPlan(memberId));
                continue;
            }
            var planItems = groupedItems.getOrDefault(plan.getId(), List.of());
            result.put(memberId, Map.of("memberId", memberId, "planName", plan.getTitle(), "consultant", coach,
                    "updatedAt", plan.getStartDate(), "items", planItems.stream()
                    .filter(item -> item.getType() == PlanItem.Type.MEAL && item.getMealType() != null).map(this::mealMap).toList(),
                    "habits", planItems.stream().filter(item -> item.getType() == PlanItem.Type.HEALTHY_HABIT).map(this::taskMap).toList(),
                    "exercises", planItems.stream().filter(item -> item.getType() == PlanItem.Type.ACTIVITY).map(this::taskMap).toList()));
        }
        return result;
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

        // Keep posted daily entries and their evidence; remove only unposted slots immediately.
        Set<Long> retainedIds = request.items().stream().map(SaveMealPlanRequest.Item::id)
                .filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        for (PlanItem item : previousItems) {
            if (retainedIds.contains(item.getId())) continue;
            todayMeals.stream().filter(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()))
                    .forEach(meal -> {
                        if (meal.isConsumed() || posts.findByPlannedMealId(meal.getId()).isPresent()) {
                            meal.setPlanItem(null);
                            meals.save(meal);
                        } else removeTodayMeal(meal);
                    });
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
            boolean wasMeal = savedItem.getId() != null && savedItem.getType() == PlanItem.Type.MEAL;
            PlanItem.Type kind = switch (item.kind() == null ? "MEAL" : item.kind().toUpperCase(Locale.ROOT)) {
                case "HEALTHY_HABIT" -> PlanItem.Type.HEALTHY_HABIT;
                case "ACTIVITY" -> PlanItem.Type.ACTIVITY;
                default -> PlanItem.Type.MEAL;
            };
            if (wasMeal && kind != PlanItem.Type.MEAL) {
                Long changingItemId = savedItem.getId();
                todayMeals.stream().filter(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(changingItemId))
                        .forEach(meal -> { if (meal.isConsumed() || posts.findByPlannedMealId(meal.getId()).isPresent()) {
                            meal.setPlanItem(null); meals.save(meal);
                        } else removeTodayMeal(meal); });
                meals.flush();
            }
            savedItem.setType(kind);
            savedItem.setTitle(item.name().trim());
            String category = item.category() == null ? "" : item.category().trim();
            savedItem.setDetail(kind != PlanItem.Type.MEAL ? category : item.type());
            savedItem.setMealType(kind == PlanItem.Type.MEAL ? item.type() : null);
            savedItem.setScheduledTime(item.time());
            savedItem.setCalories(kind == PlanItem.Type.MEAL ? item.calories() : 0);
            savedItem.setProteinGrams(kind == PlanItem.Type.MEAL ? item.protein() : 0);
            savedItem.setIngredients(kind == PlanItem.Type.MEAL ? ingredientText : null);
            savedItem.setSortOrder(order++);
            savedItem = items.save(savedItem);

            // Existing, unposted slots keep their identity while reflecting edits
            // immediately; posted meals remain an immutable check-in for the day.
            PlanItem planItem = savedItem;
            if (kind == PlanItem.Type.MEAL) todayMeals.stream().filter(meal -> !meal.isConsumed() && meal.getPlanItem() != null
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
        notices.notify(user, PushDelivery.Kind.PLAN, "plan-" + plan.getId() + "-" + UUID.randomUUID(), "Your meal plan was updated", "Your coach has assigned an updated meal plan. Open your daily plan to review it.");
        return memberPlan(memberId);
    }

    @Transactional
    public void ensureDailyMeals(Long memberId) {
        Plan plan = current(memberId);
        var initialMeals = meals.findByUserIdAndMealDateOrderByMealTime(memberId, today());
        // The pre-lock check reads IDs only, so it cannot cache stale template
        // fields when an admin edits the plan before this request gets the lock.
        var scheduledIds = plan == null ? Set.<Long>of() : new HashSet<>(items.scheduledIds(plan.getId(), PlanItem.Type.MEAL));
        boolean staleEntries = initialMeals.stream().anyMatch(meal ->
                !belongsToSchedule(meal, scheduledIds) && (!meal.isConsumed() || meal.getPlanItem() != null));
        if (!staleEntries && scheduledIds.stream()
                .allMatch(id -> initialMeals.stream().anyMatch(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(id)))) return;
        // Reconcile under the same member lock as admin edits and meal posting.
        // Ordinary reads of an unchanged schedule still avoid a write lock.
        User user = users.lockById(memberId).orElseThrow(() -> new NotFoundException("Member not found"));
        if (user.getStatus() != User.Status.ACTIVE) return;
        plan = current(memberId);
        var scheduled = scheduledMeals(plan);
        var currentIds = scheduled.stream().map(PlanItem::getId).collect(java.util.stream.Collectors.toSet());
        var existing = new ArrayList<>(meals.findByUserIdAndMealDateOrderByMealTime(memberId, today()));
        for (Meal meal : new ArrayList<>(existing)) {
            if (belongsToSchedule(meal, currentIds)) continue;
            if (meal.isConsumed() || posts.findByPlannedMealId(meal.getId()).isPresent()) {
                // A photo/check-in is evidence for today, never a recurring template.
                meal.setPlanItem(null);
                meal.setConsumed(true);
                meals.save(meal);
            } else {
                removeTodayMeal(meal);
                existing.remove(meal);
            }
        }
        meals.flush();
        for (PlanItem item : scheduled) {
            if (existing.stream().anyMatch(meal -> meal.getPlanItem() != null && meal.getPlanItem().getId().equals(item.getId()))) continue;
            Meal meal = meals.save(Meal.builder().user(user).planItem(item).type(item.getMealType()).name(item.getTitle())
                    .mealDate(today()).mealTime(item.getScheduledTime()).calories(item.getCalories()).proteinGrams(item.getProteinGrams()).build());
            for (String name : split(item.getIngredients())) ingredients.save(MealItem.builder().meal(meal).name(name).quantity("").build());
        }
    }

    private List<PlanItem> scheduledMeals(Plan plan) {
        return plan == null ? List.of() : items.findByPlanIdOrderBySortOrder(plan.getId()).stream()
                .filter(item -> item.getType() == PlanItem.Type.MEAL && item.getMealType() != null).toList();
    }

    private boolean belongsToSchedule(Meal meal, Set<Long> scheduledIds) {
        return meal.getPlanItem() != null && scheduledIds.contains(meal.getPlanItem().getId());
    }

    @Transactional(readOnly = true)
    public List<PlanItem> scheduledTasks(Long memberId) {
        Plan plan = current(memberId);
        return plan == null ? List.of() : items.findByPlanIdOrderBySortOrder(plan.getId()).stream()
                .filter(this::isDailyTask).toList();
    }

    @Transactional(readOnly = true)
    public boolean habitCompleted(Long memberId, Long itemId, LocalDate date) {
        return completions.existsByPlanItemIdAndUserIdAndCompletedDate(itemId, memberId, date);
    }

    @Transactional
    public PlanResponse completeTask(String email, Long itemId) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("Member not found"));
        PlanItem item = items.findById(itemId).filter(value -> value.getPlan().getUser().getId().equals(user.getId())
                && isDailyTask(value)).orElseThrow(() -> new NotFoundException("Daily task not found"));
        LocalDate date = today();
        completions.findByPlanItemIdAndUserIdAndCompletedDate(itemId, user.getId(), date).orElseGet(() ->
                completions.save(PlanItemCompletion.builder().planItem(item).user(user).completedDate(date).completedAt(clock.instant()).build()));
        missed.findBySourceKey("habit-" + itemId + "-" + date).ifPresent(event -> { event.setResolved(true); missed.save(event); });
        return today(email);
    }

    private Plan current(Long memberId) {
        return plans.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(memberId)
                .filter(plan -> !today().isBefore(plan.getStartDate()) && !today().isAfter(plan.getEndDate())).orElse(null);
    }
    private LocalDate today() { return LocalDate.now(clock.withZone(applicationZoneId)); }
    private void removeTodayMeal(Meal meal) {
        missed.findBySourceKey("meal-" + meal.getId()).ifPresent(event -> {
            event.setResolved(true);
            missed.save(event);
        });
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
    private Map<String, Object> mealMap(PlanItem item) {
        return Map.of("id", item.getId(), "kind", "MEAL", "type", item.getMealType(), "name", item.getTitle(),
                "time", item.getScheduledTime(), "calories", item.getCalories(), "protein", item.getProteinGrams(),
                "ingredients", split(item.getIngredients()));
    }
    private Map<String, Object> taskMap(PlanItem item) {
        String kind = item.getType().name();
        return Map.of("id", item.getId(), "kind", kind, "type", kind.equals("ACTIVITY") ? "Coach exercise" : "Healthy habit", "category", item.getDetail(),
                "name", item.getTitle(), "time", item.getScheduledTime(), "calories", 0, "protein", 0, "ingredients", List.of());
    }
    private Map<String, Object> emptyMemberPlan(Long memberId) {
        return Map.of("memberId", memberId, "planName", "", "items", List.of(), "habits", List.of(), "exercises", List.of());
    }
    private boolean isDailyTask(PlanItem item) {
        return item.getType() == PlanItem.Type.HEALTHY_HABIT || item.getType() == PlanItem.Type.ACTIVITY;
    }
    private List<String> split(String value) { return value == null || value.isBlank() ? List.of() : Arrays.asList(value.split("\n")); }
}

