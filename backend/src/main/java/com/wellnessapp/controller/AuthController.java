package com.wellnessapp.controller;
import com.wellnessapp.dto.auth.*;
import com.wellnessapp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor public class AuthController {
    private final AuthService auth;
    private final jakarta.validation.Validator validator;
    @PostMapping("/login") AuthResponse login(@Valid @RequestBody LoginRequest request) { return auth.login(request); }
    @PostMapping("/register") ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(request)); }
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<AuthResponse> registerWithPhoto(@RequestPart("profile") String metadata,
            @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {
        RegisterRequest request;
        try { request = new com.fasterxml.jackson.databind.ObjectMapper().readValue(metadata, RegisterRequest.class); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new com.wellnessapp.exception.BadRequestException("Invalid registration details"); }
        var violations = validator.validate(request);
        if (!violations.isEmpty()) throw new com.wellnessapp.exception.BadRequestException(violations.iterator().next().getMessage());
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(request, image));
    }
    @PostMapping("/google") AuthResponse google(@Valid @RequestBody GoogleLoginRequest request) { return auth.google(request); }
}
