package com.wellnessapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "products")
public class HerbalifeProduct {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 50) private String sku;
    @Column(nullable = false, length = 160) private String name;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal price;
    @Column(name = "stock_quantity", nullable = false) private int stockQuantity;
    @Column(nullable = false) private boolean active;
}

