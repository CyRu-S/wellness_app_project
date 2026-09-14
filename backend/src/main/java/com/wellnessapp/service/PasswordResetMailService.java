package com.wellnessapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;

@Service
public class PasswordResetMailService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);
    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;
    private final String provider;
    private final String brevoApiKey;
    private final RestClient brevoClient;

    public PasswordResetMailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.from:}") String from,
            @Value("${app.mail.provider:smtp}") String provider,
            @Value("${app.mail.brevo-api-key:}") String brevoApiKey,
            RestClient.Builder restClientBuilder) {
        this.mailSender = mailSender.getIfAvailable();
        this.enabled = enabled;
        this.from = from == null ? "" : from.trim();
        this.provider = provider == null ? "" : provider.trim().toLowerCase(Locale.ROOT);
        this.brevoApiKey = brevoApiKey == null ? "" : brevoApiKey.trim();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.brevoClient = restClientBuilder
                .requestFactory(requestFactory)
                .baseUrl("https://api.brevo.com/v3")
                .build();
    }

    public void ensureConfigured() {
        if (!enabled || from.isBlank()
                || ("smtp".equals(provider) && mailSender == null)
                || ("brevo".equals(provider) && brevoApiKey.isBlank())
                || (!"smtp".equals(provider) && !"brevo".equals(provider))) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Account email is not configured yet");
        }
    }

    public void sendOtp(String recipient, String displayName, String otp, long expirationMinutes) {
        ensureConfigured();
        String subject = "Your Mr_Care password reset code";
        String body = "Hello " + displayName + ",\n\n"
                + "Your Mr_Care password reset code is: " + otp + "\n\n"
                + "It expires in " + expirationMinutes + " minutes. If you did not request this, "
                + "you can safely ignore this email. Never share this code with anyone.\n\nMr_Care";
        sendMessage(recipient, subject, body);
    }

    public void sendVerificationOtp(String recipient, String displayName, String otp, long expirationMinutes) {
        ensureConfigured();
        String subject = "Verify your Mr_Care email address";
        String body = "Hello " + displayName + ",\n\n"
                + "Your Mr_Care email verification code is: " + otp + "\n\n"
                + "It expires in " + expirationMinutes + " minutes. Enter it in the app to submit your account for admin approval. "
                + "If you did not create an account, you can ignore this email. Never share this code.\n\nMr_Care";
        sendMessage(recipient, subject, body);
    }

    private void sendMessage(String recipient, String subject, String body) {
        if ("brevo".equals(provider)) {
            sendWithBrevo(recipient, subject, body);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
            log.info("Account email accepted by the configured SMTP server");
        } catch (MailException exception) {
            log.error("Account email could not be delivered through the configured SMTP server", exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The account email could not be sent. Check the backend mail provider configuration.");
        }
    }

    private void sendWithBrevo(String recipient, String subject, String body) {
        try {
            brevoClient.post()
                    .uri("/smtp/email")
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "sender", Map.of("email", from, "name", "Mr_Care"),
                            "to", new Object[]{Map.of("email", recipient)},
                            "subject", subject,
                            "textContent", body))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Account email accepted by Brevo");
        } catch (RestClientException exception) {
            log.error("Account email was rejected by Brevo: {}", exception.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The account email could not be sent. Check the backend mail provider configuration.");
        }
    }
}
