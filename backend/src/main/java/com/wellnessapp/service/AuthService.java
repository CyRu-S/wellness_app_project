package com.wellnessapp.service;

import com.wellnessapp.dto.auth.*;
import com.wellnessapp.entity.User;
import com.wellnessapp.entity.UserProfile;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.repository.UserProfileRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;


@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokens;
    private final UserProfileRepository profiles;
    private final MediaStorageService mediaStorage;
    private final EmailVerificationService emailVerification;

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                request.email().trim(), request.password()));
        User user = users.findByEmailIgnoreCase(request.email().trim()).orElseThrow();
        return response(user, issueToken(user));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) { return register(request, null); }

    @Transactional
    public AuthResponse register(RegisterRequest request, MultipartFile image) {
        emailVerification.ensureConfigured();
        if (users.existsByEmailIgnoreCase(request.email().trim())) {
            throw new ConflictException("An account already exists for this email");
        }
        User user = users.save(User.builder()
                .fullName(request.name().trim())
                .email(request.email().trim().toLowerCase())
                .passwordHash(encoder.encode(request.password()))
                .role(User.Role.USER)
                .status(User.Status.PENDING)
                .build());
        createProfile(user, request.age(), request.heightCm(), request.weightKg(),
                request.goal(), request.notes(), image);
        emailVerification.sendInitial(user);
        return response(user, null);
    }

    private void createProfile(User user, Integer age, Integer heightCm, Double weightKg,
                               String goal, String notes, MultipartFile image) {
        var profile = UserProfile.builder().user(user).age(age)
                .heightCm(heightCm).weightKg(weightKg).goal(goal).dietaryPreferences(notes).build();
        if (image != null && !image.isEmpty()) {
            var stored = mediaStorage.store(image);
            profile.setPhotoMediaKey(stored.key());
            profile.setPhotoOriginalName(stored.originalName());
            profile.setPhotoContentType(stored.contentType());
            profile.setPhotoSize(stored.size());
        }
        profiles.save(profile);
    }

    private String issueToken(User user) {
        long version = user.getTokenVersion() == null ? 0L : user.getTokenVersion();
        return tokens.generate(user.getEmail(), "ROLE_" + user.getRole().name(), version);
    }

    private AuthResponse response(User user, String token) {
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(),
                user.getRole().name(), user.getStatus().name(), user.getPhoneNumber(), user.getClubName());
    }
}
