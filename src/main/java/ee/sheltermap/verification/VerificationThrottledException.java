package ee.sheltermap.verification;

/**
 * The caller hit the verification anti-spam throttle — cooldown not elapsed
 * or the per-user daily cap reached. Maps to HTTP 429 (uniform
 * {@code ErrorResponse}) via the global exception handler.
 *
 * <p>Deliberately in the {@code verification} package (not {@code auth}):
 * {@code verification} must not depend on {@code auth} (dependency rule), and
 * this is the seam {@code auth}'s controller layer already converts to 429.
 *
 * <p>The message is deliberately generic (which throttle fired is not
 * revealed); when the thrower can compute it, {@link #retryAfterSeconds()}
 * carries the exact seconds until a retry may succeed, and the handler adds
 * a {@code Retry-After} header so the client can count down.
 */
public class VerificationThrottledException extends RuntimeException {

    /** The default plain-language message, shared by all throw sites. */
    public static final String DEFAULT_MESSAGE = "Too many verification requests";

    private final Integer retryAfterSeconds;

    public VerificationThrottledException() {
        this(DEFAULT_MESSAGE, null);
    }

    public VerificationThrottledException(String message, Integer retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /**
     * Exact seconds until a retry may succeed, or {@code null} when the
     * thrower cannot compute one (the handler then omits {@code Retry-After}).
     */
    public Integer retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
