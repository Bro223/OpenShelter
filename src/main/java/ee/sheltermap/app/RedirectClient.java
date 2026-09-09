package ee.sheltermap.app;

import java.io.IOException;

/**
 * One-hop redirect fetcher — the seam between
 * {@link LocationResolveService} and real HTTP (shelter-location-input).
 *
 * <p>Implementations send ONE request to {@code url} WITHOUT following
 * redirects and report the response status plus the {@code Location}
 * header. The service controls the hop count (≤3) itself, which is why
 * auto-follow must stay off — the hop cap is only enforceable when the
 * service reads every {@code Location} header.
 */
@FunctionalInterface
public interface RedirectClient {

    /**
     * @param url an absolute http(s) URL to fetch
     * @return the observed status and {@code Location} header (null when
     *         absent — the chain is terminal at {@code url})
     * @throws IOException connect/read timeout or any network failure —
     *                     the service maps it to the generic upstream
     *                     failure (502)
     */
    RedirectHop fetch(String url) throws IOException;

    /** One observed hop: the HTTP status plus the {@code Location} header. */
    record RedirectHop(int status, String location) {

        /** True for a 3xx carrying a usable {@code Location} header. */
        public boolean isRedirect() {
            return status >= 300 && status <= 399 && location != null && !location.isBlank();
        }
    }
}
