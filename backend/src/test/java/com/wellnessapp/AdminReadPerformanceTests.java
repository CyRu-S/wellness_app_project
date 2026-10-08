package com.wellnessapp;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.wellnessapp.security.JwtTokenProvider;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.demo.seed-enabled=false",
        "spring.datasource.url=jdbc:h2:mem:admin-performance;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.jpa.properties.hibernate.generate_statistics=true"})
@AutoConfigureMockMvc @Transactional
class AdminReadPerformanceTests {
    @Autowired MockMvc mvc;
    @Autowired EntityManager entityManager;
    @Autowired UserRepository users;
    @Autowired UserProfileRepository profiles;
    @Autowired PlanRepository plans;
    @Autowired PlanItemRepository items;
    @Autowired MealRepository meals;
    @Autowired MissedEventRepository missed;
    @Autowired JwtTokenProvider tokens;

    private void member(int index) {
        var user = users.save(User.builder().email("performance-" + index + "@example.com").fullName("Member " + index)
                .passwordHash("test-only").role(User.Role.USER).status(User.Status.ACTIVE).emailVerifiedAt(Instant.now()).build());
        profiles.save(UserProfile.builder().user(user).waterGoalMl(2000).build());
        var date = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        var plan = plans.save(Plan.builder().user(user).title("Daily " + index).goal("").active(true)
                .startDate(date.minusDays(1)).endDate(date.plusDays(30)).build());
        var item = items.save(PlanItem.builder().plan(plan).type(PlanItem.Type.MEAL).mealType("Breakfast").title("Oats")
                .detail("").scheduledTime(LocalTime.of(8, 0)).calories(300).proteinGrams(12).build());
        meals.save(Meal.builder().user(user).planItem(item).mealDate(date).mealTime(LocalTime.of(8, 0))
                .type("Breakfast").name("Oats").calories(300).proteinGrams(12).build());
        missed.save(MissedEvent.builder().user(user).sourceKey("performance-" + index).itemType("Meals")
                .itemTitle("Breakfast overdue").missedAt(Instant.now().minusSeconds(14400)).build());
    }

    private long reads(String path, String token) throws Exception {
        entityManager.flush(); entityManager.clear();
        var statistics = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertThat(statistics.getEntityInsertCount()).as("GET must not insert reminders or meals").isZero();
        assertThat(statistics.getEntityUpdateCount()).as("GET must not update any members").isZero();
        assertThat(statistics.getEntityDeleteCount()).isZero();
        return statistics.getPrepareStatementCount();
    }

    @Test void adminReadsUseBoundedQueriesAndNeverGenerateReminders() throws Exception {
        var admin = users.findByEmailIgnoreCase("admin@mr-care.app").orElseThrow();
        var token = tokens.generate(admin.getEmail(), "ROLE_ADMIN");
        member(0);
        long oneMembers = reads("/api/admin/members", token);
        long oneWorkspace = reads("/api/admin/workspace", token);
        long oneAttention = reads("/api/admin/attention", token);
        for (int i = 1; i < 30; i++) member(i);
        long manyMembers = reads("/api/admin/members", token);
        long manyWorkspace = reads("/api/admin/workspace", token);
        long manyAttention = reads("/api/admin/attention", token);
        assertThat(manyMembers).isLessThanOrEqualTo(oneMembers + 2);
        assertThat(manyWorkspace).isLessThanOrEqualTo(oneWorkspace + 2);
        assertThat(manyAttention).isLessThanOrEqualTo(oneAttention + 2);
        System.out.printf("Admin SQL counts (1 / 30 members): members=%d/%d, workspace=%d/%d, attention=%d/%d%n",
                oneMembers, manyMembers, oneWorkspace, manyWorkspace, oneAttention, manyAttention);
    }
}
