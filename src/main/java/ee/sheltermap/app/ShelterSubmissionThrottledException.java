package ee.sheltermap.app;

/**
 * The caller hit the per-user DAILY shelter-submission cap (abuse-limits)
 * — {@code app.limits.daily-submissions-per-user} submissions within
 * the rolling 24 h window. Maps to HTTP 429 (uniform {@code ErrorResponse})
 * via the global exception handler.
 *
 * <p>Distinct from {@link ShelterLimitExceededException} (the 409
 * active-shelter cap, shelter-trust-and-reports D3): this one is a rate
 * limit on the SUBMITTING act, not a conflict on the row count. When the
 * thrower can compute when the window slides, {@link #retryAfterSeconds()}
 * carries the exact seconds until a retry may succeed and the handler adds
 * a {@code Retry-After} header (same idiom as the auth throttles).
 */
public class ShelterSubmissionThrottledException extends RuntimeException {

    /** The plain-language message, shared by all throw sites. */
    public static final String DEFAULT_MESSAGE =
            "Daily shelter-submission limit reached — please try again later";

    private final Integer retryAfterSeconds;

    public ShelterSubmissionThrottledException() {
        this(null);
    }

    public ShelterSubmissionThrottledException(Integer retryAfterSeconds) {
        super(DEFAULT_MESSAGE);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /**
     * Exact seconds until a retry may succeed (the oldest in-window
     * submission leaves the 24 h window), or {@code null} when the thrower
     * cannot compute one (the handler then omits {@code Retry-After}).
     */
    public Integer retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
