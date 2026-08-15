package com.wellnessapp.repository;
import com.wellnessapp.entity.MealItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MealItemRepository extends JpaRepository<MealItem, Long> { List<MealItem> findByMealId(Long mealId); }

