package com.wellnessapp.repository;

import com.wellnessapp.entity.PlanItemCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;

public interface PlanItemCompletionRepository extends JpaRepository<PlanItemCompletion, Long> {
    interface HabitHistory {
        Long getMemberId();
        Long getItemId();
        LocalDate getCompletedDate();
        java.time.LocalTime getScheduledTime();
    }
    @org.springframework.data.jpa.repository.Query("select c.user.id as memberId, c.planItem.id as itemId, c.completedDate as completedDate, c.planItem.scheduledTime as scheduledTime from PlanItemCompletion c where c.user.id in :memberIds and c.completedDate between :start and :end and c.planItem.type = com.wellnessapp.entity.PlanItem.Type.HEALTHY_HABIT")
    List<HabitHistory> habitHistory(Collection<Long> memberIds, LocalDate start, LocalDate end);
    @org.springframework.data.jpa.repository.Query("select completion.user.id, completion.planItem.id from PlanItemCompletion completion where completion.user.id in :memberIds and completion.completedDate = :date")
    List<Object[]> completedItemIds(java.util.Collection<Long> memberIds, LocalDate date);
    boolean existsByPlanItemIdAndUserIdAndCompletedDate(Long planItemId, Long userId, LocalDate completedDate);
    Optional<PlanItemCompletion> findByPlanItemIdAndUserIdAndCompletedDate(Long planItemId, Long userId, LocalDate completedDate);
    List<PlanItemCompletion> findByUserIdAndCompletedDate(Long userId, LocalDate completedDate);
    List<PlanItemCompletion> findByUserIdInAndCompletedDate(Collection<Long> userIds, LocalDate completedDate);
    List<PlanItemCompletion> findByPlanItemIdIn(Collection<Long> planItemIds);
}
