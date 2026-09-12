package com.wellnessapp.service;

import com.wellnessapp.dto.auth.*;
import com.wellnessapp.entity.PushDelivery;
import com.wellnessapp.entity.User;
import com.wellnessapp.entity.UserProfile;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.repository.UserProfileRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokens;
    private final GoogleIdentityService googleIdentities;
    private final UserProfileRepository profiles;
    private final MediaStorageService mediaStorage;
    private final WorkflowNotificationService notices;

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
        notifySignup(user);
        return response(user, null);
    }

    @Transactional
    public AuthResponse google(GoogleLoginRequest request) {
        var identity = googleIdentities.verify(request.idToken());
        var existing = users.findByEmailIgnoreCase(identity.email());
        if (existing.isEmpty()) return profileRequired(identity);

        User user = existing.get();
        linkGoogleIdentity(user, identity.subject());
        if (user.getStatus() == User.Status.SUSPENDED) {
            throw new DisabledException("This account is not active");
        }
        if (user.getRole() == User.Role.USER && !profiles.existsByUserId(user.getId())) {
            return profileRequired(identity);
        }
        if (user.getStatus() == User.Status.PENDING) return response(user, null);
        return response(user, issueToken(user));
    }

    @Transactional
    public AuthResponse registerGoogle(GoogleRegisterRequest request) { return registerGoogle(request, null); }

    @Transactional
    public AuthResponse registerGoogle(GoogleRegisterRequest request, MultipartFile image) {
        var identity = googleIdentities.verify(request.idToken());
        User user = users.findByEmailIgnoreCase(identity.email()).orElseGet(() -> users.save(User.builder()
                .fullName(identity.name())
                .email(identity.email())
                .passwordHash(encoder.encode(UUID.randomUUID().toString()))
                .googleSubject(identity.subject())
                .role(User.Role.USER)
                .status(User.Status.PENDING)
                .build()));

        linkGoogleIdentity(user, identity.subject());
        if (user.getRole() != User.Role.USER) {
            throw new BadRequestException("Administrator accounts do not use member profile registration");
        }
        if (user.getStatus() == User.Status.SUSPENDED) {
            throw new DisabledException("This account is not active");
        }
        if (!profiles.existsByUserId(user.getId())) {
            createProfile(user, request.age(), request.heightCm(), request.weightKg(),
                    request.goal(), request.notes(), image);
            notifySignup(user);
        }
        if (user.getStatus() == User.Status.PENDING) return response(user, null);
        return response(user, issueToken(user));
    }

    private void linkGoogleIdentity(User user, String subject) {
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().equals(subject)) {
            throw new BadRequestException("This email is linked to a different Google identity");
        }
        if (user.getGoogleSubject() == null) user.setGoogleSubject(subject);
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

    private void notifySignup(User user) {
        notices.admins(PushDelivery.Kind.SIGNUP, "signup-" + user.getId(),
                "New signup request",
                user.getFullName() + " has requested membership. Review the approval request.");
    }

    private AuthResponse profileRequired(GoogleIdentityService.GoogleIdentity identity) {
        return new AuthResponse(null, null, identity.name(), identity.email(),
                User.Role.USER.name(), "PROFILE_REQUIRED");
    }

    private String issueToken(User user) {
        long version = user.getTokenVersion() == null ? 0L : user.getTokenVersion();
        return tokens.generate(user.getEmail(), "ROLE_" + user.getRole().name(), version);
    }

    private AuthResponse response(User user, String token) {
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(),
                user.getRole().name(), user.getStatus().name());
    }
}
