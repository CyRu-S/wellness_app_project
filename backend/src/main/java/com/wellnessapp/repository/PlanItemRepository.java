package com.wellnessapp.repository;
import com.wellnessapp.entity.PlanItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PlanItemRepository extends JpaRepository<PlanItem, Long> {
    @org.springframework.data.jpa.repository.Query("select item.id from PlanItem item where item.id in :ids")
    List<Long> existingIds(java.util.Collection<Long> ids);
    List<PlanItem> findByPlanIdOrderBySortOrder(Long planId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "plan")
    List<PlanItem> findByPlanIdInOrderBySortOrder(java.util.Collection<Long> planIds);
}

