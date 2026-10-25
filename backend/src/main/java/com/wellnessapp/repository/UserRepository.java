package com.wellnessapp.repository;
import com.wellnessapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface UserRepository extends JpaRepository<User, Long> {
    interface NudgeStamp {
        Long getMemberId();
        java.time.Instant getSentAt();
    }
    @org.springframework.data.jpa.repository.Query("select u.id as memberId, u.lastNudgedAt as sentAt from User u where u.lastNudgedAt > :cutoff")
    List<NudgeStamp> recentNudges(java.time.Instant cutoff);
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM users WHERE id = :id", nativeQuery = true)
    int deleteAccountById(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")
    Optional<User> lockById(Long id);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update User u set u.lastSeenAt = :seenAt where lower(u.email) = lower(:email) and (u.lastSeenAt is null or u.lastSeenAt < :seenAt)")
    int recordPresence(String email, java.time.Instant seenAt);
    Optional<User> findByEmailIgnoreCase(String email);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<User> findForUpdateByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByStatus(User.Status status);
    long countByRoleAndStatus(User.Role role, User.Status status);
    List<User> findByRoleAndStatusOrderByFullName(User.Role role, User.Status status);
}

