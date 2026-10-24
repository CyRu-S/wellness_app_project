package com.wellnessapp.controller;

import com.wellnessapp.dto.leaderboard.LeaderboardResponse;
import com.wellnessapp.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {
    private final LeaderboardService leaderboard;

    @GetMapping
    LeaderboardResponse get(Authentication authentication) {
        return leaderboard.get(authentication.getName());
    }
}
