package com.wellnessapp.repository;

import com.wellnessapp.entity.EmailVerificationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;

public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Long> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationOtp> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(Long userId);
}
