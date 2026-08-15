package com.wellnessapp.controller;
import com.wellnessapp.entity.User;
import com.wellnessapp.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
@RestController @RequestMapping("/api/admin/users") @RequiredArgsConstructor public class AdminUserController {
    private final AdminService admin;
    record UserSummary(Long id, String name, String email, String role, String status, Instant createdAt) {}
    @GetMapping List<UserSummary> list() { return admin.users().stream().map(user -> new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.getRole().name(), user.getStatus().name(), user.getCreatedAt())).toList(); }
}

