package ee.sheltermap.auth;

/**
 * Generic login failure — deliberately one message for both "unknown user"
 * and "wrong password" so the API never reveals which (no user enumeration).
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("invalid credentials");
    }
}
