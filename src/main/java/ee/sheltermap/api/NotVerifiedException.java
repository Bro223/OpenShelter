package ee.sheltermap.api;

/** Mapped to 403 by {@link ApiErrorHandler} (account not verified). */
public class NotVerifiedException extends RuntimeException {
    public NotVerifiedException(String message) {
        super(message);
    }
}
