package com.wellnessapp.controller;
import com.wellnessapp.dto.profile.ProfileResponse;
import com.wellnessapp.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/profile") @RequiredArgsConstructor public class ProfileController {
    private final ProfileService profiles;
    @GetMapping ProfileResponse get(Authentication authentication) { return profiles.get(authentication.getName()); }
}

