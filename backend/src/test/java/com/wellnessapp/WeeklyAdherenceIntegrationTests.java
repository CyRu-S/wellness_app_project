package com.wellnessapp;

import com.wellnessapp.dto.plan.SaveMealPlanRequest;
import com.wellnessapp.dto.admin.UpdateMemberWaterGoalRequest;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = {"app.demo.seed-enabled=false", "spring.datasource.url=jdbc:h2:mem:weekly-adherence;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"})
@Transactional
class WeeklyAdherenceIntegrationTests {
    @Autowired UserRepository users;
    @Autowired UserProfileRepository profiles;
    @Autowired MealRepository meals;
    @Autowired WaterLogRepository water;
    @Autowired DailyAdherenceTargetRepository targets;
    @Autowired PlanService plans;
    @Autowired AdminWorkspaceService workspace;
    @Autowired AdminMemberJournalService journals;
    @Autowired WeeklyAdherenceService adherence;
    @MockitoBean Clock clock;
    private final ZoneId zone = ZoneId.of("Asia/Kolkata");

    @BeforeEach void time() { at("2026-09-05T10:00:00"); }
    void at(String local) {
        var fixed = Clock.fixed(LocalDateTime.parse(local).atZone(zone).toInstant(), zone);
        when(clock.instant()).thenReturn(fixed.instant()); when(clock.withZone(zone)).thenReturn(fixed);
    }
    User member() {
        var user = users.saveAndFlush(User.builder().email("weekly@example.com").fullName("Weekly member").passwordHash("unused")
                .role(User.Role.USER).status(User.Status.ACTIVE).emailVerifiedAt(clock.instant()).build());
        profiles.saveAndFlush(UserProfile.builder().user(user).waterGoalMl(2000).build());
        return user;
    }
    SaveMealPlanRequest.Item meal(String title, int hour) {
        return new SaveMealPlanRequest.Item("Meal", title, LocalTime.of(hour, 0), 100, 5, List.of(), null);
    }
    SaveMealPlanRequest.Item habit(String title, int hour) {
        return new SaveMealPlanRequest.Item("Habit", title, LocalTime.of(hour, 0), 0, 0, List.of(), null, "HEALTHY_HABIT", "Wellness");
    }
    void plan(User user, SaveMealPlanRequest.Item... items) { plans.save(user.getId(), new SaveMealPlanRequest("Daily", List.of(items))); }
    void drink(User user, int ml) { water.saveAndFlush(WaterLog.builder().user(user).amountMl(ml).loggedAt(clock.instant()).build()); }
    Map<String, Object> row() { return workspace.members().getFirst(); }
    int percentage() { return ((Number) row().get("adherence")).intValue(); }
    void completeMeal(User user) {
        var first = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.now(clock.withZone(zone))).getFirst();
        first.setConsumed(true); meals.saveAndFlush(first);
    }
    Long habitId(User user, String title) { return plans.today(user.getEmail()).items().stream().filter(item -> item.title().equals(title)).findFirst().orElseThrow().id(); }

    @Test void includesHabitsAndPartialWaterButExcludesFutureSlotsAndCapsOverdrinking() {
        var user = member();
        plan(user, meal("Breakfast", 8), meal("Dinner", 20), habit("Stretch", 9), habit("Sleep", 22));
        completeMeal(user);
        plans.completeTask(user.getEmail(), habitId(user, "Stretch"));
        drink(user, 1000);
        assertThat(percentage()).isEqualTo(83); // (1 meal + 1 habit + 0.5 water) / 3
        drink(user, 5000);
        assertThat(percentage()).isEqualTo(100);
        assertThat(workspace.workspace().get("summary")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                .containsEntry("averageAdherence", 100L);
        plans.completeTask(user.getEmail(), habitId(user, "Sleep"));
        assertThat(percentage()).isEqualTo(100); // Early completion earns one point and one target.
        at("2026-09-05T21:00:00");
        assertThat(percentage()).isEqualTo(80); // Dinner is now due and unposted.
    }

    @Test void weeklyUsesUnroundedTotalsRatherThanAveragingDailyPercentages() {
        at("2026-09-04T21:00:00"); var user = member();
        plan(user, meal("Breakfast", 8), habit("Stretch", 9));
        completeMeal(user); plans.completeTask(user.getEmail(), habitId(user, "Stretch")); drink(user, 1000);
        assertThat(percentage()).isEqualTo(83);
        at("2026-09-05T21:00:00");
        plan(user, meal("Breakfast", 8), meal("Lunch", 13), meal("Dinner", 20), habit("Stretch", 9));
        assertThat(percentage()).isEqualTo(31); // Yesterday 2.5/3, today 0/5 -> 2.5/8.
        var series = (List<?>) row().get("adherenceSeries");
        assertThat(((Map<?, ?>) series.get(5)).get("value")).isEqualTo(83);
        assertThat(((Map<?, ?>) series.get(6)).get("value")).isEqualTo(0);
        assertThat(row().get("adherenceEstimatedHistory")).isEqualTo(false);
    }

    @Test void changingWaterGoalDoesNotRewritePreviousDaysTarget() {
        at("2026-09-04T21:00:00"); var user = member();
        users.lockById(user.getId()); adherence.captureToday(user.getId()); drink(user, 1000);
        at("2026-09-05T21:00:00");
        journals.updateWaterGoal(user.getId(), new UpdateMemberWaterGoalRequest(4000)); drink(user, 4000);
        assertThat(percentage()).isEqualTo(75); // Yesterday 50%, today 100%.
        assertThat(targets.findByUserIdAndTargetDate(user.getId(), LocalDate.of(2026, 9, 4)).orElseThrow().getWaterGoalMl()).isEqualTo(2000);
    }

    @Test void deletingHabitPreservesHistoricalTargetsAndTodaysCompletedEvidenceWithoutRepeatingIt() {
        at("2026-09-04T21:00:00"); var user = member();
        plan(user, habit("Stretch", 9), habit("Read", 10));
        var id = habitId(user, "Stretch");
        plans.completeTask(user.getEmail(), id); plans.completeTask(user.getEmail(), id); drink(user, 2000);
        assertThat(percentage()).isEqualTo(67); // 1 habit + water out of 3, no duplicate credit.
        plan(user);
        assertThat(percentage()).isEqualTo(100); // Removed uncompleted habit no longer due today.
        at("2026-09-05T21:00:00");
        users.lockById(user.getId()); adherence.ensureToday(user.getId()); drink(user, 2000);
        assertThat(percentage()).isEqualTo(100);
        assertThat(targets.findByUserIdAndTargetDate(user.getId(), LocalDate.of(2026, 9, 4)).orElseThrow().getHabitTargets()).contains("\"completed\":true");
        assertThat(targets.findByUserIdAndTargetDate(user.getId(), LocalDate.of(2026, 9, 5)).orElseThrow().getHabitTargets()).isEqualTo("[]");
    }

    @Test void untouchedWaterGoalOnlyBecomesDueAtDeadlineAndLocalDateBucketsAreCorrect() {
        var user = member(); users.lockById(user.getId()); adherence.captureToday(user.getId());
        assertThat((List<?>) row().get("adherenceSeries")).isEmpty();
        at("2026-09-05T20:00:00");
        assertThat(percentage()).isZero(); assertThat((List<?>) row().get("adherenceSeries")).hasSize(7);
        drink(user, 2000);
        at("2026-09-06T00:15:00");
        users.lockById(user.getId()); adherence.ensureToday(user.getId()); drink(user, 1000);
        assertThat(percentage()).isEqualTo(75); // 100% yesterday + 50% after local midnight.
    }

    @Test void olderMissingTargetsAreFlaggedAndDaysOutsideSevenDayWindowAreExcluded() {
        at("2026-08-28T21:00:00"); var user = member();
        plan(user, habit("Stretch", 9));
        at("2026-09-05T21:00:00");
        assertThat(row().get("adherenceEstimatedHistory")).isEqualTo(true);
        assertThat((List<?>) row().get("adherenceSeries")).hasSize(7);
        // The original day lies outside this week. Its completed water cannot inflate the result.
        water.saveAndFlush(WaterLog.builder().user(user).amountMl(6000).loggedAt(LocalDate.of(2026, 8, 28).atTime(21, 0).atZone(zone).toInstant()).build());
        assertThat(percentage()).isZero();
    }
}
