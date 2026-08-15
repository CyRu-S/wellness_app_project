package com.wellnessapp.repository;
import com.wellnessapp.entity.ActivitySession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
public interface ActivitySessionRepository extends JpaRepository<ActivitySession, Long> { List<ActivitySession> findByUserIdAndStartedAtAfter(Long userId, Instant after); }

