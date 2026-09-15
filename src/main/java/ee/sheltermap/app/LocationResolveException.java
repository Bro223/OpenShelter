package ee.sheltermap.app;

/**
 * Mapped to 400 by {@code ee.sheltermap.api.ApiErrorHandler} — the ONE
 * generic message for every resolve not-found case (invalid input,
 * non-whitelisted host, no extractable pair, outside Estonia). No
 * enumeration of failure reasons (shelter-location-input, decision 4).
 */
public class LocationResolveException extends RuntimeException {
    public LocationResolveException(String message) {
        super(message);
    }
}
