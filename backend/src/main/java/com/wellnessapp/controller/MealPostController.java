package com.wellnessapp.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.dto.mealpost.CreateMealPostRequest;
import com.wellnessapp.dto.mealpost.MealPostResponse;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.service.MealPostService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/meal-posts")
@RequiredArgsConstructor
public class MealPostController {
    private final MealPostService mealPosts;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    MealPostResponse create(
            Authentication authentication,
            @RequestPart("metadata") String metadata,
            @RequestPart("image") MultipartFile image) {
        return mealPosts.create(authentication.getName(), metadata(metadata), image);
    }

    @GetMapping("/{postId}/image")
    ResponseEntity<org.springframework.core.io.Resource> image(
            Authentication authentication, @PathVariable Long postId) {
        MealPostService.MediaDownload download = mealPosts.image(authentication.getName(), postId);
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(download.originalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .contentLength(download.size())
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(download.resource());
    }

    private CreateMealPostRequest metadata(String value) {
        try {
            CreateMealPostRequest request = objectMapper.readValue(value, CreateMealPostRequest.class);
            var violations = validator.validate(request);
            if (!violations.isEmpty()) {
                String message = violations.stream().findFirst().map(ConstraintViolation::getMessage).orElse("Invalid meal metadata");
                throw new BadRequestException("Invalid meal metadata: " + message);
            }
            return request;
        } catch (JsonProcessingException exception) {
            throw new BadRequestException("Meal metadata must be valid JSON");
        }
    }
}
