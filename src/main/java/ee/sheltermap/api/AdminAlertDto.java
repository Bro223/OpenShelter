package ee.sheltermap.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * One row of the admin alerts (abuse-limits) — newest first.
 *
 * <p>{@code kind} is the closed vocabulary of {@code ThrottleAlert}
 * (submission daily cap / OTP contact cap / near-duplicate); {@code
 * subject} is the flagged account or contact ({@code user:<id>} /
 * {@code contact:<normalized>}); {@code retryAfterSeconds} is present only
 * for the 429 alerts. The ring is in-memory — it clears on a backend
 * restart, so the surface is a triage view, not a durable log.
 */
@Schema(description = "One row of the admin alerts (newest first). The ring is "
        + "in-memory — it clears on a backend restart, so this is a triage "
        + "view, not a durable log.")
public record AdminAlertDto(
        long id,
        @Schema(description = "The closed vocabulary of ThrottleAlert: "
                + "submission daily cap / OTP contact cap / near-duplicate.")
        String kind,
        @Schema(description = "The flagged account or contact "
                + "(user:<id> / contact:<normalized>).")
        String subject,
        String detail,
        @Schema(description = "Present only for the 429 alerts (the seconds "
                + "the caller must wait).")
        Integer retryAfterSeconds,
        Instant at) {
}
