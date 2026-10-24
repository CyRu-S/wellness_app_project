package com.wellnessapp.service;
import com.wellnessapp.dto.profile.ProfileResponse;
import com.wellnessapp.dto.profile.BodyMetricsRequest;
import com.wellnessapp.dto.profile.UpdateProfileRequest;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
@Service @RequiredArgsConstructor public class ProfileService {
    private static final Duration BODY_UPDATE_INTERVAL = Duration.ofDays(7);
    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MediaStorageService mediaStorage;
    private final MemberAccessService memberAccess;
    private final HealthProfileHistoryRepository history;
    private final MealPostRepository mealPosts;
    private final Clock clock;

    public ProfileResponse get(String email) {
        User user = user(email);
        return response(user, profiles.findByUserId(user.getId()).orElse(null));
    }

    @Transactional
    public ProfileResponse update(String email, UpdateProfileRequest request) {
        User user = user(email);
        UserProfile profile = profiles.findByUserId(user.getId())
                .orElseGet(() -> UserProfile.builder().user(user).build());
        user.setFullName(request.name().trim());
        if (user.getRole() == User.Role.ADMIN) {
            if (request.phone() != null) user.setPhoneNumber(request.phone().trim());
            if (request.clubName() != null) user.setClubName(request.clubName().trim());
        } else if (request.phone() != null || request.clubName() != null) {
            throw new BadRequestException("Only an administrator can change club contact details");
        }
        profile.setDietaryPreferences(request.dietaryPreferences() == null
                ? null
                : request.dietaryPreferences().trim());
        users.save(user);
        profile = profiles.save(profile);
        return response(user, profile);
    }

