package com.wellnessapp.controller;

import com.wellnessapp.dto.access.SharedMemberTodayResponse;
import com.wellnessapp.dto.access.SharedMembersResponse;
import com.wellnessapp.dto.access.MemberNudgeType;
import com.wellnessapp.service.MemberAccessService;
import com.wellnessapp.service.AdminMemberJournalService;
import com.wellnessapp.service.ReminderService;
import com.wellnessapp.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shared-members")
@RequiredArgsConstructor
public class SharedMemberController {
    private final MemberAccessService memberAccess;
    private final AdminMemberJournalService journals;
    private final ReminderService reminders;
    private final PlanService plans;

    @GetMapping
    SharedMembersResponse list(Authentication authentication) {
        return memberAccess.sharedMembers(authentication.getName());
    }

    @GetMapping("/{memberId}/today")
    SharedMemberTodayResponse today(Authentication authentication, @PathVariable Long memberId) {
        return memberAccess.sharedMemberToday(authentication.getName(), memberId);
    }

    @GetMapping("/{memberId}/journal")
    com.wellnessapp.dto.admin.AdminMemberJournalResponse journal(
            Authentication authentication, @PathVariable Long memberId) {
        return journals.getShared(authentication.getName(), memberId);
    }

    @GetMapping("/{memberId}/attention")
    java.util.List<java.util.Map<String, Object>> attention(Authentication authentication, @PathVariable Long memberId) {
        return reminders.sharedAttention(authentication.getName(), memberId);
    }

    @PostMapping("/{memberId}/attention/{attentionId}/nudge")
    ReminderService.NudgeResult nudgeAttention(Authentication authentication, @PathVariable Long memberId,
            @PathVariable Long attentionId) {
        return reminders.nudgeSharedAttention(authentication.getName(), memberId, attentionId);
    }

    @PostMapping("/{memberId}/nudge")
    ReminderService.NudgeResult legacyNudge(Authentication authentication, @PathVariable Long memberId) {
        return reminders.nudgeSharedMember(authentication.getName(), memberId, MemberNudgeType.HABITS);
    }

    @PostMapping("/{memberId}/nudges/{type}")
    ReminderService.NudgeResult nudge(
            Authentication authentication,
            @PathVariable Long memberId,
            @PathVariable MemberNudgeType type) {
        return reminders.nudgeSharedMember(authentication.getName(), memberId, type);
    }

    @GetMapping("/{memberId}/plan")
    java.util.Map<String, Object> plan(Authentication authentication, @PathVariable Long memberId) {
        return plans.sharedMemberPlan(authentication.getName(), memberId);
    }

    @PutMapping("/{memberId}/plan")
    java.util.Map<String, Object> savePlan(
            Authentication authentication,
            @PathVariable Long memberId,
            @jakarta.validation.Valid @RequestBody com.wellnessapp.dto.plan.SaveMealPlanRequest request) {
        return plans.save(authentication.getName(), memberId, request);
    }

    @PostMapping("/{memberId}/plan/z-drink")
    java.util.Map<String, Object> zDrink(Authentication authentication, @PathVariable Long memberId) {
        return plans.convertToZDrink(authentication.getName(), memberId);
    }

    @PostMapping("/{memberId}/plan/z-drink/revert")
    java.util.Map<String, Object> revertZDrink(Authentication authentication, @PathVariable Long memberId) {
        return plans.revertZDrink(authentication.getName(), memberId);
    }
}
