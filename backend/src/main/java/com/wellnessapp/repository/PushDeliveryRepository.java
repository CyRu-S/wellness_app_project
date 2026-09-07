package com.wellnessapp.repository;
import com.wellnessapp.entity.PushDelivery;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.Pageable;
import java.time.Instant;
import java.util.List;
public interface PushDeliveryRepository extends JpaRepository<PushDelivery, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from PushDelivery d where d.status = :status and d.nextAttemptAt <= :now order by d.id")
    List<PushDelivery> ready(PushDelivery.Status status, Instant now, Pageable page);
}
