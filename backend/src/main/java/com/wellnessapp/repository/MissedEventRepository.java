package com.wellnessapp.repository;
import com.wellnessapp.entity.MissedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MissedEventRepository extends JpaRepository<MissedEvent, Long> { List<MissedEvent> findByResolvedFalseOrderByMissedAtDesc(); long countByResolvedFalse(); }

