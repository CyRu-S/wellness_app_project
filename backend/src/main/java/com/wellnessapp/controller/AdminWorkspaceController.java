package com.wellnessapp.controller;
import com.wellnessapp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor
public class AdminWorkspaceController {
    private final AdminWorkspaceService workspace;
    private final ReminderService reminders;
    @GetMapping("/workspace") Map<String, Object> get() { return workspace.workspace(); }
    public record Decision(@jakarta.validation.constraints.NotBlank String decision) {}
    @PatchMapping("/users/{id}/approval") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void decide(@PathVariable Long id, @jakarta.validation.Valid @RequestBody Decision request) { workspace.decide(id, request.decision()); }
    @PatchMapping("/attention/{id}/resolve") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void resolve(@PathVariable Long id) { reminders.resolve(id); }
    @PostMapping("/attention/{id}/nudge") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void nudge(@PathVariable Long id) { reminders.nudge(id); }
}
