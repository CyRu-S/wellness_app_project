package com.wellnessapp.controller;
import com.wellnessapp.dto.meal.MealResponse;
import com.wellnessapp.service.MealService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/meals") @RequiredArgsConstructor public class MealController {
    private final MealService meals;
    @GetMapping("/today") List<MealResponse> today(Authentication authentication) { return meals.today(authentication.getName()); }
}

