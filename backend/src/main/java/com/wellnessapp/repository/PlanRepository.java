package com.wellnessapp.repository;
import com.wellnessapp.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface PlanRepository extends JpaRepository<Plan, Long> {
    Optional<Plan> findFirstByUserIdAndActiveTrueOrderByStartDateDesc(Long userId);
    long countByActiveTrue();
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "user")
    java.util.List<Plan> findByUserIdInAndActiveTrueOrderByStartDateDescIdDesc(java.util.Collection<Long> userIds);
}

