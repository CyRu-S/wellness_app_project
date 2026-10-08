package com.wellnessapp.repository;

import com.wellnessapp.entity.MealPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MealPostRepository extends JpaRepository<MealPost, Long> {
    @org.springframework.data.jpa.repository.Query("select p.user.id, count(p) from MealPost p where p.postedAt >= :start and p.postedAt < :end group by p.user.id")
    List<Object[]> countsBetween(Instant start, Instant end);
    List<MealPost> findByPostedAtGreaterThanEqual(Instant start);
    Optional<MealPost> findByUserIdAndClientRequestId(Long userId, String clientRequestId);
    Optional<MealPost> findByPlannedMealId(Long plannedMealId);
    List<MealPost> findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAt(
            Long userId, Instant start, Instant end);
    List<MealPost> findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAtDesc(
            Long userId, Instant start, Instant end);
    List<MealPost> findByPostedAtLessThan(Instant cutoff);
}
