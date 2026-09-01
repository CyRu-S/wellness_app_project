package com.wellnessapp.service;

import com.wellnessapp.dto.access.SharedMemberTodayResponse;
import com.wellnessapp.dto.admin.AdminMemberJournalResponse;
import com.wellnessapp.dto.admin.UpdateMemberWaterGoalRequest;
import com.wellnessapp.entity.MealPost;
import com.wellnessapp.entity.User;
import com.wellnessapp.entity.UserProfile;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.repository.MealPostRepository;
import com.wellnessapp.repository.UserProfileRepository;
import com.wellnessapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminMemberJournalService {
    public static final int RETENTION_DAYS = 21;

    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MealPostRepository mealPosts;
    private final MemberAccessService memberAccess;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional(readOnly = true)
    public AdminMemberJournalResponse get(Long memberId) {
        User member = users.findById(memberId)
                .filter(user -> user.getRole() == User.Role.USER)
                .orElseThrow(() -> new NotFoundException("Member not found"));
        UserProfile profile = profiles.findByUserId(memberId).orElse(null);

        LocalDate today = LocalDate.now(clock.withZone(applicationZoneId));
        Instant historyStart = today.minusDays(RETENTION_DAYS).atStartOfDay(applicationZoneId).toInstant();
        Instant todayStart = today.atStartOfDay(applicationZoneId).toInstant();
        List<MealPost> posts = mealPosts
                .findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAtDesc(
                        memberId, historyStart, todayStart);

        Map<LocalDate, List<AdminMemberJournalResponse.HistoryPost>> byDate = new LinkedHashMap<>();
        for (MealPost post : posts) {
            LocalDate date = post.getPostedAt().atZone(applicationZoneId).toLocalDate();
            byDate.computeIfAbsent(date, ignored -> new ArrayList<>()).add(historyPost(post));
        }
        List<AdminMemberJournalResponse.HistoryDay> history = byDate.entrySet().stream()
                .map(entry -> new AdminMemberJournalResponse.HistoryDay(entry.getKey(), List.copyOf(entry.getValue())))
                .toList();

        return new AdminMemberJournalResponse(
                member(member, profile),
                memberAccess.adminMemberToday(memberId),
                history,
                RETENTION_DAYS);
    }

    @Transactional
    public AdminMemberJournalResponse.Member updateWaterGoal(Long memberId, UpdateMemberWaterGoalRequest request) {
        User member = users.findById(memberId)
                .filter(user -> user.getRole() == User.Role.USER)
                .orElseThrow(() -> new NotFoundException("Member not found"));
        if (request.waterGoalMl() % 250 != 0) {
            throw new BadRequestException("Water goal must use 250 ml increments");
        }
        UserProfile profile = profiles.findByUserId(memberId)
                .orElseGet(() -> UserProfile.builder().user(member).build());
        profile.setWaterGoalMl(request.waterGoalMl());
        return member(member, profiles.save(profile));
    }

    private AdminMemberJournalResponse.Member member(User user, UserProfile profile) {
        Integer height = profile == null ? null : profile.getHeightCm();
        Double weight = profile == null ? null : profile.getWeightKg();
        return new AdminMemberJournalResponse.Member(
                user.getId(), user.getFullName(), user.getEmail(), user.getStatus().name(),
                profile == null ? null : profile.getGoal(),
                profile == null ? null : profile.getDietaryPreferences(),
                height, weight,
                profile == null ? null : profile.getWaistCm(),
                profile == null ? null : profile.getBodyFatPercent(),
                bmi(height, weight),
                profile == null ? null : profile.getLastBodyMetricsUpdatedAt(),
                profile == null ? 2000 : profile.getWaterGoalMl(),
                profile != null && profile.getPhotoMediaKey() != null
                        ? "/api/admin/users/" + user.getId() + "/profile-photo"
                        : null);
    }

    private Double bmi(Integer heightCm, Double weightKg) {
        if (heightCm == null || heightCm <= 0 || weightKg == null || weightKg <= 0) return null;
        double heightMetres = heightCm / 100.0;
        return BigDecimal.valueOf(weightKg / (heightMetres * heightMetres))
                .setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private AdminMemberJournalResponse.HistoryPost historyPost(MealPost post) {
        return new AdminMemberJournalResponse.HistoryPost(
                post.getId(), post.getMealType(), post.getMealName(), post.getPostedAt(),
                "/api/meal-posts/" + post.getId() + "/image",
                new SharedMemberTodayResponse.Nutrition(
                        post.getCalories(), post.getProteinGrams(), post.getCarbsGrams(), post.getFatGrams()));
    }
}
