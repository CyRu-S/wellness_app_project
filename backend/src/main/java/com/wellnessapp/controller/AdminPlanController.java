package com.wellnessapp.controller;
import com.wellnessapp.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/admin/plans") @RequiredArgsConstructor public class AdminPlanController {
    private final PlanRepository plans;
    @GetMapping List<Map<String, Object>> list() { return plans.findAll().stream().map(plan -> { Map<String, Object> item = new LinkedHashMap<>(); item.put("id", plan.getId()); item.put("title", plan.getTitle()); item.put("userId", plan.getUser().getId()); item.put("active", plan.isActive()); item.put("startDate", plan.getStartDate()); item.put("endDate", plan.getEndDate()); return item; }).toList(); }
}

