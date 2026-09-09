package ee.sheltermap.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tuning for cross-channel contact changes (email ↔ phone). Bound from
 * {@code app.contact-change.*}.
 *
 * @param cooldownSeconds minimum seconds between two change requests for the
 *                        same (user, type); the pending change row is the
 *                        cooldown anchor ({@code 0} disables the check)
 * @param codeTtlSeconds  code validity window in seconds
 * @param maxAttempts     max wrong codes before the pending change is rejected
 */
@ConfigurationProperties(prefix = "app.contact-change")
public record ContactChangeProperties(
        long cooldownSeconds,
        int codeTtlSeconds,
        int maxAttempts) {
}
