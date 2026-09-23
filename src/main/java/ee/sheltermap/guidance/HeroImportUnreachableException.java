package ee.sheltermap.guidance;

/**
 * The hero image could not be FETCHED (guidance-hero-import): the host
 * did not resolve, the connect or the read timed out or stalled, the
 * connection failed, or the remote host answered a 5xx. Unlike
 * {@link HeroImportRefusedException} this is a TRANSIENT failure — the
 * URL may be fine and a retry may succeed.
 *
 * <p>Like every import failure it never blocks the save:
 * {@code GuidanceService.resolveHeroOnSave} catches it, stores the post
 * with this message as its {@code heroImportError} and keeps the URL,
 * so the next save retries the import (the hero falls back to the
 * library reference, or nothing).
 */
public class HeroImportUnreachableException extends RuntimeException {

    public HeroImportUnreachableException(String message) {
        super(message);
    }

    public HeroImportUnreachableException(String message, Throwable cause) {
        super(message, cause);
    }
}
