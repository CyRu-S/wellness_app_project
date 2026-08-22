package com.wellnessapp;

import com.wellnessapp.dto.access.ReplaceMemberAccessRequest;
import com.wellnessapp.dto.mealpost.CreateMealPostRequest;
import com.wellnessapp.dto.profile.BodyMetricsRequest;
import com.wellnessapp.entity.User;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.MealRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
class MemberAccessFeatureIntegrationTests {
    @Autowired MemberAccessService memberAccess;
    @Autowired MealPostService mealPosts;
    @Autowired ProfileService profiles;
    @Autowired UserRepository users;
    @Autowired MealRepository meals;
    @Autowired ZoneId applicationZoneId;

    @Test
    void replacesUnlimitedAssignmentsDeduplicatesAndRevokesAtomically() {
        User aarav = user("user@wellnest.app");
        User kavya = user("kavya.menon@example.com");
        User rohan = user("rohan.das@example.com");

        var assigned = memberAccess.replaceAssignments(
                "admin@wellnest.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of(kavya.getId(), rohan.getId(), kavya.getId())));
        assertThat(assigned.assignedMembers()).extracting(item -> item.id()).containsExactly(kavya.getId(), rohan.getId());
        assertThat(memberAccess.sharedMembers(aarav.getEmail()).members()).hasSize(2);

        var revoked = memberAccess.replaceAssignments(
                "admin@wellnest.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of()));
        assertThat(revoked.assignedMembers()).isEmpty();
        assertThat(memberAccess.sharedMembers(aarav.getEmail()).members()).isEmpty();
    }

    @Test
    void preventsSelfAccessAndRejectsNonUserSubjects() {
        User aarav = user("user@wellnest.app");
        User admin = user("admin@wellnest.app");

        assertThatThrownBy(() -> memberAccess.replaceAssignments(
                admin.getEmail(), aarav.getId(), new ReplaceMemberAccessRequest(List.of(aarav.getId()))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> memberAccess.replaceAssignments(
                admin.getEmail(), aarav.getId(), new ReplaceMemberAccessRequest(List.of(admin.getId()))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void hidesUngrantedMembersAndReturnsOnlyTodaysOperationalSnapshot() {
        User aarav = user("user@wellnest.app");
        User kavya = user("kavya.menon@example.com");

        assertThatThrownBy(() -> memberAccess.sharedMemberToday(aarav.getEmail(), kavya.getId()))
                .isInstanceOf(NotFoundException.class);

        memberAccess.replaceAssignments("admin@wellnest.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of(kavya.getId())));
        var today = memberAccess.sharedMemberToday(aarav.getEmail(), kavya.getId());
        assertThat(today.member().name()).isEqualTo("Kavya Menon");
        assertThat(today.date()).isEqualTo(LocalDate.now(applicationZoneId));
        assertThat(today.meals()).hasSize(3);
        assertThat(today.summary().hydrationMl()).isPositive();
        assertThat(today.summary().activityMinutes()).isPositive();
    }

    @Test
    void suspendedViewersAndSubjectsImmediatelyLoseAccess() {
        User aarav = user("user@wellnest.app");
        User kavya = user("kavya.menon@example.com");
        memberAccess.replaceAssignments("admin@wellnest.app", aarav.getId(), new ReplaceMemberAccessRequest(List.of(kavya.getId())));

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
        var updated = profiles.updateBodyMetrics("user@wellnest.app", new BodyMetricsRequest(176, 71.8, 82.0, 18.5));
        assertThat(updated.waistCm()).isEqualTo(82.0);
        assertThat(updated.lastBodyMetricsUpdatedAt()).isNotNull();

        assertThatThrownBy(() -> profiles.updateBodyMetrics(
                "user@wellnest.app", new BodyMetricsRequest(176, 71.5, 81.0, 18.0)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void storesIdempotentMealPostAndProtectsItsImage() {
        User aarav = user("user@wellnest.app");
        User kavya = user("kavya.menon@example.com");
        Long plannedMealId = meals.findByUserIdAndMealDateOrderByMealTime(
                aarav.getId(), LocalDate.now(applicationZoneId)).getFirst().getId();
        CreateMealPostRequest metadata = new CreateMealPostRequest(
                plannedMealId, "Breakfast", "Oats and fruit", 410, 24, 55, 12, "integration-test-post");
        MockMultipartFile image = new MockMultipartFile(
                "image", "breakfast.png", "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1});

        var created = mealPosts.create(aarav.getEmail(), metadata, image);
        var duplicate = mealPosts.create(aarav.getEmail(), metadata, image);
        assertThat(duplicate.id()).isEqualTo(created.id());
        assertThat(mealPosts.image(aarav.getEmail(), created.id()).contentType()).isEqualTo("image/png");
        assertThatThrownBy(() -> mealPosts.image(kavya.getEmail(), created.id())).isInstanceOf(NotFoundException.class);

        memberAccess.replaceAssignments("admin@wellnest.app", kavya.getId(), new ReplaceMemberAccessRequest(List.of(aarav.getId())));
        assertThat(mealPosts.image(kavya.getEmail(), created.id()).resource().exists()).isTrue();
        assertThat(mealPosts.image("admin@wellnest.app", created.id()).resource().exists()).isTrue();
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow();
    }
}
