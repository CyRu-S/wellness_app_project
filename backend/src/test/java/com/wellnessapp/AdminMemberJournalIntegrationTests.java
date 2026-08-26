package com.wellnessapp;

import com.wellnessapp.entity.MealPost;
import com.wellnessapp.entity.User;
import com.wellnessapp.dto.admin.UpdateMemberWaterGoalRequest;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.MealPostRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.service.AdminMemberJournalService;
import com.wellnessapp.service.DashboardService;
import com.wellnessapp.service.MealPostRetentionService;
import com.wellnessapp.service.MediaStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
class AdminMemberJournalIntegrationTests {
    @Autowired AdminMemberJournalService journals;
    @Autowired DashboardService dashboard;
    @Autowired MealPostRetentionService retention;
    @Autowired MealPostRepository posts;
    @Autowired UserRepository users;
    @Autowired MediaStorageService media;
    @Autowired Clock clock;
    @Autowired ZoneId applicationZoneId;

    @Test
    void returnsProfileTodayAndOnlyThePreviousTwentyOneDaysGroupedByDate() {
        User member = user("user@wellnest.app");
        LocalDate today = LocalDate.now(clock.withZone(applicationZoneId));
        MealPost yesterday = post(member, today.minusDays(1).atTime(8, 15).atZone(applicationZoneId).toInstant(), "journal-yesterday", true);
        post(member, today.minusDays(22).atTime(8, 15).atZone(applicationZoneId).toInstant(), "journal-expired", true);

        var journal = journals.get(member.getId());

        assertThat(journal.member().name()).isEqualTo("Aarav Mehta");
        assertThat(journal.member().heightCm()).isEqualTo(175);
        assertThat(journal.member().bmi()).isEqualTo(23.7);
        assertThat(journal.today().member().id()).isEqualTo(member.getId());
        assertThat(journal.retentionDays()).isEqualTo(21);
        assertThat(journal.history()).hasSize(1);
        assertThat(journal.history().getFirst().date()).isEqualTo(today.minusDays(1));
        assertThat(journal.history().getFirst().posts()).extracting(item -> item.postId()).containsExactly(yesterday.getId());
    }

    @Test
    void rejectsUnknownAndAdministratorAccountsAsMembers() {
        assertThatThrownBy(() -> journals.get(999999L)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> journals.get(user("admin@wellnest.app").getId())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void updatesTheMemberWaterGoalAndReflectsItInTheirDashboard() {
        User member = user("user@wellnest.app");

        var updated = journals.updateWaterGoal(member.getId(), new UpdateMemberWaterGoalRequest(2750));

        assertThat(updated.waterGoalMl()).isEqualTo(2750);
        assertThat(journals.get(member.getId()).member().waterGoalMl()).isEqualTo(2750);
        assertThat(dashboard.get(member.getEmail()).waterGoalMl()).isEqualTo(2750);
        assertThat(dashboard.get(member.getEmail()).waterTarget()).isEqualTo(11);
    }

    @Test
    void rejectsWaterGoalsThatAreNotInTwoHundredFiftyMillilitreSteps() {
        User member = user("user@wellnest.app");
        assertThatThrownBy(() -> journals.updateWaterGoal(member.getId(), new UpdateMemberWaterGoalRequest(2600)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("250 ml");
    }

    @Test
    void retentionDeletesExpiredRecordsAndMediaButKeepsTheBoundaryDay() {
        User member = user("kavya.menon@example.com");
        LocalDate today = LocalDate.now(clock.withZone(applicationZoneId));
        MealPost expired = post(member, today.minusDays(22).atTime(12, 0).atZone(applicationZoneId).toInstant(), "retention-expired", true);
        MealPost boundary = post(member, today.minusDays(21).atTime(0, 0).atZone(applicationZoneId).toInstant(), "retention-boundary", true);
        String expiredMediaKey = expired.getMediaKey();

        assertThat(retention.removeExpiredPosts()).isGreaterThanOrEqualTo(1);
        assertThat(posts.findById(expired.getId())).isEmpty();
        assertThat(posts.findById(boundary.getId())).isPresent();
        assertThatThrownBy(() -> media.load(expiredMediaKey)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void missingMediaDoesNotPreventExpiredDatabaseCleanup() {
        User member = user("rohan.das@example.com");
        LocalDate today = LocalDate.now(clock.withZone(applicationZoneId));
        MealPost expired = posts.saveAndFlush(MealPost.builder()
                .user(member).mealType("Dinner").mealName("Missing media dinner")
                .calories(420).proteinGrams(25).carbsGrams(48).fatGrams(13)
                .postedAt(today.minusDays(23).atTime(19, 0).atZone(applicationZoneId).toInstant())
                .mediaKey("missing-media-file.png").mediaOriginalName("missing.png")
                .mediaContentType("image/png").mediaSize(9).clientRequestId("missing-media-retention").build());

        assertThatCode(() -> retention.removeExpiredPosts()).doesNotThrowAnyException();
        assertThat(posts.findById(expired.getId())).isEmpty();
    }

    private MealPost post(User user, Instant postedAt, String requestId, boolean storedMedia) {
        String mediaKey;
        String originalName;
        String contentType;
        long size;
        if (storedMedia) {
            var stored = media.store(new MockMultipartFile(
                    "image", requestId + ".png", "image/png",
                    new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1}));
            mediaKey = stored.key();
            originalName = stored.originalName();
            contentType = stored.contentType();
            size = stored.size();
        } else {
            mediaKey = requestId + ".png";
            originalName = mediaKey;
            contentType = "image/png";
            size = 9;
        }
        return posts.saveAndFlush(MealPost.builder()
                .user(user).mealType("Breakfast").mealName("Journal breakfast")
                .calories(410).proteinGrams(24).carbsGrams(55).fatGrams(12)
                .postedAt(postedAt).mediaKey(mediaKey).mediaOriginalName(originalName)
                .mediaContentType(contentType).mediaSize(size).clientRequestId(requestId).build());
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow();
    }
}
