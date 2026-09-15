package ee.sheltermap.app;

/** Mapped to 403 by {@code ee.sheltermap.api.ApiErrorHandler} (account not verified). */
public class NotVerifiedException extends RuntimeException {
    public NotVerifiedException(String message) {
        super(message);
    }
}
