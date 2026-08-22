package com.wellnessapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class RuntimeConfig {
    @Bean
    ZoneId applicationZoneId(@Value("${app.time-zone:Asia/Kolkata}") String zoneId) {
        return ZoneId.of(zoneId);
    }

    @Bean
    Clock applicationClock() {
        return Clock.systemUTC();
    }
}
