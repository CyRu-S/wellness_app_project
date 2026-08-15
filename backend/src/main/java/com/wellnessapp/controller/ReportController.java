package com.wellnessapp.controller;
import com.wellnessapp.dto.report.AdminSummaryResponse;
import com.wellnessapp.entity.MissedEvent;
import com.wellnessapp.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor public class ReportController {
    private final AdminService admin;
    record MissedItem(Long id, Long userId, String type, String title, Instant missedAt) {}
    @GetMapping("/dashboard") AdminSummaryResponse dashboard() { return admin.summary(); }
    @GetMapping("/missed-items") List<MissedItem> missed() { return admin.missed().stream().map(item -> new MissedItem(item.getId(), item.getUser().getId(), item.getItemType(), item.getItemTitle(), item.getMissedAt())).toList(); }
}

