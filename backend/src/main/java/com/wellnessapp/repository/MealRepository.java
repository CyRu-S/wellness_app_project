package com.wellnessapp.repository;
import com.wellnessapp.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface MealRepository extends JpaRepository<Meal, Long> {
    @org.springframework.data.jpa.repository.Query("select distinct m.mealDate from Meal m where m.user.id = :userId and m.consumed = true order by m.mealDate desc")
    List<LocalDate> consumedDates(Long userId);
    List<Meal> findByMealDateOrderByMealTime(LocalDate mealDate);
    List<Meal> findByMealDateBetween(LocalDate start, LocalDate end);
    List<Meal> findByUserIdAndMealDateOrderByMealTime(Long userId, LocalDate mealDate);
    java.util.Optional<Meal> findByIdAndUserId(Long id, Long userId);
}

