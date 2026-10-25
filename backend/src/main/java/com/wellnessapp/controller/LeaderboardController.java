package com.wellnessapp.controller;

import com.wellnessapp.dto.leaderboard.LeaderboardResponse;
import com.wellnessapp.service.LeaderboardService;
import com.wellnessapp.service.ProfileService;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {
    private final LeaderboardService leaderboard;
    private final ProfileService profiles;

    @GetMapping
    ResponseEntity<LeaderboardResponse> get(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(leaderboard.get(authentication.getName()));
    }

    @GetMapping("/members/{memberId}/photo")
    ResponseEntity<Resource> photo(Authentication authentication, @PathVariable Long memberId) {
        var photo = profiles.leaderboardPhoto(authentication.getName(), memberId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.contentType()))
                .contentLength(photo.size()).cacheControl(CacheControl.noStore())
                .body(photo.resource());
    }
}
