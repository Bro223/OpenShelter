package ee.sheltermap.guidance;

/**
 * One request, no redirect following — the seam between
 * {@link HeroImageImportService} and real HTTP (guidance-hero-import).
 *
 * <p>Implementations send ONE GET to {@code url} with
 * redirects NOT auto-followed (the service reads each {@code Location}
 * header itself — the hop cap and the per-hop address re-validation are
 * only enforceable that way, the same discipline as the geo
 * resolver's {@code RedirectClient}), a connect timeout, a read-stall
 * bound, a polite User-Agent, and the size cap ENFORCED WHILE READING
 * (guard 4 — never buffer an unbounded body and check afterwards).
 */
public interface HeroImageFetchClient {

    /**
     * @param url      an absolute http(s) URL already validated by the
     *                 service's entry/hop policy
     * @param maxBytes the size cap ({@code app.media.max-bytes}) — the
     *                 client stops reading past it and raises
     *                 {@link MediaTooLargeException} (the 413 vocabulary
     *                 the upload path already uses), aborting the
     *                 connection
     * @return the observed status + {@code Location} (redirects carry no
     *         body) or the status + the body bytes (at most
     *         {@code maxBytes})
     * @throws HeroImportUnreachableException connect/read timeout, stall,
     *                                        DNS failure or any network
     *                                        problem — the service maps
     *                                        it to the 502 vocabulary
     * @throws MediaTooLargeException         the body exceeded the cap
     *                                        mid-read (413)
     */
    FetchedImage fetch(String url, long maxBytes);

    /**
     * One observed response: the status, the {@code Location} header
     * (null when absent) and — for non-redirect responses — the body
     * (capped at {@code maxBytes} by the caller's contract).
     */
    record FetchedImage(int status, String location, byte[] body) {

        /** True for a 3xx carrying a usable {@code Location} header. */
        public boolean isRedirect() {
            return status >= 300 && status <= 399 && location != null && !location.isBlank();
        }
    }
}
