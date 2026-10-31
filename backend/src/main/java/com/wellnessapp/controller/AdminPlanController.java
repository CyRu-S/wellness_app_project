package com.wellnessapp.controller;
import com.wellnessapp.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/admin/plans") @RequiredArgsConstructor public class AdminPlanController {
    private final PlanRepository plans;
    private final com.wellnessapp.service.PlanService service;
    @GetMapping("/members/{memberId}") Map<String, Object> member(@PathVariable Long memberId) { return service.memberPlan(memberId); }
    @PutMapping("/members/{memberId}") Map<String, Object> save(Authentication authentication, @PathVariable Long memberId, @jakarta.validation.Valid @RequestBody com.wellnessapp.dto.plan.SaveMealPlanRequest request) { return service.save(authentication.getName(), memberId, request); }
    @PostMapping("/members/{memberId}/z-drink") Map<String, Object> zDrink(Authentication authentication, @PathVariable Long memberId) { return service.convertToZDrink(authentication.getName(), memberId); }
    @PostMapping("/members/{memberId}/z-drink/revert") Map<String, Object> revertZDrink(Authentication authentication, @PathVariable Long memberId) { return service.revertZDrink(authentication.getName(), memberId); }
    @GetMapping List<Map<String, Object>> list() { return plans.findAll().stream().map(plan -> { Map<String, Object> item = new LinkedHashMap<>(); item.put("id", plan.getId()); item.put("title", plan.getTitle()); item.put("userId", plan.getUser().getId()); item.put("active", plan.isActive()); item.put("startDate", plan.getStartDate()); item.put("endDate", plan.getEndDate()); return item; }).toList(); }
}

