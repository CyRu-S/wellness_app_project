package com.wellnessapp.dto.access;

import java.time.Instant;
import java.util.List;

public record AdminMemberAccessResponse(
        int totalGrants,
        int viewersWithAccess,
        List<ViewerAccess> viewers
) {
    public record Member(Long id, String name) {}

    public record ViewerAccess(
            Long id,
            String name,
            int assignedCount,
            List<Member> assignedMembers,
            Instant lastGrantedAt
    ) {}
}
