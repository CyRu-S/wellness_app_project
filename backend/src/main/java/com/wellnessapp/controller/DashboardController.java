package com.wellnessapp.controller;
import com.wellnessapp.dto.dashboard.DashboardResponse;
import com.wellnessapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/dashboard") @RequiredArgsConstructor public class DashboardController {
    private final DashboardService dashboard;
    @GetMapping DashboardResponse get(Authentication authentication) { return dashboard.get(authentication.getName()); }
}

