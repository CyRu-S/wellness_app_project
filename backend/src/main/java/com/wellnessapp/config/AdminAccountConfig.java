package com.wellnessapp.config;

import com.wellnessapp.entity.User;
import com.wellnessapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration @RequiredArgsConstructor
public class AdminAccountConfig {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Bean CommandLineRunner ensureAdminAccount() {
        return args -> {
            if (!users.existsByEmailIgnoreCase("admin@mr-care.app")) {
                users.save(User.builder().fullName("Arpan Admin").email("admin@mr-care.app")
                        .passwordHash(encoder.encode("password")).role(User.Role.ADMIN).status(User.Status.ACTIVE).build());
            }
        };
    }
}
