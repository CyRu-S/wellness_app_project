package com.wellnessapp.service;
import com.wellnessapp.dto.activity.ActivityRequest;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Instant;
@Service @RequiredArgsConstructor public class ActivityService {
    private final UserRepository users; private final ActivitySessionRepository activities;
    public ActivitySession create(String email, ActivityRequest request) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); return activities.save(ActivitySession.builder().user(user).activity(request.activity()).durationSeconds(request.durationSeconds()).distanceKm(request.distanceKm()).startedAt(Instant.now()).build()); }
}

