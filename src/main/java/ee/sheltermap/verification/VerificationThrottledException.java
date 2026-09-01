package ee.sheltermap.verification;

/**
 * The caller hit the verification anti-spam throttle — cooldown not elapsed
 * or the per-user daily cap reached. Maps to HTTP 429 (uniform
 * {@code ErrorResponse}) via the global exception handler.
 *
 * <p>Deliberately in the {@code verification} package (not {@code auth}):
 * {@code verification} must not depend on {@code auth} (dependency rule), and
 * this is the seam {@code auth}'s controller layer already converts to 429.
 */
public class VerificationThrottledException extends RuntimeException {

    public VerificationThrottledException() {
        super("too many verification requests");
    }
}
