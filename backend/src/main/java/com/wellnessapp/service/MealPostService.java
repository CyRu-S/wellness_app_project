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
import java.math.RoundingMode;

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
    private final WorkflowNotificationService notices;
    private final PlanService plans;
    @Transactional(readOnly = true)
    public java.util.List<MealPostResponse> history(String email) {
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        return posts.findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAtDesc(user.getId(),
                clock.instant().minus(java.time.Duration.ofDays(21)), clock.instant().plusSeconds(1)).stream().map(this::response).toList();
    }

    @Transactional
    public MealPostResponse create(String email, CreateMealPostRequest request, MultipartFile image) {
        User account = users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("Account not found"));
        User user = users.lockById(account.getId()).orElseThrow(() -> new NotFoundException("Account not found"));
        if (user.getRole() != User.Role.USER || user.getStatus() != User.Status.ACTIVE) {
            throw new BadRequestException("Only active members can create meal posts");
        }

        String requestId = request.clientRequestId().trim();
        MealPost existing = posts.findByUserIdAndClientRequestId(user.getId(), requestId).orElse(null);
        if (existing != null) return response(existing);
        boolean outsideFood = request.plannedMealId() == null;
        if (outsideFood && !"Outside food".equalsIgnoreCase(request.mealType().trim()))
            throw new BadRequestException("Choose an assigned meal or use Outside food");
        if (!outsideFood) plans.ensureDailyMeals(user.getId());

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

        // The assigned category is authoritative, including when a client edits the displayed name/type.
        String productType = outsideFood ? "Outside food" : plannedMeal.getType();
        String assignedName = plannedMeal == null ? request.mealName() : plannedMeal.getName();
        var assignedCalories = HerbalifeCalories.find(productType, assignedName);
        boolean product = HerbalifeCalories.isProduct(productType);
        var calories = product ? assignedCalories.orElse(java.math.BigDecimal.ZERO) : request.calories();
        // Only calories are specified for these products; do not invent macronutrients.
        var protein = product ? java.math.BigDecimal.ZERO : request.proteinGrams();
        var carbs = product ? java.math.BigDecimal.ZERO : request.carbsGrams();
        var fat = product ? java.math.BigDecimal.ZERO : request.fatGrams();
        MediaStorageService.StoredMedia stored = mediaStorage.store(image);
        try {
            MealPost post = posts.saveAndFlush(MealPost.builder()
                    .user(user)
                    .plannedMeal(plannedMeal)
                    .mealType(productType.trim())
                    .mealName(product ? assignedName.trim() : request.mealName().trim())
                    .calories(calories)
                    .proteinGrams(protein)
                    .carbsGrams(carbs)
                    .fatGrams(fat)
                    .postedAt(clock.instant())
                    .mediaKey(stored.key())
                    .mediaOriginalName(stored.originalName())
                    .mediaContentType(stored.contentType())
                    .mediaSize(stored.size())
                    .clientRequestId(requestId)
                    .build());
            if (plannedMeal != null && !plannedMeal.isConsumed()) {
                plannedMeal.setConsumed(true);
                plannedMeal.setCalories(calories.setScale(0, RoundingMode.HALF_UP).intValueExact());
                plannedMeal.setProteinGrams(protein.setScale(0, RoundingMode.HALF_UP).intValueExact());
                meals.saveAndFlush(plannedMeal);
            }
            notices.admins(PushDelivery.Kind.MEAL_POST, "meal-post-" + post.getId(),
                    user.getFullName() + " · " + post.getMealType(),
                    "Review " + post.getMealName() + " in the member profile.");
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

    @Transactional
    public void delete(String email, Long postId) {
        User actor = users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("Meal post not found"));
        MealPost post = posts.findById(postId).orElseThrow(() -> new NotFoundException("Meal post not found"));
        if (actor.getRole() != User.Role.ADMIN && !actor.getId().equals(post.getUser().getId())) {
            throw new NotFoundException("Meal post not found");
        }
        Meal plannedMeal = post.getPlannedMeal();
        String mediaKey = post.getMediaKey();
        posts.delete(post);
        posts.flush();
        if (plannedMeal != null) {
            plannedMeal.setConsumed(false);
            meals.saveAndFlush(plannedMeal);
        }
        mediaStorage.deleteQuietly(mediaKey);
    }

    private MealPostResponse response(MealPost post) {
        return new MealPostResponse(
                post.getId(), post.getPlannedMeal() == null ? null : post.getPlannedMeal().getId(), post.getMealType(),
                post.getMealName(), post.getCalories(), post.getProteinGrams(), post.getCarbsGrams(), post.getFatGrams(),
                post.getPostedAt(), "/api/meal-posts/" + post.getId() + "/image", post.getClientRequestId());
    }

    public record MediaDownload(Resource resource, String contentType, String originalName, long size) {}
}
