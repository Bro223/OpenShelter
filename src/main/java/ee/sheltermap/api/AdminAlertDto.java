package ee.sheltermap.api;

import java.time.Instant;

/**
 * One row of the admin alerts (abuse-limits M3 slice 4) — newest first.
 *
 * <p>{@code kind} is the closed vocabulary of {@code ThrottleAlert}
 * (submission daily cap / OTP contact cap / near-duplicate); {@code
 * subject} is the flagged account or contact ({@code user:<id>} /
 * {@code contact:<normalized>}); {@code retryAfterSeconds} is present only
 * for the 429 alerts. The ring is in-memory (W16) — it clears on a backend
 * restart, so the surface is a triage view, not a durable log.
 */
public record AdminAlertDto(
        long id,
        String kind,
        String subject,
        String detail,
        Integer retryAfterSeconds,
        Instant at) {
}
