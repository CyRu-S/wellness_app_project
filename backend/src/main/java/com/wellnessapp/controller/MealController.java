package com.wellnessapp.controller;
import com.wellnessapp.dto.meal.MealResponse;
import com.wellnessapp.dto.meal.MealAnalysisResponse;
import com.wellnessapp.service.AiMealAnalysisService;
import com.wellnessapp.service.FoodAnalysisRateLimiter;
import com.wellnessapp.service.MealService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
@RestController @RequestMapping("/api/meals") @RequiredArgsConstructor public class MealController {
    private final MealService meals;
    private final AiMealAnalysisService analysis;
    private final FoodAnalysisRateLimiter analysisRateLimit;
    @GetMapping("/today") List<MealResponse> today(Authentication authentication) { return meals.today(authentication.getName()); }
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    MealAnalysisResponse analyze(Authentication authentication, @RequestPart("image") MultipartFile image, @RequestParam(defaultValue = "meal") String category) {
        analysisRateLimit.requireAllowance(authentication.getName());
        return analysis.analyse(image, category);
    }
}
