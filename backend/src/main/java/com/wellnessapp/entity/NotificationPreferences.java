package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "notification_preferences")
@Getter @Setter @NoArgsConstructor
public class NotificationPreferences {
    @Id @Column(name = "user_id") private Long userId;
    @OneToOne @MapsId @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private boolean notificationsEnabled = true;
    @Column(nullable = false) private boolean mealReminders = true;
    @Column(nullable = false) private boolean coachNudges = true;
    @Column(nullable = false) private boolean signupAlerts = true;
    @Column(nullable = false) private boolean deadlineAlerts = true;
    @Column(nullable = false) private boolean dailyDigest;
    @Column(nullable = false) private boolean memberUpdates;
    @Column(nullable = false) private boolean accountUpdates = true;
    @Column(nullable = false) private boolean customSound = true;
}
