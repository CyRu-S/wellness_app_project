package com.wellnessapp.repository;
import com.wellnessapp.entity.NotificationEvent;
import com.wellnessapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
public interface NotificationRepository extends JpaRepository<NotificationEvent, Long> {
    List<NotificationEvent> findTop30ByUserIdOrderByScheduledAtDesc(Long userId);
    List<NotificationEvent> findByUserIdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtDesc(Long userId, Instant start, Instant end);
    @Modifying(flushAutomatically = true, clearAutomatically = true) @Query("delete from NotificationEvent event where event.user.role = :role and event.scheduledAt < :cutoff")
    int deleteByUserRoleAndScheduledAtBefore(@Param("role") User.Role role, @Param("cutoff") Instant cutoff);
    boolean existsBySourceKey(String sourceKey);
}

