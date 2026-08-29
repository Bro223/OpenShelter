package ee.sheltermap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Token-bucket capacities for the auth endpoints (Step 4). Bound from
 * {@code app.ratelimit.*} in application.yml. {@code refillPerSecond} is the
 * continuous refill rate (e.g. 5/min ≈ 0.084/s).
 */
@ConfigurationProperties(prefix = "app.ratelimit")
public record RateLimitProperties(
        int loginCapacity,
        double loginRefillPerSecond,
        int resetCapacity,
        double resetRefillPerSecond) {
}
