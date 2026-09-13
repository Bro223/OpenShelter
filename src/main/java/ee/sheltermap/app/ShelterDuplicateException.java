package ee.sheltermap.app;

/**
 * Near-duplicate shelter submission (abuse-limits M3 slice 3): an
 * {@code ACTIVE} USER row with the same normalized name within
 * {@code app.limits.duplicate-coord-meters} haversine already exists.
 * Maps to HTTP 409 via the global exception handler — the plain-spoken
 * message carries the existing row id so the client can point at (or
 * edit) the row it collided with, keeping the uniform
 * {@code ErrorResponse} shape.
 *
 * <p>Cross-user by design: the abuse vector is a throwaway account
 * re-reporting a known place, and the author re-POSTing their own row
 * gets the same 409 (editing goes through {@code PUT /api/shelters/{id}}).
 * ADMIN-kind accounts are exempt, like the active-shelter and daily caps.
 */
public class ShelterDuplicateException extends RuntimeException {

    private final long existingShelterId;

    public ShelterDuplicateException(long existingShelterId) {
        super("A shelter with this name already exists at this location (shelter #"
                + existingShelterId + ")");
        this.existingShelterId = existingShelterId;
    }

    /** The existing row the candidate collides with (the 409 pointer). */
    public long getExistingShelterId() {
        return existingShelterId;
    }
}
