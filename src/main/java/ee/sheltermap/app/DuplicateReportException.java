package ee.sheltermap.app;

/**
 * A repeat report the user already made — same (shelter, user, type) for
 * shelter reports, same (review, user) for review reports (shelter-trust-
 * and-reports D1/D2: the unique constraints are the per-target abuse
 * bound). Mapped to 409 by {@code ee.sheltermap.api.ApiErrorHandler}.
 */
public class DuplicateReportException extends RuntimeException {

    public static final String MESSAGE = "This report has already been submitted";

    public DuplicateReportException() {
        super(MESSAGE);
    }
}
