package ee.sheltermap.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * One row of the admin alerts — newest first.
 *
 * <p>{@code kind} is the closed vocabulary of {@code ThrottleAlert}:
 * {@code submission-daily-cap} and {@code otp-contact-cap} (both 429 —
 * the throttled caller), {@code near-duplicate} (the 409 repeat-report
 * rejection) and {@code code-send-failure} (a verification-code delivery
 * the channel refused — no HTTP error went out at all). {@code subject}
 * is the flagged account or contact ({@code user:<id>} /
 * {@code contact:<normalized>}); {@code detail} is the plain-spoken
 * event. {@code retryAfterSeconds} is present only for the 429 alerts
 * (the countdown the caller received); the other kinds carry none.
 *
 * <p>{@code id} is a monotonic sequence local to the ring — it resets on
 * a restart, so it keys this view's rows, it is not a durable id. The
 * ring is in-memory — it clears on a backend restart, so the surface is
 * a triage view, not a durable log.
 */
@Schema(description = "One row of the admin alerts (newest first). The ring is "
        + "in-memory — it clears on a backend restart, so this is a triage "
        + "view, not a durable log.")
public record AdminAlertDto(
        long id,
        @Schema(description = "The closed vocabulary of ThrottleAlert: "
                + "submission daily cap / OTP contact cap (both 429 — the "
                + "throttled caller) / near-duplicate (the 409 repeat-report "
                + "rejection) / code-send-failure (a code delivery the channel "
                + "refused — no HTTP error went out at all).")
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
