package com.wellnessapp.repository;
import com.wellnessapp.entity.NotificationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface NotificationRepository extends JpaRepository<NotificationEvent, Long> { List<NotificationEvent> findTop30ByUserIdOrderByScheduledAtDesc(Long userId); }

