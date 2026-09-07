package com.wellnessapp.service;

import com.wellnessapp.dto.auth.*;
import com.wellnessapp.entity.User;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users; private final PasswordEncoder encoder; private final AuthenticationManager authenticationManager; private final JwtTokenProvider tokens; private final GoogleIdentityService googleIdentities;
    private final com.wellnessapp.repository.UserProfileRepository profiles;
    private final MediaStorageService mediaStorage;
    public AuthResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email().trim(), request.password()));
        User user = users.findByEmailIgnoreCase(request.email()).orElseThrow();
        return response(user, tokens.generate(authentication));
    }
    @Transactional public AuthResponse register(RegisterRequest request) { return register(request, null); }
    @Transactional public AuthResponse register(RegisterRequest request, org.springframework.web.multipart.MultipartFile image) {
        if (users.existsByEmailIgnoreCase(request.email())) throw new ConflictException("An account already exists for this email");
        User user = users.save(User.builder().fullName(request.name().trim()).email(request.email().trim().toLowerCase()).passwordHash(encoder.encode(request.password())).role(User.Role.USER).status(User.Status.PENDING).build());
        var profile = com.wellnessapp.entity.UserProfile.builder().user(user).age(request.age())
                .heightCm(request.heightCm()).weightKg(request.weightKg()).goal(request.goal()).dietaryPreferences(request.notes()).build();
        if (image != null && !image.isEmpty()) {
            var stored = mediaStorage.store(image);
            profile.setPhotoMediaKey(stored.key()); profile.setPhotoOriginalName(stored.originalName());
            profile.setPhotoContentType(stored.contentType()); profile.setPhotoSize(stored.size());
        }
        profiles.save(profile);
        return response(user, null);
    }
    @Transactional public AuthResponse google(GoogleLoginRequest request) {
        var identity = googleIdentities.verify(request.idToken());
        User user = users.findByEmailIgnoreCase(identity.email()).orElseGet(() -> users.save(User.builder()
                .fullName(identity.name())
                .email(identity.email())
                .passwordHash(encoder.encode(UUID.randomUUID().toString()))
                .role(User.Role.USER)
                .status(User.Status.PENDING)
                .build()));
        if (user.getStatus() == User.Status.PENDING) return response(user, null);
        if (user.getStatus() != User.Status.ACTIVE) throw new DisabledException("This account is not active");
        return response(user, tokens.generate(user.getEmail(), "ROLE_" + user.getRole().name()));
    }
    private AuthResponse response(User user, String token) { return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getRole().name(), user.getStatus().name()); }
}
