package com.wellnessapp.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component @RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtTokenProvider tokens;
    private final CustomUserDetailsService userDetailsService;
    private final com.wellnessapp.repository.UserRepository users;

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (tokens.isValid(token) && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                String username = tokens.username(token);
                UserDetails details = userDetailsService.loadUserByUsername(username);
                var user = users.findByEmailIgnoreCase(username).orElseThrow();
                long currentVersion = user.getTokenVersion() == null ? 0L : user.getTokenVersion();
                if (tokens.tokenVersion(token) == currentVersion && details.isEnabled() && details.isAccountNonLocked() && details.isAccountNonExpired()) {
                    var auth = new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
                } catch (org.springframework.security.core.userdetails.UsernameNotFoundException ignored) {
                    SecurityContextHolder.clearContext();
                }
            }
        }
        chain.doFilter(request, response);
    }
}

