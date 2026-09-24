package ee.sheltermap.app;

/**
 * An admin moderation write hit a registry row (admin-moderation) —
 * mapped to 409. The registry import owns those rows' lifecycle and
 * rebuilds them as ACTIVE on every run, so an admin edit would silently
 * revert; the lever for bad registry data is upstream (Päästeamet), not
 * in-app.
 */
public class ImportOwnedShelterException extends RuntimeException {
    public ImportOwnedShelterException(String message) {
        super(message);
    }
}
