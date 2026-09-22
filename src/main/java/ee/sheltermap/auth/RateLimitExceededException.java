package ee.sheltermap.auth;

/**
 * The caller exceeded a token bucket for a throttled endpoint. When the
 * bucket can compute when a token will be available again, {@link
 * #retryAfterSeconds()} carries the exact countdown and the handler adds a
 * {@code Retry-After} header (same idiom as the verification and
 * password-reset throttles); when the bucket never refills it is
 * {@code null} and the header is omitted.
 */
public class RateLimitExceededException extends RuntimeException {

    private final Integer retryAfterSeconds;

    public RateLimitExceededException() {
        this(null);
    }

    public RateLimitExceededException(Integer retryAfterSeconds) {
        super("Too many requests");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /** Exact seconds until a retry may succeed, or {@code null} (no countdown). */
    public Integer retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
