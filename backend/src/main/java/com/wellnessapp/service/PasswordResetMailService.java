package com.wellnessapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordResetMailService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);
    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;

    public PasswordResetMailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.from:}") String from) {
        this.mailSender = mailSender.getIfAvailable();
        this.enabled = enabled;
        this.from = from == null ? "" : from.trim();
    }

    public void ensureConfigured() {
        if (!enabled || from.isBlank() || mailSender == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Password recovery email is not configured yet");
        }
    }

    public void sendOtp(String recipient, String displayName, String otp, long expirationMinutes) {
        ensureConfigured();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject("Your Mr_Care password reset code");
        message.setText("Hello " + displayName + ",\n\n"
                + "Your Mr_Care password reset code is: " + otp + "\n\n"
                + "It expires in " + expirationMinutes + " minutes. If you did not request this, "
                + "you can safely ignore this email. Never share this code with anyone.\n\nMr_Care");
        try {
            mailSender.send(message);
            log.info("Password reset email accepted by the configured SMTP server");
        } catch (MailException exception) {
            log.error("Password reset email could not be delivered through the configured SMTP server", exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The reset email could not be sent. Check the backend SMTP log and Gmail App Password.");
        }
    }
}
