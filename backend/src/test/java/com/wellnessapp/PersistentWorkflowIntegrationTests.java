package com.wellnessapp;

import com.fasterxml.jackson.databind.*;
import com.wellnessapp.dto.plan.SaveMealPlanRequest;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.wellnessapp.security.JwtTokenProvider;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.demo.seed-enabled=false", "spring.datasource.url=jdbc:h2:mem:workflows;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"})
@AutoConfigureMockMvc @Transactional
class PersistentWorkflowIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired UserProfileRepository profiles;
    @Autowired MealRepository meals;
    @Autowired MealPostRepository posts;
    @Autowired JwtTokenProvider tokens;
    @Autowired PlanService plans;
    @Autowired ReminderService reminders;
    @MockitoBean Clock clock;
    private final ZoneId zone = ZoneId.of("Asia/Kolkata");
    private final byte[] png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=");
    @BeforeEach void time() { setTime("2026-09-05T04:30:00Z"); }
    void setTime(String time) { var fixed = Clock.fixed(Instant.parse(time), zone); when(clock.instant()).thenReturn(fixed.instant()); when(clock.withZone(zone)).thenReturn(fixed); }
    String admin() { return "Bearer " + tokens.generate("admin@mr-care.app", "ROLE_ADMIN"); }
    String token(User u) { return "Bearer " + tokens.generate(u.getEmail(), "ROLE_USER"); }
    Map<String, Object> registration(String email) { return Map.of("name", "Test Member", "email", email, "password", "MemberPass123!", "age", 28, "heightCm", 174, "weightKg", 72.4, "goal", "Wellness", "notes", "Vegetarian"); }
    User register(String email) throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(registration(email))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING")).andExpect(jsonPath("$.token").isEmpty());
        return users.findByEmailIgnoreCase(email).orElseThrow();
    }
    User approve(String email) throws Exception {
        var user = register(email);
        mvc.perform(patch("/api/admin/users/{id}/approval", user.getId()).header("Authorization", admin()).contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isNoContent());
        return user;
    }
    void plan(User u) {
        plans.save(u.getId(), new SaveMealPlanRequest("Daily balance", List.of(new SaveMealPlanRequest.Item("Breakfast", "Oats", LocalTime.of(8, 0), 400, 20, List.of("Oats", "Milk")))));
    }

    @Test void startsWithOnlyAdminAndEmptyWorkspace() throws Exception {
        assertThat(users.findAll()).hasSize(1);
        mvc.perform(get("/api/admin/workspace").header("Authorization", admin())).andExpect(status().isOk())
                .andExpect(jsonPath("$.members").isEmpty()).andExpect(jsonPath("$.approvals").isEmpty())
                .andExpect(jsonPath("$.attention").isEmpty()).andExpect(jsonPath("$.summary.mealLogsToday").value(0))
                .andExpect(jsonPath("$.mealInsights.ranges.TODAY.series").isEmpty());
    }

    @Test void registrationRequiresApprovalAndApprovedMemberStartsEmpty() throws Exception {
        var user = register("approval@example.com");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"approval@example.com\",\"password\":\"MemberPass123!\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/dashboard").header("Authorization", token(user))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/workspace").header("Authorization", admin())).andExpect(jsonPath("$.approvals.length()").value(1));
        mvc.perform(patch("/api/admin/users/{id}/approval", user.getId()).header("Authorization", admin()).contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/dashboard").header("Authorization", token(user))).andExpect(status().isOk())
                .andExpect(jsonPath("$.completion").value(0)).andExpect(jsonPath("$.calories").value(0)).andExpect(jsonPath("$.protein").value(0))
                .andExpect(jsonPath("$.waterGlasses").value(0)).andExpect(jsonPath("$.streak").value(0)).andExpect(jsonPath("$.activeMinutes").value(0));
        mvc.perform(get("/api/meals/today").header("Authorization", token(user))).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/activities").header("Authorization", token(user))).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/shared-members").header("Authorization", token(user))).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/profile").header("Authorization", token(user))).andExpect(jsonPath("$.age").value(28));
        mvc.perform(get("/api/admin/workspace").header("Authorization", token(user))).andExpect(status().isForbidden());
    }

    @Test void storesRegistrationPhotoInDatabaseAndProtectsIt() throws Exception {
        var metadata = new MockMultipartFile("profile", "", "text/plain", json.writeValueAsBytes(registration("photo@example.com")));
        mvc.perform(multipart("/api/auth/register").file(metadata).file(new MockMultipartFile("image", "profile.png", "image/png", png)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.token").isEmpty());
        var user = users.findByEmailIgnoreCase("photo@example.com").orElseThrow();
        mvc.perform(get("/api/admin/users/{id}/profile-photo", user.getId()).header("Authorization", admin())).andExpect(status().isOk()).andExpect(content().bytes(png));
        user.setStatus(User.Status.ACTIVE); users.saveAndFlush(user);
        mvc.perform(get("/api/profile/photo").header("Authorization", token(user))).andExpect(status().isOk()).andExpect(content().bytes(png));
        mvc.perform(get("/api/profile/photo")).andExpect(status().isUnauthorized());
    }

    @Test void dietPlanRepeatsWithoutDuplicateMealsAndResetsNextDay() throws Exception {
        var user = approve("plan@example.com"); plan(user);
        plans.ensureDailyMeals(user.getId()); plans.ensureDailyMeals(user.getId());
        var today = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.of(2026, 9, 5));
        assertThat(today).hasSize(1); today.getFirst().setConsumed(true); meals.saveAndFlush(today.getFirst());
        setTime("2026-09-06T04:30:00Z");
        plans.ensureDailyMeals(user.getId());
        assertThat(meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.of(2026, 9, 6))).hasSize(1).allMatch(m -> !m.isConsumed());
        assertThat(meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.of(2026, 9, 5))).hasSize(1).allMatch(Meal::isConsumed);
    }

    @Test void mealWaterAndTimerAppearInAdminJournalAndDashboard() throws Exception {
        var user = approve("journal@example.com"); plan(user);
        var meal = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.of(2026, 9, 5)).getFirst();
        var metadata = new MockMultipartFile("metadata", "", "text/plain", json.writeValueAsBytes(Map.of("plannedMealId", meal.getId(), "mealType", "Breakfast", "mealName", "Oats and fruit", "calories", 450, "proteinGrams", 25, "carbsGrams", 60, "fatGrams", 12, "clientRequestId", "test-post")));
        for (int i = 0; i < 2; i++) mvc.perform(multipart("/api/meal-posts").file(metadata).file(new MockMultipartFile("image", "meal.png", "image/png", png)).header("Authorization", token(user))).andExpect(status().isCreated());
        assertThat(posts.count()).isEqualTo(1);
        mvc.perform(post("/api/water").header("Authorization", token(user)).contentType(MediaType.APPLICATION_JSON).content("{\"amountMl\":250}")).andExpect(status().isCreated());
        mvc.perform(post("/api/activities").header("Authorization", token(user)).contentType(MediaType.APPLICATION_JSON).content("{\"activity\":\"Walk\",\"durationSeconds\":120}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/admin/users/{id}/journal", user.getId()).header("Authorization", admin())).andExpect(status().isOk())
                .andExpect(jsonPath("$.today.summary.calories").value(450)).andExpect(jsonPath("$.today.summary.proteinGrams").value(25))
                .andExpect(jsonPath("$.today.summary.hydrationMl").value(250)).andExpect(jsonPath("$.today.activities[0].durationMinutes").value(2))
                .andExpect(jsonPath("$.today.meals[0].imageUrl").isNotEmpty());
        mvc.perform(get("/api/dashboard").header("Authorization", token(user))).andExpect(jsonPath("$.calories").value(450)).andExpect(jsonPath("$.completion").value(100));
        mvc.perform(get("/api/admin/workspace").header("Authorization", admin())).andExpect(status().isOk()).andExpect(jsonPath("$.summary.mealLogsToday").value(1));
        plan(user);
        assertThat(posts.count()).isEqualTo(1);
    }

    @Test void adherenceChartUsesSavedMealsAcrossDaysAndStartsEmpty() throws Exception {
        var user = approve("charts@example.com");
        mvc.perform(get("/api/admin/workspace").header("Authorization", admin()))
                .andExpect(jsonPath("$.members[0].adherenceSeries").isEmpty());
        plan(user);
        var meal = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.of(2026, 9, 5)).getFirst();
        meal.setConsumed(true); meals.saveAndFlush(meal);
        setTime("2026-09-06T04:30:00Z");
        mvc.perform(get("/api/admin/workspace").header("Authorization", admin())).andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].adherenceSeries.length()").value(7))
                .andExpect(jsonPath("$.members[0].adherenceSeries[5].value").value(100))
                .andExpect(jsonPath("$.members[0].adherenceSeries[6].value").value(0))
                .andExpect(jsonPath("$.members[0].adherence").value(50))
                .andExpect(jsonPath("$.mealInsights.ranges['7D'].totalLogs").value(1))
                .andExpect(jsonPath("$.mealInsights.ranges['7D'].completionRate").value(50))
                .andExpect(jsonPath("$.mealInsights.ranges['7D'].series.length()").value(7))
                .andExpect(jsonPath("$.mealInsights.ranges['30D'].series.length()").value(30));
    }

    @Test void attentionAndRemindersOnlyComeFromAssignedOverdueMeals() throws Exception {
        var user = approve("reminder@example.com"); reminders.refresh(); assertThat(reminders.attention()).isEmpty();
        plan(user); reminders.refresh(); reminders.refresh(); assertThat(reminders.attention()).hasSize(1);
        var meal = meals.findByUserIdAndMealDateOrderByMealTime(user.getId(), LocalDate.of(2026, 9, 5)).getFirst();
        meal.setConsumed(true); meals.saveAndFlush(meal); reminders.refresh(); assertThat(reminders.attention()).isEmpty();
    }
}
