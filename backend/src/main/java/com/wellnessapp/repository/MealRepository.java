package com.wellnessapp.repository;
import com.wellnessapp.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface MealRepository extends JpaRepository<Meal, Long> {
    interface Summary {
        Long getMemberId();
        LocalDate getMealDate();
        java.time.LocalTime getMealTime();
        String getType();
        boolean isConsumed();
    }
    @org.springframework.data.jpa.repository.Query("select m.user.id as memberId, m.mealDate as mealDate, m.mealTime as mealTime, m.type as type, m.consumed as consumed from Meal m where m.mealDate between :start and :end")
    List<Summary> summaryBetween(LocalDate start, LocalDate end);
    @org.springframework.data.jpa.repository.Query("select meal.id from Meal meal where meal.id in :ids and meal.consumed = false")
    List<Long> incompleteIds(java.util.Collection<Long> ids);
    @org.springframework.data.jpa.repository.Query("select distinct m.user.id, m.mealDate from Meal m where m.consumed = true")
    List<Object[]> allConsumedDates();
    @org.springframework.data.jpa.repository.Query("select distinct m.mealDate from Meal m where m.user.id = :userId and m.consumed = true order by m.mealDate desc")
    List<LocalDate> consumedDates(Long userId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "planItem", "planItem.plan", "planItem.plan.user"})
    List<Meal> findByMealDateOrderByMealTime(LocalDate mealDate);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "planItem", "planItem.plan", "planItem.plan.user"})
    List<Meal> findByMealDateBetween(LocalDate start, LocalDate end);
    List<Meal> findByUserIdAndMealDateOrderByMealTime(Long userId, LocalDate mealDate);
    java.util.Optional<Meal> findByIdAndUserId(Long id, Long userId);
}

