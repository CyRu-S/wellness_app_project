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
    public AuthResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = users.findByEmailIgnoreCase(request.email()).orElseThrow();
        return response(user, tokens.generate(authentication));
    }
    @Transactional public AuthResponse register(RegisterRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) throw new ConflictException("An account already exists for this email");
        User user = users.save(User.builder().fullName(request.name().trim()).email(request.email().trim().toLowerCase()).passwordHash(encoder.encode(request.password())).role(User.Role.USER).status(User.Status.ACTIVE).build());
        var authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        return response(user, tokens.generate(authentication));
    }
    @Transactional public AuthResponse google(GoogleLoginRequest request) {
        var identity = googleIdentities.verify(request.idToken());
        User user = users.findByEmailIgnoreCase(identity.email()).orElseGet(() -> users.save(User.builder()
                .fullName(identity.name())
                .email(identity.email())
                .passwordHash(encoder.encode(UUID.randomUUID().toString()))
                .role(User.Role.USER)
                .status(User.Status.ACTIVE)
                .build()));
        if (user.getStatus() != User.Status.ACTIVE) throw new BadCredentialsException("This account is not active");
        return response(user, tokens.generate(user.getEmail(), "ROLE_" + user.getRole().name()));
    }
    private AuthResponse response(User user, String token) { return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getRole().name()); }
}
