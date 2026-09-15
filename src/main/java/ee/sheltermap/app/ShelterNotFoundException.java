package ee.sheltermap.app;

/**
 * Mapped to 404 by {@link ee.sheltermap.api.ApiErrorHandler}.
 *
 * <p>Thrown from the service layer (concurrent-DELETE race), so it lives in
 * {@code app}, like the other exceptions the service layer throws
 * (NotVerifiedException) — the no-package-cycle rule puts them here rather
 * than in the API layer.
 */
public class ShelterNotFoundException extends RuntimeException {
    public ShelterNotFoundException(long id) {
        super("Shelter not found: " + id);
    }
}
