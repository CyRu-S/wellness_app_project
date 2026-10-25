package com.wellnessapp.service;

import com.wellnessapp.ai.GeminiFoodAnalysisClient;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiMealAnalysisServiceTests {
    @Test void imageAllocationsAreBoundedAndBusyUploadsAreRejectedBeforeReadingBytes() throws Exception {
        var gemini = mock(GeminiFoodAnalysisClient.class); var service = new AiMealAnalysisService(gemini);
        var entered = new java.util.concurrent.CountDownLatch(2);
        var release = new java.util.concurrent.CountDownLatch(1);
        when(gemini.analyse(any(), anyString(), anyString())).thenAnswer(call -> {
            entered.countDown();
            assertTrue(release.await(5, java.util.concurrent.TimeUnit.SECONDS));
            return null;
        });
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1};
        var image = new MockMultipartFile("image", "meal.jpg", "image/jpeg", jpeg);
        var third = spy(new MockMultipartFile("image", "meal.jpg", "image/jpeg", jpeg));
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> service.analyse(image, "meal"));
            var second = executor.submit(() -> service.analyse(image, "meal"));
            assertTrue(entered.await(5, java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.analyse(third, "meal")).getStatusCode().value());
            verify(third, never()).getBytes();
            release.countDown();
            first.get(5, java.util.concurrent.TimeUnit.SECONDS); second.get(5, java.util.concurrent.TimeUnit.SECONDS);
            service.analyse(third, "meal");
            verify(third).getBytes();
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    @Test void herbalifeNeverSendsAnImageToAi() {
        var gemini = mock(GeminiFoodAnalysisClient.class); var service = new AiMealAnalysisService(gemini);
        for (String category : new String[]{"product", "HERBALIFE", "Herbalife product"})
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.analyse(null, category)).getStatusCode().value());
        verifyNoInteractions(gemini);
    }
    @Test void regularMealImagesReachRecognitionWithTheirCategory() {
        var gemini = mock(GeminiFoodAnalysisClient.class); var service = new AiMealAnalysisService(gemini);
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1};
        var image = new MockMultipartFile("image", "meal.jpg", "image/jpeg", jpeg);
        service.analyse(image, "Lunch");
        verify(gemini).analyse(jpeg, "image/jpeg", "lunch");
    }
    @Test void outsideFoodImagesUseTheSameKeyBackedGeminiClient() {
        var gemini = mock(GeminiFoodAnalysisClient.class); var service = new AiMealAnalysisService(gemini);
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1};
        service.analyse(new MockMultipartFile("image", "outside.jpg", "image/jpeg", jpeg), "Outside food");
        verify(gemini).analyse(jpeg, "image/jpeg", "outside food");
    }
    @Test void emptyUnsupportedAndOversizedUploadsNeverReachAi() {
        var gemini = mock(GeminiFoodAnalysisClient.class); var service = new AiMealAnalysisService(gemini);
        for (var image : new MockMultipartFile[]{
            new MockMultipartFile("image", new byte[0]),
            new MockMultipartFile("image", "text.txt", "text/plain", new byte[]{1}),
            new MockMultipartFile("image", "fake.jpg", "image/jpeg", "not an image".getBytes()),
            new MockMultipartFile("image", "wrong.png", "image/png", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            new MockMultipartFile("image", "large.jpg", "image/jpeg", new byte[10 * 1024 * 1024 + 1])})
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.analyse(image, "meal")).getStatusCode().value());
        verifyNoInteractions(gemini);
    }
}
