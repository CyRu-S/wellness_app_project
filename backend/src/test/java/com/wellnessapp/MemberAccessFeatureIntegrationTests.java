package com.wellnessapp;

import com.wellnessapp.dto.access.ReplaceMemberAccessRequest;
import com.wellnessapp.dto.access.MemberNudgeType;
import com.wellnessapp.dto.mealpost.CreateMealPostRequest;
import com.wellnessapp.dto.profile.BodyMetricsRequest;
import com.wellnessapp.dto.profile.UpdateProfileRequest;
import com.wellnessapp.entity.User;
import com.wellnessapp.entity.MissedEvent;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.MealRepository;
import com.wellnessapp.repository.HealthProfileHistoryRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
class MemberAccessFeatureIntegrationTests {
    @Autowired MemberAccessService memberAccess;
    @Autowired PlanService plans;
    @Autowired ReminderService reminders;
    @Autowired AdminMemberJournalService journals;
    @Autowired MealPostService mealPosts;
    @Autowired ProfileService profiles;
    @Autowired UserRepository users;
    @Autowired MealRepository meals;
    @Autowired HealthProfileHistoryRepository healthHistory;
    @Autowired com.wellnessapp.repository.NotificationRepository notifications;
    @Autowired com.wellnessapp.repository.MissedEventRepository missedEvents;
    @Autowired AdminWorkspaceService workspace;
    @Autowired WorkflowNotificationService workflowNotifications;
    @Autowired java.time.Clock clock;
    @Autowired ZoneId applicationZoneId;

