package com.wellnessapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class WellnessAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(WellnessAppApplication.class, args);
    }
}

