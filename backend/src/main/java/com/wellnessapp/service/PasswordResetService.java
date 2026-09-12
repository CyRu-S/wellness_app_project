package com.wellnessapp.service;

import com.wellnessapp.dto.auth.ForgotPasswordRequest;
import com.wellnessapp.dto.auth.MessageResponse;
import com.wellnessapp.dto.auth.ResetPasswordRequest;
import com.wellnessapp.entity.PasswordResetOtp;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.repository.PasswordResetOtpRepository;
import com.wellnessapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;

@Service @RequiredArgsConstructor
public class PasswordResetService {
    private static final String REQUEST_MESSAGE = "If an account exists for that email, a reset code has been sent.";
    private static final String INVALID_CODE_MESSAGE = "The reset code is invalid or has expired.";

    private final UserRepository users;
    private final PasswordResetOtpRepository resetOtps;
    private final PasswordEncoder encoder;
    private final PasswordResetMailService mail;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.password-reset.otp-expiration-minutes:10}")
    private long expirationMinutes;
    @Value("${app.password-reset.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;
    @Value("${app.password-reset.max-attempts:5}")
    private int maxAttempts;

    @Transactional
    public MessageResponse request(ForgotPasswordRequest request) {
        mail.ensureConfigured();
        var user = users.findByEmailIgnoreCase(request.email().trim());
        if (user.isEmpty()) return new MessageResponse(REQUEST_MESSAGE);

        Instant now = Instant.now();
        var active = resetOtps.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.get().getId());
        if (active.isPresent() && active.get().getCreatedAt() != null
                && active.get().getCreatedAt().isAfter(now.minusSeconds(resendCooldownSeconds))) {
            return new MessageResponse(REQUEST_MESSAGE);
        }
        active.ifPresent(code -> code.setConsumedAt(now));

        String otp = String.format("%06d", random.nextInt(1_000_000));
        resetOtps.save(PasswordResetOtp.builder()
                .user(user.get())
                .codeHash(encoder.encode(otp))
                .expiresAt(now.plusSeconds(expirationMinutes * 60))
                .build());
        mail.sendOtp(user.get().getEmail(), user.get().getFullName(), otp, expirationMinutes);
        return new MessageResponse(REQUEST_MESSAGE);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public MessageResponse reset(ResetPasswordRequest request) {
        var user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new BadRequestException(INVALID_CODE_MESSAGE));
        var code = resetOtps.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new BadRequestException(INVALID_CODE_MESSAGE));
        Instant now = Instant.now();
        if (!code.getExpiresAt().isAfter(now) || code.getAttempts() >= maxAttempts) {
            code.setConsumedAt(now);
            throw new BadRequestException(INVALID_CODE_MESSAGE);
        }
        if (!encoder.matches(request.otp(), code.getCodeHash())) {
            code.setAttempts(code.getAttempts() + 1);
            if (code.getAttempts() >= maxAttempts) code.setConsumedAt(now);
            throw new BadRequestException(INVALID_CODE_MESSAGE);
        }

        code.setConsumedAt(now);
        user.setPasswordHash(encoder.encode(request.newPassword()));
        user.setTokenVersion((user.getTokenVersion() == null ? 0L : user.getTokenVersion()) + 1L);
        return new MessageResponse("Your password has been reset. You can now sign in with the new password.");
    }
}
