package ee.sheltermap.app;

/**
 * The caller hit the per-user report throttle (10 report-type actions per
 * rolling hour, any target/type — shelter-trust-and-reports D3). Mapped to
 * 429 by {@code ee.sheltermap.api.ApiErrorHandler} with the standard
 * throttle error body (same vocabulary as the verification and password-
 * reset throttles).
 */
public class ReportThrottledException extends RuntimeException {

    public ReportThrottledException() {
        super("Too many report requests");
    }
}
