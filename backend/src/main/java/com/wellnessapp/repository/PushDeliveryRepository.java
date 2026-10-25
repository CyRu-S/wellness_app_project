package com.wellnessapp.repository;
import com.wellnessapp.entity.PushDelivery;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
public interface PushDeliveryRepository extends JpaRepository<PushDelivery, Long> {
    // Lock only delivery rows. Fetch-joining a locked query can also lock users
    // and devices in PostgreSQL, blocking sign-ins and creating lock inversions.
    @Query(value = "select d.id from push_deliveries d where d.status = :status and d.next_attempt_at <= :now "
            + "and exists (select 1 from push_devices device where device.id = d.device_id and device.provider = :provider) "
            + "order by d.next_attempt_at, d.id limit :limit for update skip locked", nativeQuery = true)
    List<Long> lockReadyIds(String provider, String status, Instant now, int limit);
    @EntityGraph(attributePaths = {"device", "notification", "notification.user"})
    List<PushDelivery> findByIdInOrderByNextAttemptAtAscIdAsc(java.util.Collection<Long> ids);
    Optional<PushDelivery> findByNotificationIdAndDeviceId(Long notificationId, Long deviceId);
}
