package com.wellnessapp.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class WeeklyAdherenceService {
    public record Habit(Long id, LocalTime time, boolean completed) {}
    public record Result(int percentage, List<Map<String, Object>> series, boolean estimatedHistory) {}
    private record DayKey(Long memberId, LocalDate date) {}
    private record Score(double earned, int possible) {
        int percentage() { return possible == 0 ? 0 : (int) Math.round(Math.min(1, earned / possible) * 100); }
    }
    private final DailyAdherenceTargetRepository targets;
    private final PlanRepository plans;
    private final PlanItemRepository items;
    private final PlanItemCompletionRepository completions;
    private final UserProfileRepository profiles;
    private final UserRepository users;
    private final WaterLogRepository water;
    private final ObjectMapper json;
    private final Clock clock;
    private final ZoneId applicationZoneId;
    @Value("${app.hydration.deadline:20:00}") private String hydrationDeadline;

    /** Callers hold the member lock, shared with plan edits and check-ins. */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void ensureToday(Long memberId) {
        if (!targets.existsByUserIdAndTargetDate(memberId, today())) captureToday(memberId);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void captureToday(Long memberId) {
        var date = today();
        var saved = targets.findByUserIdAndTargetDate(memberId, date).orElseGet(() -> DailyAdherenceTarget.builder()
                .user(users.getReferenceById(memberId)).targetDate(date).habitTargets("[]").build());
        var completed = completions.findByUserIdAndCompletedDate(memberId, date).stream()
                .map(value -> value.getPlanItem().getId()).collect(Collectors.toSet());
        var current = plans.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(memberId)
                .filter(plan -> !date.isBefore(plan.getStartDate()) && !date.isAfter(plan.getEndDate()));
        var habits = new LinkedHashMap<Long, Habit>();
        // A completed habit removed from today's plan remains evidence for today.
        decode(saved.getHabitTargets()).stream().filter(Habit::completed).forEach(habit -> habits.put(habit.id(), habit));
        if (current.isPresent()) for (var item : items.findByPlanIdOrderBySortOrder(current.get().getId())) {
            if (item.getType() == PlanItem.Type.HEALTHY_HABIT)
                habits.put(item.getId(), new Habit(item.getId(), item.getScheduledTime(), completed.contains(item.getId())));
        }
        saved.setWaterGoalMl(goal(profiles.findByUserId(memberId).orElse(null)));
        try { saved.setHabitTargets(json.writeValueAsString(habits.values())); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("Could not save daily targets", error); }
        targets.save(saved);
    }

    /** Fixed-count batch reads, independent of club size; no writes on admin GETs. */
    @Transactional(readOnly = true)
    public Map<Long, Result> calculate(List<User> members, Map<Long, UserProfile> profileByUser,
                                      Map<Long, List<MealRepository.Summary>> mealsByUser) {
        if (members.isEmpty()) return Map.of();
        var date = today(); var first = date.minusDays(6);
        var ids = members.stream().map(User::getId).toList();
        var savedByDay = targets.findByUserIdInAndTargetDateBetween(ids, first, date).stream()
                .collect(Collectors.toMap(value -> new DayKey(value.getUser().getId(), value.getTargetDate()), value -> value));
        var waterByDay = new HashMap<DayKey, Integer>();
        for (var log : water.history(ids, first.atStartOfDay(applicationZoneId).toInstant(), date.plusDays(1).atStartOfDay(applicationZoneId).toInstant()))
            waterByDay.merge(new DayKey(log.getMemberId(), log.getLoggedAt().atZone(applicationZoneId).toLocalDate()), log.getAmountMl(), Integer::sum);
        var completedByDay = new HashMap<DayKey, Map<Long, Habit>>();
        for (var value : completions.habitHistory(ids, first, date))
            completedByDay.computeIfAbsent(new DayKey(value.getMemberId(), value.getCompletedDate()), ignored -> new HashMap<>())
                    .put(value.getItemId(), new Habit(value.getItemId(), value.getScheduledTime(), true));
        var currentPlans = new HashMap<Long, Plan>();
        for (var plan : plans.findByUserIdInAndActiveTrueOrderByStartDateDescIdDesc(ids)) currentPlans.putIfAbsent(plan.getUser().getId(), plan);
        var habitsByPlan = currentPlans.isEmpty() ? Map.<Long, List<PlanItem>>of()
                : items.findByPlanIdInOrderBySortOrder(currentPlans.values().stream().map(Plan::getId).toList()).stream()
                .filter(item -> item.getType() == PlanItem.Type.HEALTHY_HABIT).collect(Collectors.groupingBy(item -> item.getPlan().getId()));
        var results = new HashMap<Long, Result>();
        for (var member : members) {
            var history = mealsByUser.getOrDefault(member.getId(), List.of());
            var plan = currentPlans.get(member.getId());
            double earned = 0; int possible = 0; boolean estimated = false, any = false;
            var series = new ArrayList<Map<String, Object>>();
            for (var day = first; !day.isAfter(date); day = day.plusDays(1)) {
                var key = new DayKey(member.getId(), day);
                var saved = savedByDay.get(key);
                var done = completedByDay.getOrDefault(key, Map.of());
                var habits = new LinkedHashMap<Long, Habit>();
                boolean scheduled = plan != null && !day.isBefore(plan.getStartDate()) && !day.isAfter(plan.getEndDate());
                if (saved != null) decode(saved.getHabitTargets()).forEach(habit -> habits.put(habit.id(), habit));
                else if (scheduled) for (var item : habitsByPlan.getOrDefault(plan.getId(), List.of()))
                    habits.put(item.getId(), new Habit(item.getId(), item.getScheduledTime(), false));
                habits.putAll(done);
                var dayMeals = new ArrayList<MealRepository.Summary>();
                for (var meal : history) if (meal.getMealDate().equals(day)) dayMeals.add(meal);
                int hydration = waterByDay.getOrDefault(key, 0);
                // No invented water penalties before the first known active day.
                boolean tracked = saved != null || scheduled || !dayMeals.isEmpty() || !done.isEmpty() || hydration > 0;
                int waterGoal = saved == null ? goal(profileByUser.get(member.getId())) : saved.getWaterGoalMl();
                var score = score(day, date, dayMeals, habits.values(), tracked, hydration, waterGoal);
                earned += score.earned(); possible += score.possible(); any |= score.possible() > 0;
                estimated |= tracked && saved == null && day.isBefore(date);
                series.add(Map.of("label", day.format(DateTimeFormatter.ofPattern("d MMM")), "value", score.percentage()));
            }
            results.put(member.getId(), new Result(new Score(earned, possible).percentage(), any ? series : List.of(), estimated));
        }
        return results;
    }

    private Score score(LocalDate day, LocalDate today, List<MealRepository.Summary> meals, Collection<Habit> habits,
                        boolean tracked, int hydration, int waterGoal) {
        double earned = 0; int possible = 0;
        var now = clock.instant().atZone(applicationZoneId).toLocalTime();
        for (var meal : meals) if (day.isBefore(today) || meal.isConsumed() || due(meal.getMealTime(), now)) {
            possible++; if (meal.isConsumed()) earned++;
        }
        for (var habit : habits) if (day.isBefore(today) || habit.completed() || due(habit.time(), now)) {
            possible++; if (habit.completed()) earned++;
        }
        // Before the water deadline, show credit once intake is logged, without
        // treating an untouched future goal as an already missed obligation.
        if (tracked && (day.isBefore(today) || hydration > 0 || due(LocalTime.parse(hydrationDeadline), now))) {
            possible++; earned += Math.min(1.0, Math.max(0, hydration) / (double) Math.max(1, waterGoal));
        }
        return new Score(earned, possible);
    }
    private boolean due(LocalTime time, LocalTime now) { return time == null || !time.isAfter(now); }
    private int goal(UserProfile profile) { return profile == null || profile.getWaterGoalMl() == null || profile.getWaterGoalMl() <= 0 ? 2000 : profile.getWaterGoalMl(); }
    private LocalDate today() { return LocalDate.now(clock.withZone(applicationZoneId)); }
    private List<Habit> decode(String value) {
        try { return json.readValue(value, new TypeReference<List<Habit>>() {}); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("Could not read daily targets", error); }
    }
}
