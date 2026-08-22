package com.wellnessapp.controller;

import com.wellnessapp.dto.access.SharedMemberTodayResponse;
import com.wellnessapp.dto.access.SharedMembersResponse;
import com.wellnessapp.service.MemberAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shared-members")
@RequiredArgsConstructor
public class SharedMemberController {
    private final MemberAccessService memberAccess;

    @GetMapping
    SharedMembersResponse list(Authentication authentication) {
        return memberAccess.sharedMembers(authentication.getName());
    }

    @GetMapping("/{memberId}/today")
    SharedMemberTodayResponse today(Authentication authentication, @PathVariable Long memberId) {
        return memberAccess.sharedMemberToday(authentication.getName(), memberId);
    }
}
