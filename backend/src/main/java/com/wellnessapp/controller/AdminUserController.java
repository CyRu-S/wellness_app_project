package com.wellnessapp.controller;
import com.wellnessapp.dto.admin.AdminMemberJournalResponse;
import com.wellnessapp.dto.admin.UpdateMemberWaterGoalRequest;
import com.wellnessapp.entity.User;
import com.wellnessapp.service.AdminMemberJournalService;
import com.wellnessapp.service.AdminService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
@RestController @RequestMapping("/api/admin/users") @RequiredArgsConstructor public class AdminUserController {
    private final AdminService admin;
    private final AdminMemberJournalService journals;
    record UserSummary(Long id, String name, String email, String role, String status, Instant createdAt) {}
    @GetMapping List<UserSummary> list() { return admin.users().stream().map(user -> new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.getRole().name(), user.getStatus().name(), user.getCreatedAt())).toList(); }
    @GetMapping("/{memberId}/journal") AdminMemberJournalResponse journal(@PathVariable Long memberId) { return journals.get(memberId); }
    @PatchMapping("/{memberId}/water-goal") AdminMemberJournalResponse.Member updateWaterGoal(
            @PathVariable Long memberId,
            @Valid @RequestBody UpdateMemberWaterGoalRequest request) {
        return journals.updateWaterGoal(memberId, request);
    }
}

