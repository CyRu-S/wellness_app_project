package com.wellnessapp.controller;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wellnessapp.dto.activity.ActivityRequest;
import com.wellnessapp.entity.ActivitySession;
import com.wellnessapp.service.ActivityService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activities;
    @org.springframework.web.bind.annotation.GetMapping
    java.util.List<ActivityService.Session> history(Authentication authentication) { return activities.history(authentication.getName()); }

    record ActivityResponse(Long id, String activity, int durationSeconds, Double distanceKm, Instant startedAt) {

    }

    @PostMapping
    ResponseEntity<ActivityResponse> create(Authentication authentication, @Valid @RequestBody ActivityRequest request) {
        ActivitySession saved = activities.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ActivityResponse(saved.getId(), saved.getActivity(), saved.getDurationSeconds(), saved.getDistanceKm(), saved.getStartedAt()));
    }
}
