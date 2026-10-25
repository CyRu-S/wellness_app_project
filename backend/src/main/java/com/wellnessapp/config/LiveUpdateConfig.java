package com.wellnessapp.config;

import com.wellnessapp.service.LiveUpdateService;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;

@Configuration @RequiredArgsConstructor
public class LiveUpdateConfig implements WebMvcConfigurer {
    private final LiveUpdateService updates;

    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public void postHandle(HttpServletRequest request, HttpServletResponse response,
                                             Object handler, ModelAndView view) {
                // Controller/service transactions have committed before postHandle.
                // Failed writes, reads, camera analysis and presence never invalidate views.
                if (response.getStatus() >= 200 && response.getStatus() < 300
                        && java.util.Set.of("POST", "PUT", "PATCH", "DELETE").contains(request.getMethod())) updates.changed();
            }
        }).addPathPatterns("/api/meal-posts/**", "/api/meals/**", "/api/plans/**", "/api/water", "/api/activities",
                "/api/profile/**", "/api/admin/plans/**", "/api/admin/users/**", "/api/admin/member-access/**",
                "/api/admin/attention/**", "/api/admin/hydration/**", "/api/shared-members/**")
                .excludePathPatterns("/api/meals/analyze");
    }
}
