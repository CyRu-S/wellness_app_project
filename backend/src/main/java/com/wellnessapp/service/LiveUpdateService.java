package com.wellnessapp.service;

import jakarta.annotation.PreDestroy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/** Small invalidation signals only; account data still uses authorized REST reads. */
@Service
public class LiveUpdateService {
    private record Client(String account, SseEmitter emitter) {}
    private final Map<UUID, Client> clients = new ConcurrentHashMap<>();
    private final AtomicLong revision = new AtomicLong(System.currentTimeMillis());
    private final AtomicBoolean pending = new AtomicBoolean();
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(task -> {
        var thread = new Thread(task, "live-updates"); thread.setDaemon(true); return thread;
    });

    public LiveUpdateService() {
        // Keep intermediaries from buffering and detect disconnected clients;
        // heartbeats never ask a client to fetch page data.
        executor.scheduleWithFixedDelay(() -> clients.forEach((id, client) -> send(id, client,
                SseEmitter.event().comment("keepalive"))), 20, 20, TimeUnit.SECONDS);
    }

    public synchronized SseEmitter subscribe(String account) {
        if (clients.size() >= 512 || clients.values().stream().filter(client -> client.account().equals(account)).count() >= 5)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many live connections");
        var id = UUID.randomUUID();
        var emitter = new SseEmitter(300_000L);
        var client = new Client(account, emitter);
        clients.put(id, client);
        emitter.onCompletion(() -> clients.remove(id));
        emitter.onTimeout(() -> { clients.remove(id); emitter.complete(); });
        emitter.onError(error -> clients.remove(id));
        send(id, client, SseEmitter.event().name("ready").data(Long.toString(revision.get())));
        return emitter;
    }

    public void changed() {
        revision.incrementAndGet();
        if (clients.isEmpty()) return;
        if (pending.compareAndSet(false, true)) executor.schedule(() -> {
            pending.set(false);
            var event = SseEmitter.event().name("changed").data(Long.toString(revision.get()));
            clients.forEach((id, client) -> send(id, client, event));
        }, 250, TimeUnit.MILLISECONDS);
    }

    public void changedAfterCommit() {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { changed(); }
                    });
        } else changed();
    }

    private void send(UUID id, Client client, SseEmitter.SseEventBuilder event) {
        try { client.emitter().send(event); }
        catch (Exception error) { clients.remove(id); client.emitter().complete(); }
    }

    @PreDestroy public void close() {
        executor.shutdownNow();
        clients.values().forEach(client -> client.emitter().complete());
        clients.clear();
    }
}
