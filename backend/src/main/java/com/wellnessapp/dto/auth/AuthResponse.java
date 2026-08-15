package com.wellnessapp.dto.auth;
public record AuthResponse(String token, Long id, String name, String email, String role) {}

