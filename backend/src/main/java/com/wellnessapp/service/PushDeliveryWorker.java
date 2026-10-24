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
    private final PlanItemCompletionRepository completions;
    private final PlanItemRepository planItems;
    private final UserRepository users;
    private final PushQueueService queue;
    private final ExpoPushClient expo;
    private final WebPushClient web;
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
                        .map(m -> {
                            Instant due = m.getMealDate().atTime(m.getMealTime()).atZone(applicationZoneId).toInstant();
                            return !m.isConsumed() && clock.instant().isBefore(due)
                                    && event.getScheduledAt().equals(due.minusSeconds(300));
                        }).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.HABIT) {
                if (key == null || !key.startsWith("habit-reminder-")) return false;
                String[] parts = key.substring("habit-reminder-".length()).split("-");
                Long itemId = Long.parseLong(parts[0]);
                LocalDate date = LocalDate.parse(String.join("-", Arrays.copyOfRange(parts, 1, 4)));
                return planItems.findById(itemId).map(item -> {
                    Instant due = date.atTime(item.getScheduledTime()).atZone(applicationZoneId).toInstant();
                    return clock.instant().isBefore(due)
                            && event.getScheduledAt().equals(due.minusSeconds(300))
                            && !completions.existsByPlanItemIdAndUserIdAndCompletedDate(itemId, event.getUser().getId(), date);
                }).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.NUDGE) {
                if (key != null && (key.startsWith("hydration-club-") || key.startsWith("care-nudge-") || key.startsWith("coach-nudge-"))) return true;
                return key != null && key.startsWith("nudge-") && missed.findById(Long.parseLong(key.substring(6).split("-")[0]))
                        .map(m -> !m.isResolved()).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.SIGNUP) {
                return key != null && key.startsWith("signup-") && users.findById(Long.parseLong(key.split("-")[1]))
                        .map(u -> u.getStatus() == User.Status.PENDING).orElse(false);
            }
            if (d.getKind() == PushDelivery.Kind.DEADLINE) {
                if (key == null) return false;
                String prefix = key.startsWith("member-deadline-") ? "member-deadline-" : "deadline-";
                if (!key.startsWith(prefix)) return false;
                return missed.findById(Long.parseLong(key.substring(prefix.length()).split("-")[0]))
                        .map(m -> !m.isResolved() && (prefix.equals("deadline-") || m.getUser().getId().equals(event.getUser().getId()))).orElse(false);
            }
        } catch (NumberFormatException ignored) { return false; }
        return true;
    }
    private Map<String, Object> message(PushDelivery d) {
        var event = d.getNotification();
        boolean customSound = queue.customSound(event.getUser().getId());
        String channel = Set.of(PushDelivery.Kind.MEAL, PushDelivery.Kind.HABIT).contains(d.getKind())
                ? "meal-reminders" : "coach-nudges";
        boolean personalisedReminder = Set.of(PushDelivery.Kind.MEAL, PushDelivery.Kind.HABIT, PushDelivery.Kind.NUDGE).contains(d.getKind());
        boolean adminOperationalAlert = event.getUser().getRole() == User.Role.ADMIN
                && Set.of(PushDelivery.Kind.SIGNUP, PushDelivery.Kind.DEADLINE, PushDelivery.Kind.DIGEST,
                        PushDelivery.Kind.MEAL_POST, PushDelivery.Kind.ACTIVITY).contains(d.getKind());
        String title = personalisedReminder || adminOperationalAlert ? event.getTitle() : "Mr_Care";
        String body = personalisedReminder || adminOperationalAlert ? event.getBody() : switch (d.getKind()) {
            case TEST -> "Phone notifications are connected.";
            case SIGNUP -> "A new membership request is ready to review.";
            case DEADLINE -> "Your scheduled check-in is overdue. Open your timeline to review.";
            case DIGEST -> "Your morning club summary is ready.";
            case MEAL_POST, ACTIVITY -> "A member has a new check-in. Open your admin inbox.";
            case PLAN, ACCESS, APPROVAL -> "Your account has an update from your coach. Open Mr_Care to review.";
            default -> "You have a reminder. Open Mr_Care to review it.";
        };
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("to", d.getDevice().getExpoToken()); message.put("title", title); message.put("body", body);
        message.put("sound", customSound ? "main_theme_alert.wav" : "default");
        message.put("priority", "high"); message.put("badge", 1);
        // Expo is an at-least-once transport. A stable event key makes Android
        // replace an already displayed duplicate and makes Android/iOS coalesce
        // a repeated provider delivery while keeping different reminders intact.
        String dedupeKey = "mr-care-" + event.getId();
        message.put("collapseId", dedupeKey);
        message.put("tag", dedupeKey);
        message.put("channelId", customSound ? channel + "-theme-v2" : channel + "-default-v1");
        message.put("ttl", Math.max(1, Duration.between(clock.instant(), d.getExpiresAt()).getSeconds()));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("notificationId", d.getNotification().getId().toString());
        data.put("userId", d.getNotification().getUser().getId().toString());
        data.put("kind", d.getKind().name());
        data.put("customSound", customSound);
        notificationTarget(d).ifPresent(target -> data.put("targetId", target));
        message.put("data", data);
        return message;
    }

    private Optional<String> notificationTarget(PushDelivery delivery) {
        String key = delivery.getNotification().getSourceKey();
        if (key == null) return Optional.empty();
        try {
            if (delivery.getKind() == PushDelivery.Kind.MEAL && key.startsWith("meal-")) {
                return Optional.of(key.substring(5).split("-")[0]);
            }
            if (delivery.getKind() == PushDelivery.Kind.HABIT && key.startsWith("habit-reminder-")) {
                return Optional.of(key.substring("habit-reminder-".length()).split("-")[0]);
            }
        } catch (RuntimeException ignored) { }
        return Optional.empty();
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
        // Only explicitly registered WEB devices use the optional browser transport.
        for (var delivery : ready.stream().filter(d -> d.getDevice().getProvider() == PushDevice.Provider.WEB).toList()) {
            if (!web.available()) { fail(delivery, "WebPushUnavailable", false); continue; }
            try {
                var original = message(delivery);
                var data = new LinkedHashMap<>((Map<String, Object>) original.get("data"));
                data.put("registrationId", delivery.getRegistrationId());
                int status = web.send(delivery.getDevice(), Map.of("title", original.get("title"),
                        "body", original.get("body"), "data", data),
                        (int) Math.max(1, Duration.between(clock.instant(), delivery.getExpiresAt()).getSeconds()));
                if (status >= 200 && status < 300) { delivery.setStatus(PushDelivery.Status.DELIVERED); delivery.setLastError(null); }
                else if (status == 404 || status == 410) {
                    if (delivery.getDevice().getRegistrationId().equals(delivery.getRegistrationId())) delivery.getDevice().setEnabled(false);
                    fail(delivery, "DeviceNotRegistered", false);
                } else fail(delivery, "WebProviderRejected", status == 429 || status >= 500);
            } catch (Exception error) {
                if (error instanceof InterruptedException) Thread.currentThread().interrupt();
                fail(delivery, "WebTransportError", true);
            }
        }
        ready.removeIf(d -> d.getDevice().getProvider() == PushDevice.Provider.WEB);
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
