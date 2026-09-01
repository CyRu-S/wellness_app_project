package com.wellnessapp.controller;

import com.wellnessapp.dto.access.AdminMemberAccessResponse;
import com.wellnessapp.dto.access.ReplaceMemberAccessRequest;
import com.wellnessapp.service.MemberAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/member-access")
@RequiredArgsConstructor
public class AdminMemberAccessController {
    private final MemberAccessService memberAccess;

    @GetMapping
    AdminMemberAccessResponse overview() {
        return memberAccess.adminOverview();
    }

    @PutMapping("/{viewerId}")
    AdminMemberAccessResponse.ViewerAccess replace(
            Authentication authentication,
            @PathVariable Long viewerId,
            @Valid @RequestBody ReplaceMemberAccessRequest request) {
        return memberAccess.replaceAssignments(authentication.getName(), viewerId, request);
    }
}
