package com.wellnessapp.controller;
import com.wellnessapp.dto.auth.*;
import com.wellnessapp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor public class AuthController {
    private final AuthService auth;
    private final com.wellnessapp.service.PasswordResetService passwordResets;
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
    @PostMapping("/forgot-password") MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) { return passwordResets.request(request); }
    @PostMapping("/reset-password") MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) { return passwordResets.reset(request); }
    @PostMapping("/google/register")
    ResponseEntity<AuthResponse> registerGoogle(@Valid @RequestBody GoogleRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registerGoogle(request));
    }
    @PostMapping(value = "/google/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<AuthResponse> registerGoogleWithPhoto(@RequestPart("profile") String metadata,
            @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {
        GoogleRegisterRequest request;
        try { request = new com.fasterxml.jackson.databind.ObjectMapper().readValue(metadata, GoogleRegisterRequest.class); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new com.wellnessapp.exception.BadRequestException("Invalid registration details"); }
        var violations = validator.validate(request);
        if (!violations.isEmpty()) throw new com.wellnessapp.exception.BadRequestException(violations.iterator().next().getMessage());
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registerGoogle(request, image));
    }
}
