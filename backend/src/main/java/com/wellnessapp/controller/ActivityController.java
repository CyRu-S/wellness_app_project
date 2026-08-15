package com.wellnessapp.controller;
import com.wellnessapp.dto.activity.ActivityRequest;
import com.wellnessapp.entity.ActivitySession;
import com.wellnessapp.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
@RestController @RequestMapping("/api/activities") @RequiredArgsConstructor public class ActivityController {
    private final ActivityService activities;
    record ActivityResponse(Long id, String activity, int durationSeconds, Double distanceKm, Instant startedAt) {}
    @PostMapping ResponseEntity<ActivityResponse> create(Authentication authentication, @Valid @RequestBody ActivityRequest request) { ActivitySession saved = activities.create(authentication.getName(), request); return ResponseEntity.status(HttpStatus.CREATED).body(new ActivityResponse(saved.getId(), saved.getActivity(), saved.getDurationSeconds(), saved.getDistanceKm(), saved.getStartedAt())); }
}

