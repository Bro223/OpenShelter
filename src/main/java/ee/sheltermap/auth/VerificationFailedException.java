package ee.sheltermap.auth;

/**
 * Verification rejected at the HTTP boundary: unavailable channel (Smart-ID
 * stub), invalid/expired code, or the request cannot be tied to a user.
 * Mapped to 400 by the global {@code ApiErrorHandler}.
 */
public class VerificationFailedException extends RuntimeException {

    public VerificationFailedException(String message) {
        super(message);
    }
}
