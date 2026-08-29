package ee.sheltermap.auth;

/** The presented password-reset token is unknown, used or expired. */
public class InvalidResetTokenException extends RuntimeException {

    public InvalidResetTokenException() {
        super("invalid reset token");
    }
}
