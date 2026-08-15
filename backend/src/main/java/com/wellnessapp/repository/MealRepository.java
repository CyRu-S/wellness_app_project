package com.wellnessapp.repository;
import com.wellnessapp.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface MealRepository extends JpaRepository<Meal, Long> { List<Meal> findByUserIdAndMealDateOrderByMealTime(Long userId, LocalDate mealDate); }

