package com.wellnessapp;

import com.wellnessapp.dto.access.ReplaceMemberAccessRequest;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.*;
import java.util.List;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@SpringBootTest(properties = {"app.demo.seed-enabled=false",
        "spring.datasource.url=jdbc:h2:mem:nudge-concurrency;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"})
class MemberNudgeConcurrencyTests {
    @Autowired UserRepository users;
    @Autowired MissedEventRepository missed;
    @Autowired NotificationRepository notices;
    @Autowired MemberAccessService access;
    @Autowired ReminderService reminders;
    @MockitoBean Clock clock;

    private User member(String email) {
        return users.saveAndFlush(User.builder().email(email).fullName(email).passwordHash("test")
                .role(User.Role.USER).status(User.Status.ACTIVE).emailVerifiedAt(Instant.parse("2026-09-07T02:00:00Z")).build());
    }

    @Test void simultaneousAdminAndCoachRequestsSendOnlyOneNudgeToTheRecipient() throws Exception {
        var now = Instant.parse("2026-09-07T02:00:00Z");
        when(clock.instant()).thenReturn(now);
        when(clock.withZone(any())).thenAnswer(call -> Clock.fixed(now, call.getArgument(0)));
        var subject = member("recipient@race.test");
        var coach = member("coach@race.test");
        access.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(subject.getId())));
        var meal = missed.saveAndFlush(MissedEvent.builder().user(subject).sourceKey("race-meal")
                .itemType("Meals").itemTitle("Breakfast is overdue").missedAt(now.minusSeconds(3600)).build());
        var habit = missed.saveAndFlush(MissedEvent.builder().user(subject).sourceKey("race-habit")
                .itemType("Healthy habit").itemTitle("Stretch is overdue").missedAt(now.minusSeconds(3600)).build());
        var gate = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var admin = executor.submit(() -> { gate.await(); return reminders.nudge(meal.getId()).sent(); });
            var shared = executor.submit(() -> { gate.await(); return reminders.nudgeSharedAttention(coach.getEmail(), subject.getId(), habit.getId()).sent(); });
            gate.countDown();
            assertThat(List.of(admin.get(15, TimeUnit.SECONDS), shared.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder(true, false);
            assertThat(notices.findTop30ByUserIdOrderByScheduledAtDesc(subject.getId()).stream()
                    .filter(event -> event.getKind() == PushDelivery.Kind.NUDGE)).hasSize(1);
            assertThat(reminders.sharedAttention(coach.getEmail(), subject.getId())).allSatisfy(row -> {
                assertThat(row.get("status")).isEqualTo("NUDGED");
                assertThat(row.get("availableAt")).isEqualTo(now.plusSeconds(1800));
            });
        } finally { gate.countDown(); executor.shutdownNow(); }
    }
}
