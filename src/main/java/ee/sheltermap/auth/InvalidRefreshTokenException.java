package ee.sheltermap.auth;

/** The presented refresh token is unknown, revoked or expired. */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("invalid refresh token");
    }
}
