package com.wellnessapp.repository;
import com.wellnessapp.entity.HerbalifeProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProductRepository extends JpaRepository<HerbalifeProduct, Long> { List<HerbalifeProduct> findByActiveTrueOrderByName(); long countByActiveTrue(); }

