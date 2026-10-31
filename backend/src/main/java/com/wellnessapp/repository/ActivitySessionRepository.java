package com.wellnessapp.repository;
import com.wellnessapp.entity.ActivitySession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
public interface ActivitySessionRepository extends JpaRepository<ActivitySession, Long> {
    @org.springframework.data.jpa.repository.Query("select a.user.id, sum(a.durationSeconds) from ActivitySession a where a.startedAt >= :start and a.startedAt < :end group by a.user.id")
    List<Object[]> totalsBetween(Instant start, Instant end);
    @org.springframework.data.jpa.repository.Query("select a.user.id, sum(a.durationSeconds) from ActivitySession a where a.user.id in :userIds and a.startedAt >= :start and a.startedAt < :end group by a.user.id")
    List<Object[]> totalsForUsersBetween(java.util.Collection<Long> userIds, Instant start, Instant end);
    List<ActivitySession> findByUserIdAndStartedAtAfter(Long userId, Instant after);
    List<ActivitySession> findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAt(Long userId, Instant start, Instant end);
    List<ActivitySession> findByStartedAtGreaterThanEqualAndStartedAtLessThan(Instant start, Instant end);
    long deleteByUserId(Long userId);
}

