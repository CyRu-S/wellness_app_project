package com.wellnessapp.service;

import com.wellnessapp.ai.GeminiFoodAnalysisClient;
import com.wellnessapp.dto.meal.MealAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class AiMealAnalysisService {
    private final GeminiFoodAnalysisClient gemini;

    public MealAnalysisResponse analyse(MultipartFile image, String category) {
        String normalized = category == null ? "meal" : category.strip().toLowerCase(Locale.ROOT);
        if (Set.of("product", "herbalife", "herbalife product").contains(normalized))
            throw new ResponseStatusException(BAD_REQUEST, "Herbalife products use photo check-ins with fixed calories for listed products; no AI analysis is needed");
        if (!Set.of("meal", "breakfast", "lunch", "dinner", "snack", "snacks", "outside food").contains(normalized))
            throw new ResponseStatusException(BAD_REQUEST, "Choose breakfast, lunch, dinner, snacks or outside food for food analysis");
        if (image == null || image.isEmpty()) throw new ResponseStatusException(BAD_REQUEST, "A meal image is required");
        if (image.getSize() > 10 * 1024 * 1024) throw new ResponseStatusException(BAD_REQUEST, "Image must be smaller than 10 MB");
        String contentType = image.getContentType();
        if (contentType == null || !Set.of("image/jpeg", "image/png", "image/webp").contains(contentType))
            throw new ResponseStatusException(BAD_REQUEST, "Upload a JPEG, PNG or WebP food photo");
        try {
            byte[] bytes = image.getBytes();
            if (!MediaStorageService.matchesSignature(bytes, contentType))
                throw new ResponseStatusException(BAD_REQUEST, "The uploaded file is not a valid image");
            return gemini.analyse(bytes, contentType, normalized);
        } catch (IOException exception) {
            throw new ResponseStatusException(BAD_REQUEST, "Unable to read the uploaded image", exception);
        }
    }
}
