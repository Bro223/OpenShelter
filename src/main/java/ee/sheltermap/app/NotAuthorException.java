package ee.sheltermap.app;

/**
 * Mapped to 403 by {@code api.ApiErrorHandler} (not the shelter's author).
 *
 * <p>Lives in {@code app}: the ownership rule itself now sits in
 * {@link ShelterService} (the layer that owns the shelter rows), and an
 * app-layer class must not depend on the api layer — so the exception the
 * rule throws travels with the rule. The api-layer callers (the error
 * handler, the test-endpoint controllers) import it from here.
 */
public class NotAuthorException extends RuntimeException {
    public NotAuthorException(String message) {
        super(message);
    }
}
