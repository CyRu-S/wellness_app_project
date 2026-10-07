package com.wellnessapp.service;

import com.wellnessapp.ai.GeminiClient;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiMealAnalysisServiceTests {
    @Test void herbalifeNeverSendsAnImageToAi() {
        var gemini = mock(GeminiClient.class); var service = new AiMealAnalysisService(gemini);
        for (String category : new String[]{"product", "HERBALIFE", "Herbalife product"})
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.analyse(null, category)).getStatusCode().value());
        verifyNoInteractions(gemini);
    }
    @Test void regularMealImagesReachRecognitionWithTheirCategory() {
        var gemini = mock(GeminiClient.class); var service = new AiMealAnalysisService(gemini);
        var image = new MockMultipartFile("image", "meal.jpg", "image/jpeg", new byte[]{1, 2, 3});
        service.analyse(image, "Lunch");
        verify(gemini).analyse(new byte[]{1, 2, 3}, "image/jpeg", "lunch");
    }
    @Test void emptyUnsupportedAndOversizedUploadsNeverReachAi() {
        var gemini = mock(GeminiClient.class); var service = new AiMealAnalysisService(gemini);
        for (var image : new MockMultipartFile[]{
            new MockMultipartFile("image", new byte[0]),
            new MockMultipartFile("image", "text.txt", "text/plain", new byte[]{1}),
            new MockMultipartFile("image", "large.jpg", "image/jpeg", new byte[10 * 1024 * 1024 + 1])})
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.analyse(image, "meal")).getStatusCode().value());
        verifyNoInteractions(gemini);
    }
}
