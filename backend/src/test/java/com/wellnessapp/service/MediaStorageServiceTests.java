package com.wellnessapp.service;

import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.NotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MediaStorageServiceTests {
    @TempDir Path directory;

    @Test
    void rejectsSpoofedImagesAndTraversalKeys() {
        MediaStorageService storage = new MediaStorageService(directory.toString());
        storage.initialise();

        MockMultipartFile fake = new MockMultipartFile("image", "fake.jpg", "image/jpeg", "not-an-image".getBytes());
        assertThatThrownBy(() -> storage.store(fake)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> storage.load("../secret.jpg")).isInstanceOf(NotFoundException.class);
    }
}
