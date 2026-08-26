package com.wellnessapp.config;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class AppConfig {
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final PlanRepository plans;
    private final PlanItemRepository planItems;
    private final MealRepository meals;
    private final MealItemRepository mealItems;
    private final ProductRepository products;
    private final NotificationRepository notifications;
    private final WaterLogRepository water;
    private final ActivitySessionRepository activities;
    private final PasswordEncoder encoder;
    private final ZoneId applicationZoneId;

    @Bean
    @ConditionalOnProperty(name = "app.demo.seed-enabled", havingValue = "true", matchIfMissing = true)
    CommandLineRunner seedDemoData() {
        return args -> {
            User aarav = users.findByEmailIgnoreCase("user@wellnest.app").orElseGet(this::seedPrimaryMember);
            if (!"Aarav Mehta".equals(aarav.getFullName())) {
                aarav.setFullName("Aarav Mehta");
                aarav = users.save(aarav);
            }
            User admin = users.findByEmailIgnoreCase("admin@wellnest.app").orElseGet(() -> users.save(User.builder()
                    .fullName("Arpan Admin").email("admin@wellnest.app").passwordHash(encoder.encode("password"))
                    .role(User.Role.ADMIN).status(User.Status.ACTIVE).build()));
            if (!"Arpan Admin".equals(admin.getFullName())) {
                admin.setFullName("Arpan Admin");
                users.save(admin);
            }

            seedSupportingMember("Kavya Menon", "kavya.menon@example.com", 1);
            seedSupportingMember("Rohan Das", "rohan.das@example.com", 2);
            seedSupportingMember("Anika Nair", "anika.nair@example.com", 3);
            seedSupportingMember("Vihaan Shah", "vihaan.shah@example.com", 4);

            if (products.count() == 0) {
                products.saveAll(List.of(
                        HerbalifeProduct.builder().sku("WN-PB-001").name("Protein blend").price(new BigDecimal("1399.00")).stockQuantity(340).active(true).build(),
                        HerbalifeProduct.builder().sku("WN-HT-002").name("Herbal tea concentrate").price(new BigDecimal("1799.00")).stockQuantity(18).active(true).build()));
            }
            if (notifications.count() == 0) {
                notifications.save(NotificationEvent.builder().user(aarav).title("Lunch in 30 minutes")
                        .body("Your green grain bowl is planned for 1:00 PM.").read(false).scheduledAt(Instant.now()).build());
            }
        };
    }

    private User seedPrimaryMember() {
        LocalDate today = LocalDate.now(applicationZoneId);
        User user = users.save(User.builder().fullName("Aarav Mehta").email("user@wellnest.app")
                .passwordHash(encoder.encode("password")).role(User.Role.USER).status(User.Status.ACTIVE).build());
        profiles.save(UserProfile.builder().user(user).goal("Build energy through steady nutrition and movement.")
                .heightCm(175).weightKg(72.5).waistCm(84.0).bodyFatPercent(19.2)
                .dietaryPreferences("Vegetarian").waterGoalMl(2500).build());
        Plan plan = plans.save(Plan.builder().user(user).title("Balanced energy")
                .goal("Steady energy throughout the day").startDate(today.minusDays(10)).endDate(today.plusDays(18)).active(true).build());
        planItems.saveAll(List.of(
                PlanItem.builder().plan(plan).type(PlanItem.Type.HYDRATION).title("Morning hydration").detail("500 ml before breakfast").scheduledTime(LocalTime.of(7, 30)).completed(true).sortOrder(1).build(),
                PlanItem.builder().plan(plan).type(PlanItem.Type.MEAL).title("Protein-led breakfast").detail("Within 90 minutes of waking").scheduledTime(LocalTime.of(8, 0)).completed(true).sortOrder(2).build(),
                PlanItem.builder().plan(plan).type(PlanItem.Type.ACTIVITY).title("Midday movement").detail("20 minute brisk walk").scheduledTime(LocalTime.of(12, 15)).completed(false).sortOrder(3).build(),
                PlanItem.builder().plan(plan).type(PlanItem.Type.MINDFULNESS).title("Evening reset").detail("5 minute breathing practice").scheduledTime(LocalTime.of(20, 30)).completed(false).sortOrder(4).build()));
        Meal breakfast = meals.save(Meal.builder().user(user).type("Breakfast").name("Oats, berries & seed crunch")
                .mealDate(today).mealTime(LocalTime.of(8, 0)).calories(410).proteinGrams(24).consumed(true).build());
        Meal lunch = meals.save(Meal.builder().user(user).type("Lunch").name("Green grain power bowl")
                .mealDate(today).mealTime(LocalTime.of(13, 0)).calories(520).proteinGrams(31).consumed(false).build());
        mealItems.saveAll(List.of(
                MealItem.builder().meal(breakfast).name("Rolled oats").quantity("60 g").build(),
                MealItem.builder().meal(breakfast).name("Greek yoghurt").quantity("150 g").build(),
                MealItem.builder().meal(lunch).name("Brown rice").quantity("120 g").build(),
                MealItem.builder().meal(lunch).name("Roasted chickpeas").quantity("100 g").build()));
        for (int i = 0; i < 5; i++) {
            water.save(WaterLog.builder().user(user).amountMl(250).loggedAt(Instant.now().minusSeconds(i * 3600L)).build());
        }
        activities.save(ActivitySession.builder().user(user).activity("Morning walk")
                .durationSeconds(34 * 60).distanceKm(2.8).startedAt(Instant.now()).build());
        return user;
    }

    private void seedSupportingMember(String name, String email, int offset) {
        if (users.existsByEmailIgnoreCase(email)) return;
        LocalDate today = LocalDate.now(applicationZoneId);
        User user = users.save(User.builder().fullName(name).email(email).passwordHash(encoder.encode("password"))
                .role(User.Role.USER).status(User.Status.ACTIVE).build());
        profiles.save(UserProfile.builder().user(user).heightCm(164 + offset * 3).weightKg(61.0 + offset * 4)
                .waistCm(72.0 + offset * 2).bodyFatPercent(17.0 + offset)
                .waterGoalMl(1750 + offset * 250).build());
        meals.saveAll(List.of(
                Meal.builder().user(user).type("Breakfast").name("Protein breakfast bowl").mealDate(today)
                        .mealTime(LocalTime.of(8, 0)).calories(390 + offset * 10).proteinGrams(22).consumed(true).build(),
                Meal.builder().user(user).type("Lunch").name("Balanced grain bowl").mealDate(today)
                        .mealTime(LocalTime.of(13, 0)).calories(490 + offset * 10).proteinGrams(28).consumed(offset < 3).build(),
                Meal.builder().user(user).type("Dinner").name("Vegetables and protein").mealDate(today)
                        .mealTime(LocalTime.of(19, 30)).calories(460).proteinGrams(27).consumed(false).build()));
        for (int i = 0; i < Math.max(2, 6 - offset); i++) {
            water.save(WaterLog.builder().user(user).amountMl(250).loggedAt(Instant.now().minusSeconds(i * 2700L)).build());
        }
        activities.save(ActivitySession.builder().user(user).activity(offset % 2 == 0 ? "Strength session" : "Walk")
                .durationSeconds((18 + offset * 4) * 60).distanceKm(offset % 2 == 0 ? null : 1.5 + offset * 0.2)
                .startedAt(Instant.now().minusSeconds(offset * 900L)).build());
    }
}
