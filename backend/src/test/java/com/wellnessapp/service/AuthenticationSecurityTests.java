package com.wellnessapp.service;

import com.wellnessapp.dto.auth.ForgotPasswordRequest;
import com.wellnessapp.dto.auth.RegisterRequest;
import com.wellnessapp.dto.auth.ResetPasswordRequest;
import com.wellnessapp.entity.PasswordResetOtp;
import com.wellnessapp.entity.User;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.repository.PasswordResetOtpRepository;
import com.wellnessapp.repository.UserProfileRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthenticationSecurityTests {
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Test
    void manualRegistrationStoresOnlyABcryptHash() {
        UserRepository users = mock(UserRepository.class);
        UserProfileRepository profiles = mock(UserProfileRepository.class);
        when(users.save(any())).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0); saved.setId(42L); return saved;
        });
        AuthService service = new AuthService(users, encoder, mock(AuthenticationManager.class),
                mock(JwtTokenProvider.class), mock(GoogleIdentityService.class), profiles,
                mock(MediaStorageService.class), mock(WorkflowNotificationService.class));

        service.register(new RegisterRequest("Test Member", "member@example.com", "MemberPass123!",
                28, 170, 65.0, "Wellness", "Vegetarian"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isNotEqualTo("MemberPass123!").startsWith("$2");
        assertThat(encoder.matches("MemberPass123!", saved.getValue().getPasswordHash())).isTrue();
        verify(profiles).save(any());
    }

    @Test
    void otpIsHashedAndNeverStoredAsPlainText() {
        UserRepository users = mock(UserRepository.class);
        PasswordResetOtpRepository codes = mock(PasswordResetOtpRepository.class);
        PasswordResetMailService mail = mock(PasswordResetMailService.class);
        User user = user("old-password", 0L);
        when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(codes.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.empty());
        PasswordResetService service = resetService(users, codes, mail);

        service.request(new ForgotPasswordRequest(user.getEmail()));

        ArgumentCaptor<PasswordResetOtp> saved = ArgumentCaptor.forClass(PasswordResetOtp.class);
        ArgumentCaptor<String> deliveredCode = ArgumentCaptor.forClass(String.class);
        verify(codes).save(saved.capture());
        verify(mail).sendOtp(eq(user.getEmail()), eq(user.getFullName()), deliveredCode.capture(), eq(10L));
        assertThat(deliveredCode.getValue()).matches("\\d{6}");
        assertThat(saved.getValue().getCodeHash()).isNotEqualTo(deliveredCode.getValue()).startsWith("$2");
        assertThat(encoder.matches(deliveredCode.getValue(), saved.getValue().getCodeHash())).isTrue();
    }

    @Test
    void successfulResetHashesPasswordConsumesOtpAndRevokesExistingJwtVersion() {
        UserRepository users = mock(UserRepository.class);
        PasswordResetOtpRepository codes = mock(PasswordResetOtpRepository.class);
        PasswordResetMailService mail = mock(PasswordResetMailService.class);
        User user = user("old-password", 3L);
        PasswordResetOtp code = PasswordResetOtp.builder().user(user).codeHash(encoder.encode("123456"))
                .attempts(0).expiresAt(Instant.now().plusSeconds(300)).build();
        when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(codes.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(code));

        resetService(users, codes, mail).reset(new ResetPasswordRequest(user.getEmail(), "123456", "NewPassword123!"));

        assertThat(encoder.matches("NewPassword123!", user.getPasswordHash())).isTrue();
        assertThat(user.getTokenVersion()).isEqualTo(4L);
        assertThat(code.getConsumedAt()).isNotNull();
    }

    @Test
    void invalidOtpConsumesItsLimitedAttempts() {
        UserRepository users = mock(UserRepository.class);
        PasswordResetOtpRepository codes = mock(PasswordResetOtpRepository.class);
        User user = user("old-password", 0L);
        PasswordResetOtp code = PasswordResetOtp.builder().user(user).codeHash(encoder.encode("123456"))
                .attempts(4).expiresAt(Instant.now().plusSeconds(300)).build();
        when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        when(codes.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> resetService(users, codes, mock(PasswordResetMailService.class))
                .reset(new ResetPasswordRequest(user.getEmail(), "654321", "NewPassword123!")))
                .isInstanceOf(BadRequestException.class);
        assertThat(code.getAttempts()).isEqualTo(5);
        assertThat(code.getConsumedAt()).isNotNull();
    }

    private PasswordResetService resetService(UserRepository users, PasswordResetOtpRepository codes,
                                               PasswordResetMailService mail) {
        PasswordResetService service = new PasswordResetService(users, codes, encoder, mail);
        ReflectionTestUtils.setField(service, "expirationMinutes", 10L);
        ReflectionTestUtils.setField(service, "resendCooldownSeconds", 60L);
        ReflectionTestUtils.setField(service, "maxAttempts", 5);
        return service;
    }

    private User user(String rawPassword, long tokenVersion) {
        return User.builder().id(7L).fullName("Test Member").email("member@example.com")
                .passwordHash(encoder.encode(rawPassword)).tokenVersion(tokenVersion)
                .role(User.Role.USER).status(User.Status.ACTIVE).build();
    }
}
