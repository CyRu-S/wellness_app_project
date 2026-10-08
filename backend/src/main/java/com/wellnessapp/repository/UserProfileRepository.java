package com.wellnessapp.repository;
import com.wellnessapp.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "user")
    java.util.List<UserProfile> findByUserIdIn(java.util.Collection<Long> userIds);
    Optional<UserProfile> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}

