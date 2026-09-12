package com.wellnessapp.repository;
import com.wellnessapp.entity.PushDevice;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface PushDeviceRepository extends JpaRepository<PushDevice, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<PushDevice> findByExpoToken(String expoToken);
    List<PushDevice> findByUserIdAndEnabledTrue(Long userId);
}
