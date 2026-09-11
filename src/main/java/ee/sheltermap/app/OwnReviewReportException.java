package ee.sheltermap.app;

/**
 * A user attempted to report their own review (shelter-trust-and-reports
 * D2 — own content is edited or deleted, not reported). Mapped to 403 by
 * {@code ee.sheltermap.api.ApiErrorHandler}.
 */
public class OwnReviewReportException extends RuntimeException {

    public static final String MESSAGE = "You cannot report your own review";

    public OwnReviewReportException() {
        super(MESSAGE);
    }
}
