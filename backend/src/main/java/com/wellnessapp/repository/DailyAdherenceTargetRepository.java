package com.wellnessapp.repository;

import com.wellnessapp.entity.DailyAdherenceTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;

public interface DailyAdherenceTargetRepository extends JpaRepository<DailyAdherenceTarget, Long> {
    boolean existsByUserIdAndTargetDate(Long userId, LocalDate date);
    Optional<DailyAdherenceTarget> findByUserIdAndTargetDate(Long userId, LocalDate date);
    List<DailyAdherenceTarget> findByUserIdInAndTargetDateBetween(Collection<Long> users, LocalDate start, LocalDate end);
}
