package ee.sheltermap.config;

import ee.sheltermap.auth.ClientIps;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;

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
 *       — HSTS is only meaningful on a secure origin, so it is sent when the
 *       CLIENT's connection was secure: either the app itself saw HTTPS
 *       ({@code request.isSecure()}) or a TRUSTED reverse proxy terminated
 *       TLS and told us so via {@code X-Forwarded-Proto} (the documented
 *       deployment — the edge terminates TLS and forwards plain HTTP, where
 *       {@code isSecure()} alone would never be true and HSTS would never
 *       fire). Never sent over plain-HTTP dev traffic the app sees directly.
 * </ul>
 *
 * <p>Registered in {@link SecurityConfig#securityFilterChain} BEFORE the
 * JWT filter, so the headers are present even on responses that fail
 * authentication (the entry point writes its 401 after this filter has run).
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    /** One year, with subdomains — the standard HSTS posture. */
    static final String HSTS_VALUE = "max-age=31536000; includeSubDomains";

    /** The proxy-set header naming the client's original scheme. */
    private static final String FORWARDED_PROTO = "X-Forwarded-Proto";

    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public SecurityHeadersFilter(Set<String> trustedProxies, boolean trustLoopback) {
        this.trustedProxies = trustedProxies;
        this.trustLoopback = trustLoopback;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Content-Security-Policy", "default-src 'self'");
        if (clientConnectionWasSecure(request)) {
            response.setHeader("Strict-Transport-Security", HSTS_VALUE);
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Whether the CLIENT's connection to the edge was HTTPS: directly
     * ({@code isSecure()}) or via a trusted proxy's {@code X-Forwarded-Proto}.
     *
     * <p>The header is honored ONLY when the direct peer is a trusted proxy
     * (the same {@link ClientIps#peerIsTrusted} gate the rate-limit keying
     * uses) — an untrusted client can set {@code X-Forwarded-Proto} freely.
     * (A browser would ignore an HSTS header delivered over plain HTTP
     * anyway — RFC 6797 §7.2 — but the trust gate keeps the decision honest
     * and consistent, and mirrors how {@code X-Forwarded-For} is handled.)
     * Explicitly NOT {@code server.forward-headers-strategy=framework}:
     * that rewrites {@code isSecure()} process-wide and would defeat
     * {@link ClientIps}'s per-call trust decision.
     */
    private boolean clientConnectionWasSecure(HttpServletRequest request) {
        if (request.isSecure()) {
            return true;
        }
        if (!ClientIps.peerIsTrusted(request, trustedProxies, trustLoopback)) {
            return false;
        }
        // The header is a comma-separated list, one entry per hop; the
        // LEFTMOST is the client's original scheme (the first hop's client).
        String forwarded = request.getHeader(FORWARDED_PROTO);
        if (forwarded == null || forwarded.isBlank()) {
            return false;
        }
        // The leftmost NON-EMPTY entry decides (PMD: a branching statement
        // as the loop's last statement is error-prone, so the "first
        // non-empty" shape is expressed as a stream instead of a loop).
        return Arrays.stream(forwarded.split(","))
                .map(String::trim)
                .filter(entry -> !entry.isEmpty())
                .findFirst()
                .map(entry -> "https".equalsIgnoreCase(entry))
                .orElse(false);
    }
}
