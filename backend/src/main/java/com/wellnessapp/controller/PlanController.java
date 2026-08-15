package com.wellnessapp.controller;
import com.wellnessapp.dto.plan.PlanResponse;
import com.wellnessapp.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/plans") @RequiredArgsConstructor public class PlanController {
    private final PlanService plans;
    @GetMapping("/today") PlanResponse today(Authentication authentication) { return plans.today(authentication.getName()); }
}

