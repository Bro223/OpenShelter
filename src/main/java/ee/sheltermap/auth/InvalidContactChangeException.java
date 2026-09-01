package ee.sheltermap.auth;

/**
 * Rejected contact change: same value as current, no pending request, or
 * wrong/expired/exhausted code. Maps to 400 (uniform {@code ErrorResponse})
 * via the global exception handler.
 */
public class InvalidContactChangeException extends RuntimeException {

    public InvalidContactChangeException(String message) {
        super(message);
    }
}
