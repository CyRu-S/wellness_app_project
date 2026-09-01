package com.wellnessapp.controller;
import com.wellnessapp.dto.profile.ProfileResponse;
import com.wellnessapp.dto.profile.BodyMetricsRequest;
import com.wellnessapp.dto.profile.UpdateProfileRequest;
import com.wellnessapp.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
@RestController @RequestMapping("/api/profile") @RequiredArgsConstructor public class ProfileController {
    private final ProfileService profiles;
    @GetMapping ProfileResponse get(Authentication authentication) { return profiles.get(authentication.getName()); }
    @PatchMapping ProfileResponse update(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return profiles.update(authentication.getName(), request);
    }
    @PatchMapping("/body-metrics") ProfileResponse updateBodyMetrics(
            Authentication authentication,
            @Valid @RequestBody BodyMetricsRequest request) {
        return profiles.updateBodyMetrics(authentication.getName(), request);
    }
    @PutMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ProfileResponse updatePhoto(
            Authentication authentication,
            @RequestPart("image") MultipartFile image) {
        return profiles.updatePhoto(authentication.getName(), image);
    }
    @GetMapping("/photo")
    ResponseEntity<org.springframework.core.io.Resource> photo(Authentication authentication) {
        return photoResponse(profiles.ownPhoto(authentication.getName()));
    }

    private ResponseEntity<org.springframework.core.io.Resource> photoResponse(ProfileService.MediaDownload download) {
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
}

