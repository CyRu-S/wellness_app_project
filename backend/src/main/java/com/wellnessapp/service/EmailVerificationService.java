package com.wellnessapp.service;

import com.wellnessapp.dto.auth.*;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;

@Service @RequiredArgsConstructor
public class EmailVerificationService {
    private static final String REQUEST_MESSAGE = "If verification is needed, a code has been sent.";
    private static final String INVALID_CODE_MESSAGE = "The verification code is invalid or has expired.";
    private final UserRepository users;
    private final EmailVerificationOtpRepository codes;
    private final PasswordEncoder encoder;
    private final PasswordResetMailService mail;
    private final WorkflowNotificationService notices;
    private final SecureRandom random = new SecureRandom();
    @Value("${app.email-verification.otp-expiration-minutes:10}") private long expirationMinutes;
    @Value("${app.email-verification.resend-cooldown-seconds:60}") private long resendCooldownSeconds;
    @Value("${app.email-verification.max-attempts:5}") private int maxAttempts;

    public void ensureConfigured() { mail.ensureConfigured(); }

    @Transactional
    public void sendInitial(User user) {
        mail.ensureConfigured();
        sendCode(user, Instant.now());
    }

    @Transactional
    public MessageResponse resend(ForgotPasswordRequest request) {
        mail.ensureConfigured();
        var user = users.findForUpdateByEmailIgnoreCase(request.email().trim());
        if (user.isEmpty() || user.get().getRole() != User.Role.USER || user.get().getEmailVerifiedAt() != null
                || user.get().getStatus() != User.Status.PENDING) return new MessageResponse(REQUEST_MESSAGE);
        Instant now = Instant.now();
        var active = codes.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.get().getId());
        if (active.isPresent() && active.get().getCreatedAt() != null
                && active.get().getCreatedAt().isAfter(now.minusSeconds(resendCooldownSeconds))) return new MessageResponse(REQUEST_MESSAGE);
        active.ifPresent(code -> code.setConsumedAt(now));
        sendCode(user.get(), now);
        return new MessageResponse(REQUEST_MESSAGE);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public MessageResponse verify(VerifyEmailRequest request) {
        var user = users.findForUpdateByEmailIgnoreCase(request.email().trim())
                .filter(u -> u.getRole() == User.Role.USER && u.getStatus() == User.Status.PENDING && u.getEmailVerifiedAt() == null)
                .orElseThrow(() -> new BadRequestException(INVALID_CODE_MESSAGE));
        var code = codes.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
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
        user.setEmailVerifiedAt(now);
        notices.admins(PushDelivery.Kind.SIGNUP, "signup-" + user.getId(),
                "New signup request", user.getFullName() + " has verified their email and requested membership.");
        return new MessageResponse("Email verified. Your account is now awaiting admin approval.");
    }

    private void sendCode(User user, Instant now) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        codes.save(EmailVerificationOtp.builder().user(user).codeHash(encoder.encode(otp))
                .expiresAt(now.plusSeconds(expirationMinutes * 60)).build());
        mail.sendVerificationOtp(user.getEmail(), user.getFullName(), otp, expirationMinutes);
    }
}
