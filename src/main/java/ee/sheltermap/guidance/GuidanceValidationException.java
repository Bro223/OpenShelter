package ee.sheltermap.guidance;

/**
 * A rejected guidance/media write (crisis-guidance D4/D5/D8) — the 400
 * family, same plain-spoken vocabulary as {@code InvalidShelterException}
 * and {@code LocationResolveException} (one 400 vehicle per feature).
 *
 * <p>Covers the cross-field rules bean validation cannot express (alt
 * text mandatory iff a hero image is set), the admin-supplied slug shape
 * check and the delete-without-confirm refusal. The stored value is
 * rejected BEFORE anything is written — a 400 changes nothing.
 */
public class GuidanceValidationException extends RuntimeException {
    public GuidanceValidationException(String message) {
        super(message);
    }
}
