package com.wellnessapp.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wellnessapp.dto.profile.BodyMetricsRequest;
import com.wellnessapp.entity.User;
import com.wellnessapp.entity.UserProfile;
import com.wellnessapp.exception.ConflictException;
import com.wellnessapp.repository.UserProfileRepository;
import com.wellnessapp.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {
    @Mock UserRepository users;
    @Mock UserProfileRepository profiles;
    @Mock Clock clock;
    @InjectMocks ProfileService service;

    @Test
    void rejectsBodyMetricUpdatesInsideSevenDayWindow() {
        User user = User.builder().id(7L).email("member@example.com").role(User.Role.USER).build();
        Instant now = Instant.now();
        UserProfile profile = UserProfile.builder()
            .user(user)
            .lastBodyMetricsUpdatedAt(now.minus(1, ChronoUnit.DAYS))
            .build();
        when(users.findByEmailIgnoreCase("member@example.com")).thenReturn(Optional.of(user));
        when(profiles.findByUserId(7L)).thenReturn(Optional.of(profile));
        when(clock.instant()).thenReturn(now);

        BodyMetricsRequest request = new BodyMetricsRequest(174, 72.4, 84.0, 19.2);

        assertThrows(ConflictException.class, () -> service.updateBodyMetrics("member@example.com", request));
        verify(profiles, never()).save(any());
    }
}
