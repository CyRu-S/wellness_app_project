package com.wellnessapp.controller;
import com.wellnessapp.entity.HerbalifeProduct;
import com.wellnessapp.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/admin/products") @RequiredArgsConstructor public class AdminProductController {
    private final AdminService admin;
    @GetMapping List<HerbalifeProduct> list() { return admin.products(); }
}

