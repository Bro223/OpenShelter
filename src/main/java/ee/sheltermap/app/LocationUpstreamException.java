package ee.sheltermap.app;

/**
 * Mapped to 502 by {@code ee.sheltermap.api.ApiErrorHandler} — the ONE
 * generic retry-later message for upstream failures (connect/read
 * timeout, network failure, 5xx from the short-link service). No
 * upstream detail leaks to the client.
 */
public class LocationUpstreamException extends RuntimeException {
    public LocationUpstreamException(String message) {
        super(message);
    }
}
