package ee.sheltermap.guidance;

/**
 * A crisis-guidance resource id or slug that does not resolve
 * (crisis-guidance D3/D4) — the 404 family, same plain-spoken vocabulary
 * as {@code ShelterNotFoundException}.
 *
 * <p>The public surface answers with this for BOTH a draft slug and an
 * unknown slug — the message is a fixed constant, so a draft's existence
 * is never revealed (the two cases are indistinguishable by design).
 * Media-asset 404s (an unknown id, a hero pointing at a deleted row, an
 * unknown serving name) ride on the same vehicle with their own fixed
 * message.
 */
public class GuidanceNotFoundException extends RuntimeException {
    public GuidanceNotFoundException(String message) {
        super(message);
    }
}
