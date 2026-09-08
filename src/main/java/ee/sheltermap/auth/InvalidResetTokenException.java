package ee.sheltermap.auth;

/**
 * The presented password-reset code is unknown, used, expired or
 * attempt-exhausted — the message is deliberately generic: the failure
 * mode is never revealed (brute-force + enumeration guard).
 */
public class InvalidResetTokenException extends RuntimeException {

    public InvalidResetTokenException() {
        super("invalid or expired reset code");
    }
}
