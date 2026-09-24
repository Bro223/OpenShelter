package ee.sheltermap.verification;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Anti-spam throttle for verification-code sends.
 * Bound from {@code app.verification.*}.
 *
 * @param cooldownSeconds minimum seconds between two sends for the same
 *                        (user, level); {@code 0} disables the cooldown check
 * @param maxPerDay       max codes per (user, level) per UTC day;
 *                        {@code 0} disables the daily cap
 * @param sendLogPath     file path of the durable send log (survives
 *                        restarts); must never be committed
 */
@ConfigurationProperties(prefix = "app.verification")
public record VerificationProperties(
        long cooldownSeconds,
        int maxPerDay,
        String sendLogPath) {
}
