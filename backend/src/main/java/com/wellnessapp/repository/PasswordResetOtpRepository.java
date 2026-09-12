package com.wellnessapp.repository;

import com.wellnessapp.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetOtp> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(Long userId);
}
