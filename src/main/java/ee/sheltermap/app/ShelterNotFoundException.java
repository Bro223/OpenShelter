package ee.sheltermap.app;

/**
 * Mapped to 404 by {@link ee.sheltermap.api.ApiErrorHandler}.
 *
 * <p>Thrown from the service layer (concurrent-DELETE race, e7cf804), so it
 * lives in {@code app} — the 2026-09-08 arch pass moved exceptions across
 * layers the same way (NotVerifiedException) to keep the documented
 * no-package-cycle rule intact (context-and-tasks/agent/01-TASK.md §4).
 */
public class ShelterNotFoundException extends RuntimeException {
    public ShelterNotFoundException(long id) {
        super("Shelter not found: " + id);
    }
}
