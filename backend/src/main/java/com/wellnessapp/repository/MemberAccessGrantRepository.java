package com.wellnessapp.repository;

import com.wellnessapp.entity.MemberAccessGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberAccessGrantRepository extends JpaRepository<MemberAccessGrant, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"viewer", "subject"})
    List<MemberAccessGrant> findByViewerIdOrderBySubjectFullName(Long viewerId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"viewer", "subject"})
    List<MemberAccessGrant> findAllByOrderByViewerFullNameAscSubjectFullNameAsc();
    boolean existsByViewerIdAndSubjectId(Long viewerId, Long subjectId);
    void deleteByViewerId(Long viewerId);
}
