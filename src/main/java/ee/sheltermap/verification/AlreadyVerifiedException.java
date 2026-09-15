package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

/**
 * A verification was requested for a level the user already holds (conflict).
 * Maps to 409 via {@code ApiErrorHandler}. Raised by
 * {@link VerificationService#requestVerification} before any code is sent or
 * any throttle budget is consumed.
 */
public class AlreadyVerifiedException extends RuntimeException {

    private final VerificationLevel level;

    public AlreadyVerifiedException(VerificationLevel level) {
        super("Already verified: " + level);
        this.level = level;
    }

    public VerificationLevel getLevel() {
        return level;
    }
}