    @Test
    void replacesUnlimitedAssignmentsDeduplicatesAndRevokesAtomically() {
        User aarav = user("user@mr-care.app");
        User kavya = user("kavya.menon@example.com");
        User rohan = user("rohan.das@example.com");

        var assigned = memberAccess.replaceAssignments(
                "admin@mr-care.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of(kavya.getId(), rohan.getId(), kavya.getId())));
        assertThat(assigned.assignedMembers()).extracting(item -> item.id()).containsExactly(kavya.getId(), rohan.getId());
        assertThat(memberAccess.sharedMembers(aarav.getEmail()).members()).hasSize(2);

        var revoked = memberAccess.replaceAssignments(
                "admin@mr-care.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of()));
        assertThat(revoked.assignedMembers()).isEmpty();
        assertThat(memberAccess.sharedMembers(aarav.getEmail()).members()).isEmpty();
    }

    @Test
    void preventsSelfAccessAndRejectsNonUserSubjects() {
        User aarav = user("user@mr-care.app");
        User admin = user("admin@mr-care.app");

        assertThatThrownBy(() -> memberAccess.replaceAssignments(
                admin.getEmail(), aarav.getId(), new ReplaceMemberAccessRequest(List.of(aarav.getId()))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> memberAccess.replaceAssignments(
                admin.getEmail(), aarav.getId(), new ReplaceMemberAccessRequest(List.of(admin.getId()))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void hidesUngrantedMembersAndReturnsOnlyTodaysOperationalSnapshot() {
        User aarav = user("user@mr-care.app");
        User kavya = user("kavya.menon@example.com");

        assertThatThrownBy(() -> memberAccess.sharedMemberToday(aarav.getEmail(), kavya.getId()))
                .isInstanceOf(NotFoundException.class);

        memberAccess.replaceAssignments("admin@mr-care.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of(kavya.getId())));
        var today = memberAccess.sharedMemberToday(aarav.getEmail(), kavya.getId());
        assertThat(today.member().name()).isEqualTo("Kavya Menon");
        assertThat(today.date()).isEqualTo(LocalDate.now(applicationZoneId));
        assertThat(today.meals()).hasSize(3);
        assertThat(today.summary().hydrationMl()).isPositive();
        assertThat(today.summary().activityMinutes()).isPositive();
    }

    @Test
    void assignedCoachCanReadTheSameMealHistoryAndHealthReportsAsAdmin() {
        User coach = user("user@mr-care.app");
        User member = user("kavya.menon@example.com");
        profiles.update(member.getEmail(), new UpdateProfileRequest(member.getFullName(), "High protein", null, null));
        assertThat(healthHistory.findTop52ByUserIdOrderByRecordedAtDesc(member.getId())).isEmpty();
        profiles.updateBodyMetrics(member.getEmail(), new BodyMetricsRequest(168, 62.5, 31, 22.0));

        assertThatThrownBy(() -> journals.getShared(coach.getEmail(), member.getId()))
                .isInstanceOf(NotFoundException.class);
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));

        var adminJournal = journals.get(member.getId());
        var coachJournal = journals.getShared(coach.getEmail(), member.getId());
        assertThat(coachJournal.history()).isEqualTo(adminJournal.history());
        assertThat(coachJournal.healthReports()).isEqualTo(adminJournal.healthReports()).hasSize(1);
    }

    @Test
    void suspendedViewersAndSubjectsImmediatelyLoseAccess() {
        User aarav = user("user@mr-care.app");
        User kavya = user("kavya.menon@example.com");
        memberAccess.replaceAssignments("admin@mr-care.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of(kavya.getId())));

        aarav.setStatus(User.Status.SUSPENDED);
        users.saveAndFlush(aarav);
        assertThat(memberAccess.sharedMembers(aarav.getEmail()).members()).isEmpty();
        assertThatThrownBy(() -> memberAccess.sharedMemberToday(aarav.getEmail(), kavya.getId()))
                .isInstanceOf(NotFoundException.class);

        aarav.setStatus(User.Status.ACTIVE);
        kavya.setStatus(User.Status.SUSPENDED);
        users.saveAllAndFlush(List.of(aarav, kavya));
        assertThatThrownBy(() -> memberAccess.sharedMemberToday(aarav.getEmail(), kavya.getId()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void enforcesWeeklyBodyMetricUpdates() {
        var updated = profiles.updateBodyMetrics("user@mr-care.app", new BodyMetricsRequest(176, 71.8, 28, 18.5));
        assertThat(updated.age()).isEqualTo(28);
        assertThat(updated.lastBodyMetricsUpdatedAt()).isNotNull();

        assertThatThrownBy(() -> profiles.updateBodyMetrics(
                "user@mr-care.app", new BodyMetricsRequest(176, 71.5, 28, 18.0)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void dailyHabitsAndCoachExercisesExposeCompletionToAdminAndAssignedCoach() {
        User coach = user("user@mr-care.app");
        User member = user("rohan.das@example.com");
        var saved = plans.save(member.getId(), new com.wellnessapp.dto.plan.SaveMealPlanRequest("Coach plan", List.of(
                new com.wellnessapp.dto.plan.SaveMealPlanRequest.Item("Healthy habit", "Morning sunlight", java.time.LocalTime.of(7, 0), 0, 0, List.of(), null, "HEALTHY_HABIT", "Wellbeing"),
                new com.wellnessapp.dto.plan.SaveMealPlanRequest.Item("Coach exercise", "Strength circuit", java.time.LocalTime.of(17, 0), 0, 0, List.of(), null, "ACTIVITY", "Coach exercise"))));
        Long exerciseId = ((Number) ((java.util.List<?>) saved.get("exercises")).stream()
                .map(value -> (java.util.Map<?, ?>) value).findFirst().orElseThrow().get("id")).longValue();
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));

        var before = memberAccess.adminMemberToday(member.getId());
        assertThat(before.tasks()).hasSize(2).allMatch(task -> !task.completed());
        plans.completeTask(member.getEmail(), exerciseId);
        var coachView = memberAccess.sharedMemberToday(coach.getEmail(), member.getId());
        assertThat(coachView.summary().completedTasks()).isEqualTo(1);
        assertThat(coachView.summary().completionPercentage()).isGreaterThan(before.summary().completionPercentage());
        assertThat(coachView.tasks()).anySatisfy(task -> {
            assertThat(task.type()).isEqualTo("ACTIVITY");
            assertThat(task.completed()).isTrue();
            assertThat(task.completedAt()).isNotNull();
        });
    }

    @Test
    void assignedCoachNudgesHaveAThirtyMinuteSharedCooldownPerRecipient() {
        User coach = user("user@mr-care.app");
        User secondCoach = user("rohan.das@example.com");
        User member = user("kavya.menon@example.com");
        assertThatThrownBy(() -> reminders.nudgeSharedMember(coach.getEmail(), member.getId(), MemberNudgeType.HABITS))
                .isInstanceOf(NotFoundException.class);
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));
        memberAccess.replaceAssignments("admin@mr-care.app", secondCoach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));
        assertThat(memberAccess.sharedMembers(coach.getEmail()).members().getFirst().nudgedToday()).isFalse();
        assertThat(memberAccess.sharedMembers(secondCoach.getEmail()).members().getFirst().nudgedToday()).isFalse();
        var first = reminders.nudgeSharedMember(coach.getEmail(), member.getId(), MemberNudgeType.HABITS);
        var repeatedByAnotherCoach = reminders.nudgeSharedMember(secondCoach.getEmail(), member.getId(), MemberNudgeType.HABITS);
        var differentType = reminders.nudgeSharedMember(secondCoach.getEmail(), member.getId(), MemberNudgeType.MEALS);
        assertThat(first.sent()).isTrue();
        assertThat(repeatedByAnotherCoach.sent()).isFalse();
        assertThat(repeatedByAnotherCoach.availableAt()).isEqualTo(first.availableAt());
        assertThat(differentType.sent()).isFalse();
        assertThat(memberAccess.sharedMembers(coach.getEmail()).members().getFirst().nudgedToday()).isTrue();
        assertThat(memberAccess.sharedMembers(secondCoach.getEmail()).members().getFirst().nudgedToday()).isTrue();
        assertThat(notifications.findTop30ByUserIdOrderByScheduledAtDesc(member.getId()).stream()
                .filter(event -> event.getKind() == com.wellnessapp.entity.PushDelivery.Kind.NUDGE)).hasSize(1);
        assertThat(memberAccess.sharedMemberToday(coach.getEmail(), member.getId()).nudges())
                .filteredOn(option -> option.type() == MemberNudgeType.HABITS)
                .singleElement().satisfies(option -> assertThat(option.availableAt()).isEqualTo(first.availableAt()));
    }

    @Test
    void adminNudgeIsImmediatelySharedWithEveryAssignedCoach() {
        User coach = user("user@mr-care.app");
        User secondCoach = user("rohan.das@example.com");
        User member = user("kavya.menon@example.com");
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));
        memberAccess.replaceAssignments("admin@mr-care.app", secondCoach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));

        var item = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("admin-test")
                .itemType("Healthy habit").itemTitle("Stretch overdue").missedAt(clock.instant()).build());
        reminders.nudge(item.getId());

        assertThat(memberAccess.sharedMembers(coach.getEmail()).members().getFirst().nudgedToday()).isTrue();
        assertThat(memberAccess.sharedMembers(secondCoach.getEmail()).members().getFirst().nudgedToday()).isTrue();
        assertThat(reminders.nudgeSharedMember(coach.getEmail(), member.getId(), MemberNudgeType.HABITS).sent()).isFalse();
    }

    @Test
    void attentionCountsDropForEveryNudgeTypeOfTheRecipient() {
        User coach = user("user@mr-care.app");
        User member = user("kavya.menon@example.com");
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));
        missedEvents.saveAllAndFlush(List.of(
                MissedEvent.builder().user(member).sourceKey("test-meal-attention").itemType("Meals")
                        .itemTitle("Test breakfast is overdue").missedAt(clock.instant().minusSeconds(14400)).build(),
                MissedEvent.builder().user(member).sourceKey("test-habit-attention").itemType("Healthy habit")
                        .itemTitle("Test walk is overdue").missedAt(clock.instant().minusSeconds(14400)).build()));

        reminders.nudgeSharedMember(coach.getEmail(), member.getId(), MemberNudgeType.MEALS);
        var memberAttention = reminders.attention().stream()
                .filter(item -> member.getId().equals(item.get("memberId")))
                .filter(item -> ((String) item.get("title")).startsWith("Test "))
                .toList();
        assertThat(memberAttention).anySatisfy(item -> {
            assertThat(item.get("title")).isEqualTo("Test breakfast is overdue");
            assertThat(item.get("status")).isEqualTo("NUDGED");
        }).anySatisfy(item -> {
            assertThat(item.get("title")).isEqualTo("Test walk is overdue");
            assertThat(item.get("status")).isEqualTo("NUDGED");
        });
        long openCount = reminders.attention().stream().filter(item -> "OPEN".equals(item.get("status"))).count();
        assertThat(((Number) ((java.util.Map<?, ?>) workspace.workspace().get("summary")).get("missedItems")).longValue())
                .isEqualTo(openCount);
    }

    @Test
    void sharedAttentionMatchesTheAdminsActualItemsAndMessagesForOnlyTheAssignedMember() {
        User coach = user("user@mr-care.app");
        User member = user("kavya.menon@example.com");
        User other = user("rohan.das@example.com");
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));
        var breakfast = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("shared-breakfast")
                .itemType("Meals").itemTitle("Breakfast is overdue").missedAt(clock.instant().minusSeconds(14400)).build());
        var lunch = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("shared-lunch")
                .itemType("Meals").itemTitle("Lunch is overdue").missedAt(clock.instant().minusSeconds(4000)).build());
        var sleep = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("shared-sleep")
                .itemType("Sleep").itemTitle("Evening wind-down is overdue").missedAt(clock.instant().minusSeconds(3900)).build());
        var resolved = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("shared-resolved")
                .itemType("Activity").itemTitle("Completed exercise").missedAt(clock.instant()).resolved(true).build());
        var otherItem = missedEvents.saveAndFlush(MissedEvent.builder().user(other).sourceKey("shared-other")
                .itemType("Meals").itemTitle("Private lunch").missedAt(clock.instant()).build());

        assertThat(reminders.sharedAttention(coach.getEmail(), member.getId()))
                .isEqualTo(reminders.attention().stream().filter(row -> member.getId().equals(row.get("memberId"))).toList())
                .extracting(row -> row.get("id")).contains(breakfast.getId(), lunch.getId(), sleep.getId())
                .doesNotContain(resolved.getId(), otherItem.getId());
        var sent = reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), breakfast.getId());
        assertThat(sent.sent()).isTrue();
        assertThat(notifications.findTop30ByUserIdOrderByScheduledAtDesc(member.getId()))
                .anySatisfy(event -> assertThat(event.getBody()).isEqualTo("Take your scheduled breakfast and post the check-in."));
        assertThat(reminders.sharedAttention(coach.getEmail(), member.getId()))
                .filteredOn(row -> "MEALS".equals(row.get("type")))
                .allSatisfy(row -> {
                    assertThat(row.get("status")).isEqualTo("NUDGED");
                    assertThat((java.time.Instant) row.get("availableAt"))
                            .isCloseTo(sent.availableAt(), within(1, java.time.temporal.ChronoUnit.MILLIS));
                });
        assertThat(reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), lunch.getId()).sent()).isFalse();
        assertThat(reminders.sharedAttention(coach.getEmail(), member.getId()))
                .isEqualTo(reminders.attention().stream().filter(row -> member.getId().equals(row.get("memberId"))).toList());

        member.setLastNudgedAt(clock.instant().minusSeconds(1860));
        users.saveAndFlush(member);
        assertThat(reminders.sharedAttention(coach.getEmail(), member.getId()))
                .filteredOn(row -> "MEALS".equals(row.get("type")))
                .allSatisfy(row -> assertThat(row.get("status")).isEqualTo("OPEN"));
        reminders.nudge(lunch.getId());
        assertThat(reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), breakfast.getId()).sent()).isFalse();
        var hydration = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("shared-water")
                .itemType("Hydration").itemTitle("Daily hydration goal is overdue").missedAt(clock.instant()).build());
        assertThat(reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), hydration.getId()).sent()).isFalse();
        member.setLastNudgedAt(clock.instant().minusSeconds(1860));
        users.saveAndFlush(member);
        assertThat(reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), hydration.getId()).sent()).isTrue();
        assertThat(notifications.findTop30ByUserIdOrderByScheduledAtDesc(member.getId()))
                .anySatisfy(event -> assertThat(event.getBody()).isEqualTo("Drink water and log your intake."));
    }

    @Test
    void sharedAttentionRejectsUnassignedMembersWrongItemOwnersResolvedItemsAndRevokedAccess() {
        User coach = user("user@mr-care.app");
        User member = user("kavya.menon@example.com");
        User other = user("rohan.das@example.com");
        var item = missedEvents.saveAndFlush(MissedEvent.builder().user(member).sourceKey("shared-permissions")
                .itemType("Meals").itemTitle("Lunch is overdue").missedAt(clock.instant()).build());
        var otherItem = missedEvents.saveAndFlush(MissedEvent.builder().user(other).sourceKey("shared-private")
                .itemType("Meals").itemTitle("Dinner is overdue").missedAt(clock.instant()).build());
        assertThatThrownBy(() -> reminders.sharedAttention(coach.getEmail(), member.getId())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), item.getId())).isInstanceOf(NotFoundException.class);
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of(member.getId())));
        assertThatThrownBy(() -> reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), otherItem.getId())).isInstanceOf(NotFoundException.class);
        item.setResolved(true); missedEvents.saveAndFlush(item);
        assertThatThrownBy(() -> reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), item.getId())).isInstanceOf(BadRequestException.class);
        memberAccess.replaceAssignments("admin@mr-care.app", coach.getId(), new ReplaceMemberAccessRequest(List.of()));
        assertThatThrownBy(() -> reminders.sharedAttention(coach.getEmail(), member.getId())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> reminders.nudgeSharedAttention(coach.getEmail(), member.getId(), item.getId())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void storesIdempotentMealPostAndProtectsItsImage() {
        User aarav = user("user@mr-care.app");
        User kavya = user("kavya.menon@example.com");
        Long plannedMealId = meals.findByUserIdAndMealDateOrderByMealTime(
                aarav.getId(), LocalDate.now(applicationZoneId)).getFirst().getId();
        CreateMealPostRequest metadata = new CreateMealPostRequest(
                plannedMealId, "Breakfast", "Oats and fruit", new BigDecimal("410.25"), new BigDecimal("24.75"), new BigDecimal("55.50"), new BigDecimal("12.125"), "integration-test-post");
        MockMultipartFile image = new MockMultipartFile(
                "image", "breakfast.png", "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1});

        var created = mealPosts.create(aarav.getEmail(), metadata, image);
        var duplicate = mealPosts.create(aarav.getEmail(), metadata, image);
        assertThat(duplicate.id()).isEqualTo(created.id());
        assertThat(created.calories()).isEqualByComparingTo("410.25");
        assertThat(created.proteinGrams()).isEqualByComparingTo("24.75");
        assertThat(created.carbsGrams()).isEqualByComparingTo("55.50");
        assertThat(created.fatGrams()).isEqualByComparingTo("12.125");
        assertThat(memberAccess.adminMemberToday(aarav.getId()).meals()).anySatisfy(meal ->
                assertThat(meal.nutrition().proteinGrams()).isEqualByComparingTo("24.75"));
        assertThat(mealPosts.image(aarav.getEmail(), created.id()).contentType()).isEqualTo("image/png");
        assertThatThrownBy(() -> mealPosts.image(kavya.getEmail(), created.id())).isInstanceOf(NotFoundException.class);

        memberAccess.replaceAssignments("admin@mr-care.app", kavya.getId(), new ReplaceMemberAccessRequest(List.of(aarav.getId())));
        assertThat(mealPosts.image(kavya.getEmail(), created.id()).resource().exists()).isTrue();
        assertThat(mealPosts.image("admin@mr-care.app", created.id()).resource().exists()).isTrue();
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow();
    }
}
