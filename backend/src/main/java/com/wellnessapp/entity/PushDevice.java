package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "push_devices") @Getter @Setter @NoArgsConstructor
public class PushDevice {
    public enum Provider { EXPO, WEB }
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private Provider provider = Provider.EXPO;
    @Column(length = 2048) private String webEndpoint;
    @Column(name = "web_p256dh", length = 128) private String webP256dh;
    @Column(length = 64) private String webAuth;
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, unique = true, length = 255) private String expoToken;
    @Column(nullable = false, length = 36) private String registrationId;
    @Column(nullable = false) private boolean enabled;
    @Column(nullable = false) private Instant updatedAt;
}
