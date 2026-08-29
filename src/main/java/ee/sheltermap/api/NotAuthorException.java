package ee.sheltermap.api;

/** Mapped to 403 by {@link ApiErrorHandler} (not the review's author). */
public class NotAuthorException extends RuntimeException {
    public NotAuthorException(String message) {
        super(message);
    }
}
