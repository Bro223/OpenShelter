package ee.sheltermap.api;

/** Mapped to 404 by {@link ApiErrorHandler}. */
public class ShelterNotFoundException extends RuntimeException {
    public ShelterNotFoundException(long id) {
        super("shelter not found: " + id);
    }
}
