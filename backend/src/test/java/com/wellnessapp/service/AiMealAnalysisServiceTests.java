package com.wellnessapp.service;

import com.wellnessapp.ai.LocalFoodAnalysisClient;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiMealAnalysisServiceTests {
    @Test void herbalifeNeverSendsAnImageToAi() {
        var localModel = mock(LocalFoodAnalysisClient.class); var service = new AiMealAnalysisService(localModel);
        for (String category : new String[]{"product", "HERBALIFE", "Herbalife product"})
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.analyse(null, category)).getStatusCode().value());
        verifyNoInteractions(localModel);
    }
    @Test void regularMealImagesReachRecognitionWithTheirCategory() {
        var localModel = mock(LocalFoodAnalysisClient.class); var service = new AiMealAnalysisService(localModel);
        var image = new MockMultipartFile("image", "meal.jpg", "image/jpeg", new byte[]{1, 2, 3});
        service.analyse(image, "Lunch");
        verify(localModel).analyse(new byte[]{1, 2, 3}, "image/jpeg", "lunch");
    }
    @Test void emptyUnsupportedAndOversizedUploadsNeverReachAi() {
        var localModel = mock(LocalFoodAnalysisClient.class); var service = new AiMealAnalysisService(localModel);
        for (var image : new MockMultipartFile[]{
            new MockMultipartFile("image", new byte[0]),
            new MockMultipartFile("image", "text.txt", "text/plain", new byte[]{1}),
            new MockMultipartFile("image", "large.jpg", "image/jpeg", new byte[10 * 1024 * 1024 + 1])})
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.analyse(image, "meal")).getStatusCode().value());
        verifyNoInteractions(localModel);
    }
}
