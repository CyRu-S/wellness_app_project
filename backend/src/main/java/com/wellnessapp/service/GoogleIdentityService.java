package com.wellnessapp.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.wellnessapp.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.List;

@Service
public class GoogleIdentityService {
    public record GoogleIdentity(String subject, String email, String name) {}

    private final List<String> clientIds;
    private final GoogleIdTokenVerifier verifier;

    public GoogleIdentityService(@Value("${app.google.client-ids:}") String configuredClientIds) {
        this.clientIds = Arrays.stream(configuredClientIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
        try {
            this.verifier = clientIds.isEmpty() ? null : new GoogleIdTokenVerifier.Builder(
                        GoogleNetHttpTransport.newTrustedTransport(),
                        GsonFactory.getDefaultInstance())
                        .setAudience(clientIds)
                        .build();
        } catch (GeneralSecurityException | IOException exception) {
            throw new IllegalStateException("Could not initialise Google identity verification", exception);
        }
    }

    public GoogleIdentity verify(String rawIdToken) {
        if (clientIds.isEmpty()) {
            throw new BadRequestException("Google sign-in is not configured on the server");
        }
        try {
            var token = verifier.verify(rawIdToken);
            if (token == null || !Boolean.TRUE.equals(token.getPayload().getEmailVerified())) {
                throw new BadRequestException("Google identity token is invalid or the email is not verified");
            }
            var payload = token.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            if (email == null || email.isBlank()) throw new BadRequestException("Google account did not provide an email address");
            return new GoogleIdentity(payload.getSubject(), email.trim().toLowerCase(), name == null || name.isBlank() ? "Mr_Care member" : name.trim());
        } catch (GeneralSecurityException | IOException exception) {
            throw new BadRequestException("Google identity token could not be verified");
        }
    }
}
