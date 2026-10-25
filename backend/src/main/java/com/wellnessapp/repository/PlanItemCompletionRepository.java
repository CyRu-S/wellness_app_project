package com.wellnessapp.repository;

import com.wellnessapp.entity.PlanItemCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;

public interface PlanItemCompletionRepository extends JpaRepository<PlanItemCompletion, Long> {
    @org.springframework.data.jpa.repository.Query("select completion.user.id, completion.planItem.id from PlanItemCompletion completion where completion.user.id in :memberIds and completion.completedDate = :date")
    List<Object[]> completedItemIds(java.util.Collection<Long> memberIds, LocalDate date);
    boolean existsByPlanItemIdAndUserIdAndCompletedDate(Long planItemId, Long userId, LocalDate completedDate);
    Optional<PlanItemCompletion> findByPlanItemIdAndUserIdAndCompletedDate(Long planItemId, Long userId, LocalDate completedDate);
    List<PlanItemCompletion> findByUserIdAndCompletedDate(Long userId, LocalDate completedDate);
    List<PlanItemCompletion> findByUserIdInAndCompletedDate(Collection<Long> userIds, LocalDate completedDate);
}
