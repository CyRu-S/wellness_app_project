package com.wellnessapp.repository;

import com.wellnessapp.entity.MealPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MealPostRepository extends JpaRepository<MealPost, Long> {
    Optional<MealPost> findByUserIdAndClientRequestId(Long userId, String clientRequestId);
    Optional<MealPost> findByPlannedMealId(Long plannedMealId);
    List<MealPost> findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAt(
            Long userId, Instant start, Instant end);
}
