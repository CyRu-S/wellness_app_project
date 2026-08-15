package com.wellnessapp.service;
import com.wellnessapp.dto.report.AdminSummaryResponse;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
@Service @RequiredArgsConstructor public class AdminService {
    private final UserRepository users; private final PlanRepository plans; private final MissedEventRepository missed; private final ProductRepository products;
    public AdminSummaryResponse summary() { return new AdminSummaryResponse(users.countByStatus(User.Status.PENDING), plans.countByActiveTrue(), missed.countByResolvedFalse(), products.countByActiveTrue()); }
    public List<User> users() { return users.findAll(); }
    public List<MissedEvent> missed() { return missed.findByResolvedFalseOrderByMissedAtDesc(); }
    public List<HerbalifeProduct> products() { return products.findByActiveTrueOrderByName(); }
}

