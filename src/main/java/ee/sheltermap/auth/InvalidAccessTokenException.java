package ee.sheltermap.auth;

/** The presented JWT access token is invalid or expired. */
public class InvalidAccessTokenException extends RuntimeException {

    public InvalidAccessTokenException(Throwable cause) {
        super("invalid access token", cause);
    }

    /** Human-readable detail; message text is safe to expose (no secrets). */
    public InvalidAccessTokenException(String message) {
        super(message);
    }
}
