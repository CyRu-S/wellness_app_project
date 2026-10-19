package com.wellnessapp.repository;

import com.wellnessapp.entity.HealthProfileHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HealthProfileHistoryRepository extends JpaRepository<HealthProfileHistory, Long> {
    List<HealthProfileHistory> findTop52ByUserIdOrderByRecordedAtDesc(Long userId);
}
