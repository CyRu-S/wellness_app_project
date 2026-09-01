package com.wellnessapp.controller;
import com.wellnessapp.dto.admin.AdminMemberJournalResponse;
import com.wellnessapp.dto.admin.UpdateMemberWaterGoalRequest;
import com.wellnessapp.entity.User;
import com.wellnessapp.service.AdminMemberJournalService;
import com.wellnessapp.service.AdminService;
import com.wellnessapp.service.ProfileService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
@RestController @RequestMapping("/api/admin/users") @RequiredArgsConstructor public class AdminUserController {
    private final AdminService admin;
    private final AdminMemberJournalService journals;
    private final ProfileService profiles;
    record UserSummary(Long id, String name, String email, String role, String status, Instant createdAt, String profileImageUrl) {}
    @GetMapping List<UserSummary> list() { return admin.users().stream().map(user -> new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.getRole().name(), user.getStatus().name(), user.getCreatedAt(), user.getRole() == User.Role.USER ? profiles.adminPhotoUrl(user.getId()) : null)).toList(); }
    @GetMapping("/{memberId}/journal") AdminMemberJournalResponse journal(@PathVariable Long memberId) { return journals.get(memberId); }
    @PatchMapping("/{memberId}/water-goal") AdminMemberJournalResponse.Member updateWaterGoal(
            @PathVariable Long memberId,
            @Valid @RequestBody UpdateMemberWaterGoalRequest request) {
        return journals.updateWaterGoal(memberId, request);
    }
    @GetMapping("/{memberId}/profile-photo")
    ResponseEntity<org.springframework.core.io.Resource> profilePhoto(
            Authentication authentication,
            @PathVariable Long memberId) {
        ProfileService.MediaDownload download = profiles.memberPhoto(authentication.getName(), memberId);
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(download.originalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .contentLength(download.size())
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(download.resource());
    }
}

