package com.wellnessapp.repository;
import com.wellnessapp.entity.PlanItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PlanItemRepository extends JpaRepository<PlanItem, Long> {
    List<PlanItem> findByPlanIdOrderBySortOrder(Long planId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "plan")
    List<PlanItem> findByPlanIdInOrderBySortOrder(java.util.Collection<Long> planIds);
}

