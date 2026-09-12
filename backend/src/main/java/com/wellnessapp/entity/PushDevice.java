package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "push_devices") @Getter @Setter @NoArgsConstructor
public class PushDevice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, unique = true, length = 255) private String expoToken;
    @Column(nullable = false, length = 36) private String registrationId;
    @Column(nullable = false) private boolean enabled;
    @Column(nullable = false) private Instant updatedAt;
}
