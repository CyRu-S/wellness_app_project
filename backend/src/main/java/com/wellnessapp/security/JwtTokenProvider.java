package com.wellnessapp.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtTokenProvider {
    private final SecretKey key;
    private final long expirationSeconds;

    public JwtTokenProvider(
            @Value("${app.jwt.secret:}") String secret,
            @Value("${app.jwt.expiration-seconds:86400}") long expirationSeconds) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET must be configured with a Base64-encoded secret");
        }
        try {
            this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        } catch (RuntimeException exception) {
            throw new IllegalStateException("JWT_SECRET must be valid Base64 and at least 256 bits", exception);
        }
        this.expirationSeconds = expirationSeconds;
    }

    public String generate(Authentication authentication) {
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_USER");
        return generate(authentication.getName(), role, 0L);
    }

    public String generate(String subject, String role) {
        return generate(subject, role, 0L);
    }

    public String generate(String subject, String role, long tokenVersion) {
        Instant now = Instant.now();
        return Jwts.builder().subject(subject).claim("role", role).claim("ver", tokenVersion)
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(key).compact();
    }

    public String username(String token) {
        return claims(token).getSubject();
    }

    public boolean isValid(String token) {
        try { claims(token); return true; } catch (JwtException | IllegalArgumentException ex) { return false; }
    }

    public long tokenVersion(String token) {
        Number version = claims(token).get("ver", Number.class);
        return version == null ? 0L : version.longValue();
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}

