package com.wellnessapp.config;

import com.wellnessapp.entity.User;
import com.wellnessapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration @RequiredArgsConstructor
public class AdminAccountConfig {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Value("${app.admin.email:admin@mr-care.app}")
    private String adminEmail;
    @Value("${app.admin.initial-password:}")
    private String initialPassword;

    @Bean CommandLineRunner ensureAdminAccount() {
        return args -> {
            if (users.existsByEmailIgnoreCase(adminEmail)) return;
            if (initialPassword == null || initialPassword.length() < 12) {
                log.warn("No admin was created. Set ADMIN_INITIAL_PASSWORD to at least 12 characters for first-time setup.");
                return;
            }
            users.save(User.builder().fullName("Mr_Care Administrator").email(adminEmail.trim().toLowerCase())
                    .passwordHash(encoder.encode(initialPassword)).role(User.Role.ADMIN).status(User.Status.ACTIVE).build());
            log.info("Created the initial administrator account for {}", adminEmail);
        };
    }
}
