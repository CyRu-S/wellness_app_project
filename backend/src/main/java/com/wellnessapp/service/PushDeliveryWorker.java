package com.wellnessapp.service;

import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class PushDeliveryWorker {
    private final PushDeliveryRepository deliveries;
    private final MealRepository meals;
    private final MissedEventRepository missed;
    private final UserRepository users;
    private final PushQueueService queue;
    private final ExpoPushClient expo;
    private final Clock clock;
    private final ZoneId applicationZoneId;

    private boolean valid(PushDelivery d) {
        var device = d.getDevice(); var event = d.getNotification();
        if (!device.isEnabled() || !device.getRegistrationId().equals(d.getRegistrationId()) ||
                !device.getUser().getId().equals(event.getUser().getId()) || event.getUser().getStatus() != User.Status.ACTIVE ||
                !queue.allowed(event.getUser().getId(), d.getKind())) return false;
        String key = event.getSourceKey();
        try {
            if (d.getKind() == PushDelivery.Kind.MEAL) {
                return key != null && key.startsWith("meal-") && meals.findById(Long.parseLong(key.split("-")[1]))
                        .map(m -> !m.isConsumed() && event.getScheduledAt().equals(m.getMealDate().atTime(m.getMealTime())
                                .atZone(applicationZoneId).toInstant().minusSeconds(1800))).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.NUDGE) {
                return key != null && key.startsWith("nudge-") && missed.findById(Long.parseLong(key.substring(6)))
                        .map(m -> !m.isResolved()).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.SIGNUP) {
                return key != null && key.startsWith("signup-") && users.findById(Long.parseLong(key.split("-")[1]))
                        .map(u -> u.getStatus() == User.Status.PENDING).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.DEADLINE) {
                return key != null && key.startsWith("deadline-") && missed.findById(Long.parseLong(key.split("-")[1]))
                        .map(m -> !m.isResolved()).orElse(false);
            }
        } catch (NumberFormatException ignored) { return false; }
        return true;
    }
    private Map<String, Object> message(PushDelivery d) {
        // Keep health information off the lock screen. Fetch details only after authenticated app open.
        return Map.of("to", d.getDevice().getExpoToken(), "title", "Mr_Care",
                "body", switch (d.getKind()) {
                    case MEAL -> "Your meal check-in is coming up. Open your timeline for details.";
                    case NUDGE -> "You have a reminder from your coach. Open Mr_Care to view it.";
                    case TEST -> "Phone notifications are connected.";
                    case SIGNUP -> "A new membership request is ready to review.";
                    case DEADLINE -> "A member may need support. Open Attention to review.";
                    case DIGEST -> "Your morning club summary is ready.";
                    case MEAL_POST, ACTIVITY -> "A member has a new check-in. Open your admin inbox.";
                    case PLAN, ACCESS, APPROVAL -> "Your account has an update from your coach. Open Mr_Care to review.";
                }, "sound", "default", "channelId", d.getKind() == PushDelivery.Kind.MEAL ? "meal-reminders" : "coach-nudges",
                "ttl", Math.max(1, Duration.between(clock.instant(), d.getExpiresAt()).getSeconds()),
                "data", Map.of("notificationId", d.getNotification().getId().toString(), "userId", d.getNotification().getUser().getId().toString(),
                        "kind", d.getKind().name()));
    }
    private void fail(PushDelivery d, String code, boolean retryable) {
        // Only persist known error codes, never raw provider bodies (which may contain tokens).
        d.setLastError(code);
        if (retryable && d.getAttempts() < 5 && clock.instant().isBefore(d.getExpiresAt())) {
            d.setStatus(PushDelivery.Status.QUEUED);
            d.setNextAttemptAt(clock.instant().plusSeconds(Math.min(900, 30L << Math.min(5, d.getAttempts()))));
        } else d.setStatus(PushDelivery.Status.FAILED);
    }
    private void result(PushDelivery d, JsonNode result, boolean receipt) {
        if ("ok".equals(result.path("status").asText())) {
            if (receipt) { d.setStatus(PushDelivery.Status.DELIVERED); d.setLastError(null); }
            else if (!result.path("id").asText().isBlank()) {
                d.setReceiptId(result.path("id").asText()); d.setStatus(PushDelivery.Status.RECEIPT);
                d.setNextAttemptAt(clock.instant().plusSeconds(900)); d.setLastError(null);
            } else fail(d, "InvalidTicket", false);
            return;
        }
        String code = result.path("details").path("error").asText();
        if ("DeviceNotRegistered".equals(code)) {
            // A late receipt must not disable a token that has since been registered by another session.
            if (d.getDevice().getRegistrationId().equals(d.getRegistrationId())) d.getDevice().setEnabled(false);
            fail(d, code, false);
        } else if ("MessageRateExceeded".equals(code)) fail(d, code, true);
        else if (Set.of("MessageTooBig", "MismatchSenderId", "InvalidCredentials").contains(code)) fail(d, code, false);
        else fail(d, "ProviderError", false);
    }
    /** Bounded batches and row locks prevent concurrent backend instances from sending the same queued row. */
    @Transactional public void sendPending() {
        var rows = deliveries.ready(PushDelivery.Status.QUEUED, clock.instant(), PageRequest.of(0, 25));
        var ready = new ArrayList<PushDelivery>();
        for (var d : rows) {
            if (!clock.instant().isBefore(d.getExpiresAt()) || !valid(d)) d.setStatus(PushDelivery.Status.CANCELLED);
            else { d.setAttempts(d.getAttempts() + 1); ready.add(d); }
        }
        if (ready.isEmpty()) return;
        try {
            var results = expo.send(ready.stream().map(this::message).toList());
            if (!results.isArray() || results.size() != ready.size()) throw new ExpoPushClient.ProviderException(false);
            for (int i = 0; i < ready.size(); i++) result(ready.get(i), results.get(i), false);
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            boolean retry = !(e instanceof ExpoPushClient.ProviderException p) || p.retryable;
            ready.forEach(d -> fail(d, retry ? "TransportError" : "ProviderRejected", retry));
        }
    }
    @Transactional public void checkReceipts() {
        var rows = deliveries.ready(PushDelivery.Status.RECEIPT, clock.instant(), PageRequest.of(0, 25));
        if (rows.isEmpty()) return;
        try {
            var results = expo.receipts(rows.stream().map(PushDelivery::getReceiptId).toList());
            for (var d : rows) {
                var receipt = results.path(d.getReceiptId());
                if (receipt.isMissingNode()) waitForReceipt(d); else result(d, receipt, true);
            }
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            rows.forEach(this::waitForReceipt);
        }
    }
    private void waitForReceipt(PushDelivery d) {
        if (clock.instant().isAfter(d.getExpiresAt().plusSeconds(86400))) {
            d.setStatus(PushDelivery.Status.FAILED); d.setLastError("ReceiptUnavailable");
        } else d.setNextAttemptAt(clock.instant().plusSeconds(900));
    }
}
