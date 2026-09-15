package ee.sheltermap.app;

/**
 * The per-user active-shelter cap is reached (shelter-trust-and-reports
 * D3): the caller already owns 10 shelters with {@code source = USER}
 * and {@code status = ACTIVE} (deletions and auto-hidden shelters free
 * the cap; ADMIN-kind users are exempt). Mapped to 409 by
 * {@code ee.sheltermap.api.ApiErrorHandler}.
 */
public class ShelterLimitExceededException extends RuntimeException {

    public static final String MESSAGE = "The limit of 10 active shelters has been reached";

    public ShelterLimitExceededException() {
        super(MESSAGE);
    }
}
