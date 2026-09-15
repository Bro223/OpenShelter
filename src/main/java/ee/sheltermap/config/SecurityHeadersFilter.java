package ee.sheltermap.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * The hardening response headers (abuse-limits), set on EVERY
 * response — success, 4xx, 5xx and the security 401/403 error bodies —
 * before any other filter writes:
 *
 * <ul>
 *   <li>{@code X-Content-Type-Options: nosniff} — the JSON API is never
 *       MIME-sniffed into something executable;</li>
 *   <li>{@code X-Frame-Options: DENY} — the API is never framed (the UI is
 *       the frontend host, a separate origin);</li>
 *   <li>{@code Referrer-Policy: no-referrer} — no URL (and no
 *       token-bearing query string) leaks to third parties;</li>
 *   <li>{@code Content-Security-Policy: default-src 'self'} — the SPA
 *       document is served by the frontend host, so this CSP is
 *       defense-in-depth on the API responses, not the UI's real policy;</li>
 *   <li>{@code Strict-Transport-Security: max-age=31536000; includeSubDomains}
 *       — HSTS is only meaningful on a secure origin, so it is sent ONLY
 *       when {@code request.isSecure()} (never over plain-HTTP dev traffic;
 *       the IT asserts its absence over http).</li>
 * </ul>
 *
 * <p>Registered in {@link SecurityConfig#securityFilterChain} BEFORE the
 * JWT filter, so the headers are present even on responses that fail
 * authentication (the entry point writes its 401 after this filter has run).
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    /** One year, with subdomains — the standard HSTS posture. */
    static final String HSTS_VALUE = "max-age=31536000; includeSubDomains";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Content-Security-Policy", "default-src 'self'");
        if (request.isSecure()) {
            response.setHeader("Strict-Transport-Security", HSTS_VALUE);
        }
        filterChain.doFilter(request, response);
    }
}
