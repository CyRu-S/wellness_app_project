package com.wellnessapp.config;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

@Configuration @RequiredArgsConstructor
public class AppConfig {
    private final UserRepository users; private final UserProfileRepository profiles; private final PlanRepository plans; private final PlanItemRepository planItems; private final MealRepository meals; private final MealItemRepository mealItems; private final ProductRepository products; private final NotificationRepository notifications; private final WaterLogRepository water; private final ActivitySessionRepository activities; private final PasswordEncoder encoder;

    @Bean CommandLineRunner seedDemoData() {
        return args -> {
            if (users.count() > 0) return;
            User user = users.save(User.builder().fullName("Aarav").email("user@wellnest.app").passwordHash(encoder.encode("password")).role(User.Role.USER).status(User.Status.ACTIVE).build());
            users.save(User.builder().fullName("Maya Admin").email("admin@wellnest.app").passwordHash(encoder.encode("password")).role(User.Role.ADMIN).status(User.Status.ACTIVE).build());
            profiles.save(UserProfile.builder().user(user).goal("Build energy through steady nutrition and movement.").heightCm(175).weightKg(72.5).dietaryPreferences("Vegetarian").build());
            Plan plan = plans.save(Plan.builder().user(user).title("Balanced energy").goal("Steady energy throughout the day").startDate(LocalDate.now().minusDays(10)).endDate(LocalDate.now().plusDays(18)).active(true).build());
            planItems.saveAll(List.of(
                PlanItem.builder().plan(plan).type(PlanItem.Type.HYDRATION).title("Morning hydration").detail("500 ml before breakfast").scheduledTime(LocalTime.of(7, 30)).completed(true).sortOrder(1).build(),
                PlanItem.builder().plan(plan).type(PlanItem.Type.MEAL).title("Protein-led breakfast").detail("Within 90 minutes of waking").scheduledTime(LocalTime.of(8, 0)).completed(true).sortOrder(2).build(),
                PlanItem.builder().plan(plan).type(PlanItem.Type.ACTIVITY).title("Midday movement").detail("20 minute brisk walk").scheduledTime(LocalTime.of(12, 15)).completed(false).sortOrder(3).build(),
                PlanItem.builder().plan(plan).type(PlanItem.Type.MINDFULNESS).title("Evening reset").detail("5 minute breathing practice").scheduledTime(LocalTime.of(20, 30)).completed(false).sortOrder(4).build()
            ));
            Meal breakfast = meals.save(Meal.builder().user(user).type("Breakfast").name("Oats, berries & seed crunch").mealDate(LocalDate.now()).mealTime(LocalTime.of(8, 0)).calories(410).proteinGrams(24).consumed(true).build());
            Meal lunch = meals.save(Meal.builder().user(user).type("Lunch").name("Green grain power bowl").mealDate(LocalDate.now()).mealTime(LocalTime.of(13, 0)).calories(520).proteinGrams(31).consumed(false).build());
            mealItems.saveAll(List.of(MealItem.builder().meal(breakfast).name("Rolled oats").quantity("60 g").build(), MealItem.builder().meal(breakfast).name("Greek yoghurt").quantity("150 g").build(), MealItem.builder().meal(lunch).name("Brown rice").quantity("120 g").build(), MealItem.builder().meal(lunch).name("Roasted chickpeas").quantity("100 g").build()));
            products.saveAll(List.of(HerbalifeProduct.builder().sku("WN-PB-001").name("Protein blend").price(new BigDecimal("1399.00")).stockQuantity(340).active(true).build(), HerbalifeProduct.builder().sku("WN-HT-002").name("Herbal tea concentrate").price(new BigDecimal("1799.00")).stockQuantity(18).active(true).build()));
            notifications.save(NotificationEvent.builder().user(user).title("Lunch in 30 minutes").body("Your green grain bowl is planned for 1:00 PM.").read(false).scheduledAt(Instant.now()).build());
            for (int i = 0; i < 5; i++) water.save(WaterLog.builder().user(user).amountMl(250).loggedAt(Instant.now().minusSeconds(i * 3600L)).build());
            activities.save(ActivitySession.builder().user(user).activity("Morning walk").durationSeconds(34 * 60).distanceKm(2.8).startedAt(Instant.now()).build());
        };
    }
}