    @Transactional
    public ProfileResponse updatePhoto(String email, MultipartFile image) {
        User user = user(email);
        if (user.getStatus() != User.Status.ACTIVE) {
            throw new ConflictException("Only active members can update a profile photo");
        }
        UserProfile profile = profiles.findByUserId(user.getId())
                .orElseGet(() -> UserProfile.builder().user(user).build());
        String previousKey = profile.getPhotoMediaKey();
        MediaStorageService.StoredMedia stored = mediaStorage.store(image);
        try {
            profile.setPhotoMediaKey(stored.key());
            profile.setPhotoOriginalName(stored.originalName());
            profile.setPhotoContentType(stored.contentType());
            profile.setPhotoSize(stored.size());
            profile = profiles.saveAndFlush(profile);
            ProfileResponse response = response(user, profile);
            if (previousKey != null && !previousKey.equals(stored.key())) mediaStorage.deleteQuietly(previousKey);
            return response;
        } catch (RuntimeException exception) {
            mediaStorage.deleteQuietly(stored.key());
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public MediaDownload ownPhoto(String email) {
        User user = user(email);
        return photo(user.getId());
    }

    @Transactional(readOnly = true)
    public MediaDownload memberPhoto(String viewerEmail, Long memberId) {
        User viewer = user(viewerEmail);
        if (!memberAccess.canReadMember(viewer, memberId)) throw new NotFoundException("Profile photo not found");
        return photo(memberId);
    }

    @Transactional(readOnly = true)
    public String adminPhotoUrl(Long memberId) {
        return profiles.findByUserId(memberId)
                .filter(profile -> profile.getPhotoMediaKey() != null)
                .map(profile -> "/api/admin/users/" + memberId + "/profile-photo")
                .orElse(null);
    }

    @Transactional
    public ProfileResponse updateBodyMetrics(String email, BodyMetricsRequest request) {
        User user = user(email);
        UserProfile profile = profiles.findByUserId(user.getId()).orElseGet(() -> UserProfile.builder().user(user).build());
        Instant now = clock.instant();
        if (profile.getLastBodyMetricsUpdatedAt() != null) {
            Instant nextUpdate = profile.getLastBodyMetricsUpdatedAt().plus(BODY_UPDATE_INTERVAL);
            if (now.isBefore(nextUpdate)) {
                throw new ConflictException("Body measurements can be updated again on " + nextUpdate);
            }
        }
        profile.setHeightCm(request.heightCm());
        profile.setWeightKg(request.weightKg());
        profile.setAge(request.age());
        profile.setBodyFatPercent(request.bodyFatPercent());
        profile.setLastBodyMetricsUpdatedAt(now);
        profile = profiles.save(profile);
        recordHistory(user, profile);
        return response(user, profile);
    }

    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> history(String email) {
        User user = user(email);
        return history.findTop52ByUserIdOrderByRecordedAtDesc(user.getId()).stream().map(entry -> {
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", entry.getId()); row.put("recordedAt", entry.getRecordedAt());
            row.put("heightCm", entry.getHeightCm()); row.put("weightKg", entry.getWeightKg());
            row.put("age", entry.getAge()); row.put("bodyFatPercent", entry.getBodyFatPercent());
            row.put("dietaryPreferences", entry.getDietaryPreferences());
            return row;
        }).toList();
    }

    @Transactional
    public void deleteOwnAccount(String email) {
        User account = user(email);
        if (account.getRole() == User.Role.ADMIN) {
            throw new ConflictException("Administrator accounts cannot be deleted");
        }
        deleteUser(account);
    }

    @Transactional
    public void deleteMember(Long memberId) {
        User member = users.findById(memberId).filter(value -> value.getRole() == User.Role.USER)
                .orElseThrow(() -> new NotFoundException("Member not found"));
        deleteUser(member);
    }

    private void deleteUser(User user) {
        Long userId = user.getId();
        profiles.findByUserId(user.getId()).map(UserProfile::getPhotoMediaKey).ifPresent(mediaStorage::deleteQuietly);
        mealPosts.findByUserId(user.getId()).stream().map(MealPost::getMediaKey).forEach(mediaStorage::deleteQuietly);
        // A bulk delete lets the database cascade account-owned rows and clears
        // the persistence context so loaded profile/post entities cannot retain
        // references to the deleted account during transaction completion.
        users.deleteAccountById(userId);
    }

    private void recordHistory(User user, UserProfile profile) {
        history.save(HealthProfileHistory.builder().user(user).heightCm(profile.getHeightCm()).weightKg(profile.getWeightKg())
                .age(profile.getAge()).bodyFatPercent(profile.getBodyFatPercent())
                .dietaryPreferences(profile.getDietaryPreferences()).recordedAt(clock.instant()).build());
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("Profile not found"));
    }

    private ProfileResponse response(User user, UserProfile profile) {
        return new ProfileResponse(
                user.getId(), user.getFullName(), user.getEmail(), user.getRole().name(),
                profile == null ? null : profile.getGoal(),
                profile == null ? null : profile.getHeightCm(),
                profile == null ? null : profile.getWeightKg(),
                profile == null ? null : profile.getDietaryPreferences(),
                profile == null ? null : profile.getAge(),
                profile == null ? null : profile.getBodyFatPercent(),
                profile == null ? null : profile.getLastBodyMetricsUpdatedAt(),
                profile == null ? 2000 : profile.getWaterGoalMl(),
                profileImageUrl(profile), user.getPhoneNumber(), user.getClubName());
    }

    private MediaDownload photo(Long userId) {
        UserProfile profile = profiles.findByUserId(userId)
                .filter(value -> value.getPhotoMediaKey() != null)
                .orElseThrow(() -> new NotFoundException("Profile photo not found"));
        return new MediaDownload(
                mediaStorage.load(profile.getPhotoMediaKey()),
                profile.getPhotoContentType(),
                profile.getPhotoOriginalName(),
                profile.getPhotoSize() == null ? 0 : profile.getPhotoSize());
    }

    private String profileImageUrl(UserProfile profile) {
        return profile != null && profile.getPhotoMediaKey() != null ? "/api/profile/photo?v=" + profile.getPhotoMediaKey() : null;
    }

    public record MediaDownload(Resource resource, String contentType, String originalName, long size) {}
}

