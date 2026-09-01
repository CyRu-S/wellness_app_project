package com.wellnessapp.service;

import com.wellnessapp.dto.mealpost.CreateMealPostRequest;
import com.wellnessapp.dto.mealpost.MealPostResponse;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.*;

@Service
@RequiredArgsConstructor
public class MealPostService {
    private final UserRepository users;
    private final MealRepository meals;
    private final MealPostRepository posts;
    private final MediaStorageService mediaStorage;
    private final MemberAccessService memberAccess;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional
    public MealPostResponse create(String email, CreateMealPostRequest request, MultipartFile image) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("Account not found"));
        if (user.getRole() != User.Role.USER || user.getStatus() != User.Status.ACTIVE) {
            throw new BadRequestException("Only active members can create meal posts");
        }

        String requestId = request.clientRequestId().trim();
        MealPost existing = posts.findByUserIdAndClientRequestId(user.getId(), requestId).orElse(null);
        if (existing != null) return response(existing);

        Meal plannedMeal = null;
        if (request.plannedMealId() != null) {
            plannedMeal = meals.findByIdAndUserId(request.plannedMealId(), user.getId())
                    .orElseThrow(() -> new NotFoundException("Planned meal not found"));
            LocalDate today = LocalDate.now(clock.withZone(applicationZoneId));
            if (!plannedMeal.getMealDate().equals(today)) throw new BadRequestException("Only today's planned meals can be posted");
            if (posts.findByPlannedMealId(plannedMeal.getId()).isPresent()) {
                throw new ConflictException("This planned meal already has a post");
            }
        }

        MediaStorageService.StoredMedia stored = mediaStorage.store(image);
        try {
            MealPost post = posts.saveAndFlush(MealPost.builder()
                    .user(user)
                    .plannedMeal(plannedMeal)
                    .mealType(request.mealType().trim())
                    .mealName(request.mealName().trim())
                    .calories(request.calories())
                    .proteinGrams(request.proteinGrams())
                    .carbsGrams(request.carbsGrams())
                    .fatGrams(request.fatGrams())
                    .postedAt(clock.instant())
                    .mediaKey(stored.key())
                    .mediaOriginalName(stored.originalName())
                    .mediaContentType(stored.contentType())
                    .mediaSize(stored.size())
                    .clientRequestId(requestId)
                    .build());
            if (plannedMeal != null && !plannedMeal.isConsumed()) {
                plannedMeal.setConsumed(true);
                meals.saveAndFlush(plannedMeal);
            }
            return response(post);
        } catch (RuntimeException exception) {
            mediaStorage.deleteQuietly(stored.key());
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public MediaDownload image(String email, Long postId) {
        User viewer = users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("Meal photo not found"));
        MealPost post = posts.findById(postId).orElseThrow(() -> new NotFoundException("Meal photo not found"));
        if (!memberAccess.canReadMember(viewer, post.getUser().getId())) {
            throw new NotFoundException("Meal photo not found");
        }
        return new MediaDownload(
                mediaStorage.load(post.getMediaKey()), post.getMediaContentType(), post.getMediaOriginalName(), post.getMediaSize());
    }

    private MealPostResponse response(MealPost post) {
        return new MealPostResponse(
                post.getId(), post.getPlannedMeal() == null ? null : post.getPlannedMeal().getId(), post.getMealType(),
                post.getMealName(), post.getCalories(), post.getProteinGrams(), post.getCarbsGrams(), post.getFatGrams(),
                post.getPostedAt(), "/api/meal-posts/" + post.getId() + "/image", post.getClientRequestId());
    }

    public record MediaDownload(Resource resource, String contentType, String originalName, long size) {}
}
