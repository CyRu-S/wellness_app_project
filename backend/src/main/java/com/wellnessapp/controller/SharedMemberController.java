package com.wellnessapp.controller;

import com.wellnessapp.dto.access.SharedMemberTodayResponse;
import com.wellnessapp.dto.access.SharedMembersResponse;
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

    @PostMapping("/{memberId}/nudge")
    java.util.Map<String, Object> nudge(Authentication authentication, @PathVariable Long memberId) {
        return java.util.Map.of("sent", reminders.nudgeSharedMember(authentication.getName(), memberId));
    }
}
