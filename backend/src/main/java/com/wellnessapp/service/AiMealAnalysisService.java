package com.wellnessapp.service;

import com.wellnessapp.ai.GeminiClient;
import com.wellnessapp.dto.meal.MealAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class AiMealAnalysisService {
    private final GeminiClient gemini;

    public MealAnalysisResponse analyse(MultipartFile image, String category) {
        if (image == null || image.isEmpty()) throw new ResponseStatusException(BAD_REQUEST, "A meal image is required");
        if (image.getSize() > 10 * 1024 * 1024) throw new ResponseStatusException(BAD_REQUEST, "Image must be smaller than 10 MB");
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) contentType = MediaType.IMAGE_JPEG_VALUE;
        try {
            return gemini.analyse(image.getBytes(), contentType, "product".equalsIgnoreCase(category) ? "nutrition product" : "meal");
        } catch (IOException exception) {
            throw new ResponseStatusException(BAD_REQUEST, "Unable to read the uploaded image", exception);
        }
    }
}
