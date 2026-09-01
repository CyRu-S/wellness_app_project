package com.wellnessapp.repository;
import com.wellnessapp.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
public interface WaterLogRepository extends JpaRepository<WaterLog, Long> {
    List<WaterLog> findByUserIdAndLoggedAtAfter(Long userId, Instant after);
    List<WaterLog> findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAt(Long userId, Instant start, Instant end);
}

