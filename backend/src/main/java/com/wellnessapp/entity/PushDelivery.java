package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "push_deliveries", uniqueConstraints = @UniqueConstraint(columnNames = {"notification_id", "device_id"}))
@Getter @Setter @NoArgsConstructor
public class PushDelivery {
    public enum Kind { MEAL, NUDGE, TEST }
    public enum Status { QUEUED, RECEIPT, DELIVERED, FAILED, CANCELLED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "notification_id") private NotificationEvent notification;
    @ManyToOne(optional = false) @JoinColumn(name = "device_id") private PushDevice device;
    @Column(nullable = false, length = 36) private String registrationId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private Kind kind;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    @Column(nullable = false) private int attempts;
    @Column(length = 100) private String receiptId;
    @Column(length = 100) private String lastError;
    @Column(nullable = false) private Instant nextAttemptAt;
    @Column(nullable = false) private Instant expiresAt;
}
