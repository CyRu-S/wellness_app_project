package com.wellnessapp.controller;

import com.wellnessapp.dto.access.SharedMemberTodayResponse;
import com.wellnessapp.dto.access.SharedMembersResponse;
import com.wellnessapp.dto.access.MemberNudgeType;
import com.wellnessapp.service.MemberAccessService;
import com.wellnessapp.service.AdminMemberJournalService;
import com.wellnessapp.service.ReminderService;
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
}
