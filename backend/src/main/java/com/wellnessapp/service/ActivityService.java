package com.wellnessapp.service;
import com.wellnessapp.dto.activity.ActivityRequest;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Instant;
@Service @RequiredArgsConstructor public class ActivityService {
    private final UserRepository users; private final ActivitySessionRepository activities;
    private final java.time.Clock clock; private final java.time.ZoneId applicationZoneId;
    public record Session(Long id, String activity, int durationSeconds, int minutes, int calories, Double distanceKm, Instant startedAt) {}
    public static Session response(ActivitySession item) {
        double rate = switch (item.getActivity().toLowerCase(java.util.Locale.ROOT)) {
            case "run" -> 10; case "cycling" -> 8; case "strength" -> 6; case "yoga" -> 3.5; default -> 4.5;
        };
        return new Session(item.getId(), item.getActivity(), item.getDurationSeconds(), item.getDurationSeconds() / 60,
                (int) Math.round(item.getDurationSeconds() / 60.0 * rate), item.getDistanceKm(), item.getStartedAt());
    }
    public java.util.List<Session> today(String email) {
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        var date = java.time.LocalDate.now(clock.withZone(applicationZoneId));
        return activities.findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAt(user.getId(),
                date.atStartOfDay(applicationZoneId).toInstant(), date.plusDays(1).atStartOfDay(applicationZoneId).toInstant())
                .stream().map(ActivityService::response).toList();
    }
    public java.util.List<Session> history(String email) {
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        return activities.findByUserIdAndStartedAtAfter(user.getId(), clock.instant().minus(java.time.Duration.ofDays(30)))
                .stream().sorted(java.util.Comparator.comparing(ActivitySession::getStartedAt).reversed()).map(ActivityService::response).toList();
    }
    public ActivitySession create(String email, ActivityRequest request) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); return activities.save(ActivitySession.builder().user(user).activity(request.activity()).durationSeconds(request.durationSeconds()).distanceKm(request.distanceKm()).startedAt(clock.instant()).build()); }
}
