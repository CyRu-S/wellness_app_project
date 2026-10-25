package com.wellnessapp;

import com.wellnessapp.config.LiveUpdateConfig;
import com.wellnessapp.service.LiveUpdateService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.HandlerInterceptor;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LiveUpdateTests {
    @Test void committedSuccessfulWritesInvalidateButReadsFailuresAndAnalysisDoNot() throws Exception {
        var updates = mock(LiveUpdateService.class);
        var handlers = new ArrayList<HandlerInterceptor>();
        var registry = new InterceptorRegistry() {
            @Override public org.springframework.web.servlet.config.annotation.InterceptorRegistration addInterceptor(HandlerInterceptor handler) {
                handlers.add(handler); return super.addInterceptor(handler);
            }
        };
        new LiveUpdateConfig(updates).addInterceptors(registry);
        var handler = handlers.getFirst();
        var response = new MockHttpServletResponse();
        handler.postHandle(new MockHttpServletRequest("GET", "/api/meal-posts"), response, new Object(), null);
        verifyNoInteractions(updates);
        response.setStatus(422);
        handler.postHandle(new MockHttpServletRequest("POST", "/api/meal-posts"), response, new Object(), null);
        verifyNoInteractions(updates);
        response.setStatus(201);
        handler.postHandle(new MockHttpServletRequest("POST", "/api/meal-posts"), response, new Object(), null);
        verify(updates).changed();
    }

    @Test void streamsHaveBoundedPerAccountConnectionsAndReleaseThemOnShutdown() {
        try (var updates = new AutoClosingUpdates()) {
            for (int i = 0; i < 5; i++) updates.service.subscribe("member");
            assertThatThrownBy(() -> updates.service.subscribe("member"))
                    .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
            assertThatCode(() -> updates.service.subscribe("another-member")).doesNotThrowAnyException();
        }
    }

    private static class AutoClosingUpdates implements AutoCloseable {
        final LiveUpdateService service = new LiveUpdateService();
        public void close() { service.close(); }
    }
}
