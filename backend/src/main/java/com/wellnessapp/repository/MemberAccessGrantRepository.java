package com.wellnessapp.repository;

import com.wellnessapp.entity.MemberAccessGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberAccessGrantRepository extends JpaRepository<MemberAccessGrant, Long> {
    List<MemberAccessGrant> findByViewerIdOrderBySubjectFullName(Long viewerId);
    List<MemberAccessGrant> findAllByOrderByViewerFullNameAscSubjectFullNameAsc();
    boolean existsByViewerIdAndSubjectId(Long viewerId, Long subjectId);
    void deleteByViewerId(Long viewerId);
}
