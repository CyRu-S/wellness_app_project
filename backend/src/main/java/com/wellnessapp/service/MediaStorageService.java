package com.wellnessapp.service;

import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaStorageService {
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> SUPPORTED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final JdbcTemplate database;
    public MediaStorageService(JdbcTemplate database) { this.database = database; }

    public StoredMedia store(MultipartFile image) {
        if (image == null || image.isEmpty()) throw new BadRequestException("A meal photo is required");
        if (image.getSize() > MAX_IMAGE_BYTES) throw new BadRequestException("Meal photos must be 10 MB or smaller");

        String contentType = image.getContentType() == null ? "" : image.getContentType().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_TYPES.contains(contentType)) throw new BadRequestException("Use a JPEG, PNG, or WebP image");

        try {
            byte[] bytes = image.getBytes();
            if (!matchesSignature(bytes, contentType)) throw new BadRequestException("The uploaded file is not a valid image");
            String key = UUID.randomUUID() + extension(contentType);
            database.update("INSERT INTO media_objects (media_key, content) VALUES (?, ?)", key, bytes);
            return new StoredMedia(key, safeOriginalName(image.getOriginalFilename()), contentType, bytes.length);
        } catch (BadRequestException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to store meal photo", exception);
        }
    }

    public Resource load(String key) {
        validateKey(key);
        var rows = database.query("SELECT content FROM media_objects WHERE media_key = ?", (rs, row) -> rs.getBytes(1), key);
        if (rows.isEmpty()) throw new NotFoundException("Photo not found");
        return new ByteArrayResource(rows.getFirst());
    }

    public void deleteQuietly(String key) {
        if (key == null) return;
        try {
            validateKey(key);
            database.update("DELETE FROM media_objects WHERE media_key = ?", key);
        } catch (RuntimeException ignored) {
            // Best-effort cleanup after a failed database write.
        }
    }

    private void validateKey(String key) {
        if (key == null || !key.matches("[a-fA-F0-9-]{36}\\.(jpg|png|webp)")) {
            throw new NotFoundException("Meal photo not found");
        }
    }

    private boolean matchesSignature(byte[] bytes, String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> bytes.length >= 3 && unsigned(bytes[0]) == 0xFF && unsigned(bytes[1]) == 0xD8 && unsigned(bytes[2]) == 0xFF;
            case "image/png" -> bytes.length >= 8 && unsigned(bytes[0]) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                    && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A;
            case "image/webp" -> bytes.length >= 12 && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
            default -> false;
        };
    }

    private boolean ascii(byte[] bytes, int offset, String expected) {
        if (bytes.length < offset + expected.length()) return false;
        for (int i = 0; i < expected.length(); i++) if (bytes[offset + i] != (byte) expected.charAt(i)) return false;
        return true;
    }

    private int unsigned(byte value) { return value & 0xFF; }

    private String extension(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            default -> ".webp";
        };
    }

    private String safeOriginalName(String originalName) {
        if (originalName == null || originalName.isBlank()) return "meal-photo";
        String normalised = originalName.replace('\\', '/');
        String name = normalised.substring(normalised.lastIndexOf('/') + 1).replace("\r", "").replace("\n", "");
        return name.substring(0, Math.min(name.length(), 255));
    }

    public record StoredMedia(String key, String originalName, String contentType, long size) {}
}
