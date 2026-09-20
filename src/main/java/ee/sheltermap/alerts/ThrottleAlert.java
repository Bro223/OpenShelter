package ee.sheltermap.alerts;

import java.time.Instant;

/**
 * One throttle/abuse alert row served by {@code GET /admin/alerts}
 * (abuse-limits), newest first.
 *
 * <p>{@code id} is a monotonic sequence (ring-local, resets on restart) —
 * the frontend row key. {@code kind} is a closed vocabulary (the constants
 * below); {@code subject} identifies the flagged account or contact
 * ({@code user:<id>} / {@code contact:<normalized>}) so the admin can act
 * on it; {@code detail} is the plain-spoken event. {@code retryAfterSeconds}
 * is non-null only for 429 alerts (the countdown the client received); the
 * near-duplicate 409 carries none.
 */
public record ThrottleAlert(long id, String kind, String subject, String detail,
                            Integer retryAfterSeconds, Instant at) {

    /** The per-user DAILY shelter-submission cap fired (429). */
    public static final String KIND_SUBMISSION_DAILY_CAP = "submission-daily-cap";

    /** The per-contact OTP cap fired on the verify or register surface (429). */
    public static final String KIND_OTP_CONTACT_CAP = "otp-contact-cap";

    /** A near-duplicate shelter submission was rejected (409). */
    public static final String KIND_NEAR_DUPLICATE = "near-duplicate";

    /** A verification-code delivery was refused by the channel (no HTTP
     *  error, no slot consumed — operator visibility for channel outages). */
    public static final String KIND_CODE_SEND_FAILURE = "code-send-failure";
}
