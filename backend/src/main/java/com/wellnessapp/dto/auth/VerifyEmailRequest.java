package com.wellnessapp.dto.auth;

import jakarta.validation.constraints.*;

public record VerifyEmailRequest(
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit code") String otp
) {}
