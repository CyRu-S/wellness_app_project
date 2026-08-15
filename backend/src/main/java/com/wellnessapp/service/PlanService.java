package com.wellnessapp.service;
import com.wellnessapp.dto.plan.PlanResponse;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service @RequiredArgsConstructor public class PlanService {
    private final UserRepository users; private final PlanRepository plans; private final PlanItemRepository items;
    public PlanResponse today(String email) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); Plan plan = plans.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(user.getId()).orElseThrow(() -> new NotFoundException("No active plan found")); return new PlanResponse(plan.getId(), plan.getTitle(), plan.getGoal(), plan.getStartDate(), plan.getEndDate(), items.findByPlanIdOrderBySortOrder(plan.getId()).stream().map(item -> new PlanResponse.Item(item.getId(), item.getType().name(), item.getTitle(), item.getDetail(), item.getScheduledTime(), item.isCompleted(), item.getSortOrder())).toList()); }
}

