package com.wellnessapp.scheduler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Slf4j @Component public class MissedItemScheduler {
    @Scheduled(cron = "0 5 * * * *") public void flagMissedItems() { log.debug("Checking for missed plan items"); }
}

