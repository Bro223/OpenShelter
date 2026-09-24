package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /api/geo/resolve} body (shelter-location-input).
 *
 * <p>{@code url} is expected to be a {@code maps.app.goo.gl} short link —
 * the only host the client ever sends. The
 * http(s)-scheme and host-whitelist checks happen in
 * {@code app.LocationResolveService}; anything else is one generic 400
 * (no enumeration of failure reasons).
 */
public record LocationResolveRequest(
        @NotBlank @Size(max = 2048) String url) {
}
