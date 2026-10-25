package com.wellnessapp.repository;
import com.wellnessapp.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
public interface WaterLogRepository extends JpaRepository<WaterLog, Long> {
    interface History {
        Long getMemberId();
        Instant getLoggedAt();
        int getAmountMl();
    }
    @org.springframework.data.jpa.repository.Query("select w.user.id as memberId, w.loggedAt as loggedAt, w.amountMl as amountMl from WaterLog w where w.user.id in :memberIds and w.loggedAt >= :start and w.loggedAt < :end")
    List<History> history(java.util.Collection<Long> memberIds, Instant start, Instant end);
    @org.springframework.data.jpa.repository.Query("select w.user.id, sum(w.amountMl) from WaterLog w where w.loggedAt >= :start and w.loggedAt < :end group by w.user.id")
    List<Object[]> totalsBetween(Instant start, Instant end);
    List<WaterLog> findByUserIdAndLoggedAtAfter(Long userId, Instant after);
    List<WaterLog> findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAt(Long userId, Instant start, Instant end);
    List<WaterLog> findByLoggedAtGreaterThanEqualAndLoggedAtLessThan(Instant start, Instant end);
    long deleteByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThan(Long userId, Instant start, Instant end);
}

