package ee.sheltermap.app;

/**
 * The per-user active-shelter cap is reached (shelter-trust-and-reports
 * D3): the caller already owns {@link ShelterService#MAX_ACTIVE_SHELTERS_PER_USER}
 * shelters with {@code source = USER} and {@code status = ACTIVE}
 * (deletions and auto-hidden shelters free the cap; ADMIN-kind users are
 * exempt). Mapped to 409 by
 * {@code ee.sheltermap.api.ApiErrorHandler}.
 */
public class ShelterLimitExceededException extends RuntimeException {

    /**
     * Built from the cap constant itself (W4-A — the literal "10" was
     * hardcoded alongside the literal, so a cap change would have
     * shipped a stale message): the output is byte-identical.
     */
    public static final String MESSAGE =
            "The limit of " + ShelterService.MAX_ACTIVE_SHELTERS_PER_USER + " active shelters has been reached";

    public ShelterLimitExceededException() {
        super(MESSAGE);
    }
}
