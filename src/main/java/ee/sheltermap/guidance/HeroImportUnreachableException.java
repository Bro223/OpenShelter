package ee.sheltermap.guidance;

/**
 * The hero image could not be FETCHED (guidance-hero-import): the host
 * did not resolve, the connect or the read timed out or stalled, the
 * connection failed, or the remote host answered a 5xx. Unlike
 * {@link HeroImportRefusedException} this is a TRANSIENT failure — the
 * URL may be fine and a retry may succeed — so it is mapped to 502 (the
 * same retry-later vehicle as the geo resolver's
 * {@code LocationUpstreamException}), never to a 500.
 *
 * <p>As with every import failure it fails the publish that carries it:
 * the post stays a DRAFT with the URL intact.
 */
public class HeroImportUnreachableException extends RuntimeException {

    public HeroImportUnreachableException(String message) {
        super(message);
    }

    public HeroImportUnreachableException(String message, Throwable cause) {
        super(message, cause);
    }
}
