package ee.sheltermap.app;

/**
 * A repeat report the user already made — same (shelter, user, type) for
 * shelter reports and occupancy reports (shelter-trust-
 * and-reports the unique constraints are the per-target abuse
 * bound). Mapped to 409 by {@code ee.sheltermap.api.ApiErrorHandler}.
 */
public class DuplicateReportException extends RuntimeException {

    public static final String MESSAGE = "This report has already been submitted";

    public DuplicateReportException() {
        super(MESSAGE);
    }
}
