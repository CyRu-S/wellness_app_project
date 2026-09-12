package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "users")
public class User {
    public enum Role { USER, ADMIN }
    public enum Status { PENDING, ACTIVE, SUSPENDED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;
    @Column(nullable = false, unique = true, length = 180)
    private String email;
    @Column(name = "password_hash", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String passwordHash;
    @Column(name = "google_subject", unique = true, length = 255)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String googleSubject;
    @Builder.Default
    @Column(name = "token_version", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Long tokenVersion = 0L;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Role role;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Status status;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "last_seen_at") private Instant lastSeenAt;
}

