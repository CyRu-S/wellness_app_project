package com.wellnessapp.service;

import com.wellnessapp.entity.MealPost;
import com.wellnessapp.repository.MealPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealPostRetentionService {
    private final MealPostRepository posts;
    private final MediaStorageService mediaStorage;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    @Transactional
    public int removeExpiredPosts() {
        LocalDate today = LocalDate.now(clock.withZone(applicationZoneId));
        Instant cutoff = today.minusDays(AdminMemberJournalService.RETENTION_DAYS)
                .atStartOfDay(applicationZoneId).toInstant();
        List<MealPost> expired = posts.findByPostedAtLessThan(cutoff);
        if (expired.isEmpty()) return 0;

        posts.deleteAll(expired);
        posts.flush();
        expired.forEach(post -> mediaStorage.deleteQuietly(post.getMediaKey()));
        return expired.size();
    }
}
