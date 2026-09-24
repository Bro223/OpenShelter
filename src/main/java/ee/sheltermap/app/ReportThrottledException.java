package ee.sheltermap.app;

/**
 * The caller hit the per-user report throttle (10 report-type actions per
 * rolling hour, any target/type). Mapped to
 * 429 by {@code ee.sheltermap.api.ApiErrorHandler} with the standard
 * throttle error body (same vocabulary as the verification and password-
 * reset throttles). When the thrower can compute when the oldest in-window
 * action leaves the trailing hour, {@link #retryAfterSeconds()} carries the
 * exact countdown and the handler adds a {@code Retry-After} header.
 */
public class ReportThrottledException extends RuntimeException {

    private final Integer retryAfterSeconds;

    public ReportThrottledException() {
        this(null);
    }

    public ReportThrottledException(Integer retryAfterSeconds) {
        super("Too many report requests");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /** Exact seconds until a retry may succeed, or {@code null} (no countdown). */
    public Integer retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
