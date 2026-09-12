package com.wellnessapp.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit code") String otp,
        @NotBlank @Size(min = 8, max = 72) String newPassword
) {}
