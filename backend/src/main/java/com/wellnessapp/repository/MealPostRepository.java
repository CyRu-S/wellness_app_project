package com.wellnessapp.repository;

import com.wellnessapp.entity.MealPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MealPostRepository extends JpaRepository<MealPost, Long> {
    interface Summary {
        Long getMemberId();
        Long getPlannedMealId();
        Instant getPostedAt();
        String getMealType();
    }
    @org.springframework.data.jpa.repository.Query("select p.user.id as memberId, meal.id as plannedMealId, p.postedAt as postedAt, p.mealType as mealType from MealPost p left join p.plannedMeal meal where p.postedAt >= :start")
    List<Summary> summarySince(Instant start);
    @org.springframework.data.jpa.repository.Query("select p.user.id, count(p), sum(p.calories), sum(p.proteinGrams) from MealPost p where p.postedAt >= :start and p.postedAt < :end group by p.user.id")
    List<Object[]> summariesBetween(Instant start, Instant end);
    @org.springframework.data.jpa.repository.Query("select p.user.id, count(p), sum(p.calories), sum(p.proteinGrams) from MealPost p where p.user.id in :userIds and p.postedAt >= :start and p.postedAt < :end group by p.user.id")
    List<Object[]> summariesForUsersBetween(java.util.Collection<Long> userIds, Instant start, Instant end);
    @org.springframework.data.jpa.repository.Query("select p.user.id, count(p) from MealPost p where p.postedAt >= :start and p.postedAt < :end group by p.user.id")
    List<Object[]> countsBetween(Instant start, Instant end);
    List<MealPost> findByPostedAtGreaterThanEqual(Instant start);
    List<MealPost> findByPostedAtGreaterThanEqualAndPostedAtLessThan(Instant start, Instant end);
    Optional<MealPost> findByUserIdAndClientRequestId(Long userId, String clientRequestId);
    Optional<MealPost> findByPlannedMealId(Long plannedMealId);
    List<MealPost> findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAt(
            Long userId, Instant start, Instant end);
    List<MealPost> findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAtDesc(
            Long userId, Instant start, Instant end);
    List<MealPost> findByPostedAtLessThan(Instant cutoff);
    List<MealPost> findByUserId(Long userId);
}
