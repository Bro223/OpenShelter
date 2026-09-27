package ee.sheltermap.auth;

import ee.sheltermap.app.CommaSeparated;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * The per-client (IP-keyed) throttle path, shared by the four throttled
 * controllers (auth, account, verification, geo resolver) — the one home
 * of the three pieces they used to carry themselves, four times over:
 *
 * <ul>
 *   <li>the {@code app.ratelimit.trusted-proxies} /
 *       {@code app.ratelimit.trust-loopback} pair, bound and parsed
 *       ONCE here;</li>
 *   <li>the real-client-IP key via {@link ClientIps} (X-Forwarded-For
 *       aware — the headers are honored only from a trusted peer);</li>
 *   <li>the 429 itself: {@link RateLimitExceededException} with the
 *       bucket's exact {@code Retry-After} countdown (the uniform 429
 *       body is the advice's job).</li>
 * </ul>
 *
 * <p>The callers keep their own policy — WHICH limiter, and for the
 * composite buckets WHICH key beyond the IP ({@code ip + "|" + contact}).
 * The bucket keys, the limits and the 429 shape are exactly what the
 * controllers used to compute in place.
 */
@Component
public class ClientThrottle {

    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public ClientThrottle(@Value("${app.ratelimit.trusted-proxies:}") String trustedProxies,
                          @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        this.trustedProxies = CommaSeparated.parseSet(trustedProxies);
        this.trustLoopback = trustLoopback;
    }

    /** The real client IP for this request — the rate-limit bucket key. */
    public String clientIp(HttpServletRequest request) {
        return ClientIps.resolve(request, trustedProxies, trustLoopback);
    }

    /**
     * Acquires one token from the per-client (IP) bucket of
     * {@code limiter}, or throws the 429 with the bucket's countdown.
     */
    public void requireRate(RateLimiter limiter, HttpServletRequest request) {
        requireRate(limiter, clientIp(request));
    }

    /**
     * Acquires one token for the composite {@code key} of
     * {@code limiter}, or throws the 429 with the bucket's countdown —
     * the per-(IP, contact) buckets pass the key they built from
     * {@link #clientIp}.
     */
    public void requireRate(RateLimiter limiter, String key) {
        RateLimiter.Result result = limiter.tryAcquire(key);
        if (!result.acquired()) {
            throw new RateLimitExceededException(result.retryAfterSeconds());
        }
    }
}
