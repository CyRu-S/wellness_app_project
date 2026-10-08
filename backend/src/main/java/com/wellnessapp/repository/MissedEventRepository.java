package com.wellnessapp.repository;
import com.wellnessapp.entity.MissedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MissedEventRepository extends JpaRepository<MissedEvent, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "user")
    List<MissedEvent> findByResolvedFalseOrderByMissedAtDesc();
    long countByResolvedFalse();
    java.util.Optional<MissedEvent> findBySourceKey(String sourceKey);
}

