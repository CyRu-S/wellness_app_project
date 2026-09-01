package com.wellnessapp.repository;
import com.wellnessapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByStatus(User.Status status);
    List<User> findByRoleAndStatusOrderByFullName(User.Role role, User.Status status);
}

