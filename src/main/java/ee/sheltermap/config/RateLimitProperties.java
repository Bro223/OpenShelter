package ee.sheltermap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Token-bucket capacities for the auth endpoints (Step 4 + hardening).
 * Bound from {@code app.ratelimit.*} in application.yml. {@code refillPerSecond}
 * is the continuous refill rate (e.g. 5/min ≈ 0.084/s). {@code trustedProxies}
 * lists the reverse proxies whose {@code X-Forwarded-For} header is trusted —
 * used to key buckets by the real client IP behind nginx (hardening pass).
 */
@ConfigurationProperties(prefix = "app.ratelimit")
public record RateLimitProperties(
        int loginCapacity,
        double loginRefillPerSecond,
        int resetCapacity,
        double resetRefillPerSecond,
        int registerCapacity,
        double registerRefillPerSecond,
        int verifyCapacity,
        double verifyRefillPerSecond,
        int changeCapacity,
        double changeRefillPerSecond,
        List<String> trustedProxies) {

    public RateLimitProperties {
        if (trustedProxies == null) {
            trustedProxies = List.of();
        }
    }
}
