package ee.sheltermap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Token-bucket capacities for the auth endpoints (Step 4 + hardening +
 * 2026-09-08 review). Bound from {@code app.ratelimit.*} in application.yml.
 * {@code refillPerSecond} is the continuous refill rate (e.g. 5/min ≈
 * 0.084/s).
 *
 * <p>{@code app.ratelimit.trusted-proxies} / {@code app.ratelimit.trust-loopback}
 * live in the same yml block but are NOT part of this record (2026-09-10
 * review n15): the four rate-limiting controllers parse them via
 * {@code @Value} directly (see {@code ClientIps} for the keying rule), and
 * the bound components were never read.
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
        int geoResolveCapacity,
        double geoResolveRefillPerSecond,
        int resetConfirmCapacity,
        double resetConfirmRefillPerSecond,
        int loginIpCapacity,
        double loginIpRefillPerSecond) {
}
