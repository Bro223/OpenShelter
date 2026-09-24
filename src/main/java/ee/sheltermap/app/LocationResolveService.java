package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.Objects;
import java.util.function.LongSupplier;

/**
 * Resolves {@code maps.app.goo.gl} short links to coordinates
 * (shelter-location-input).
 *
 * <p>The resolver is deliberately narrow:
 * <ul>
 *   <li>entry pinned — only a default-port {@code http(s)://maps.app.goo.gl}
 *       URL is ever fetched (the only host the client sends; a non-default
 *       port fails the entry check as well). The entry is then NORMALIZED
 *       before the walk: {@code http} is
 *       upgraded to {@code https} — Google does exactly this on the first
 *       hop anyway, and without the upgrade a legitimate pasted
 *       {@code http://…} link would be rejected by the no-scheme-change hop
 *       rule below (a 502 for a valid link; the frontend passes user URLs
 *       raw) — and any pasted {@code user:pass@} userInfo is DROPPED so it
 *       can never be transmitted to Google as an {@code Authorization:
 *       Basic} header;</li>
 *   <li>≤3 redirect hops, followed manually — the {@link RedirectClient}
 *       never auto-follows, so the service reads each {@code Location}
 *       header and counts the hop itself. EVERY hop target is re-validated
 *       BEFORE it is fetched: an {@code https} scheme (the walk is pinned
 *       to the normalized entry's scheme — no mid-walk scheme change), the
 *       default port, and a Google host (exactly
 *       {@code maps.app.goo.gl} or a {@code google.com} host — the real
 *       chain runs {@code maps.app.goo.gl → maps.google.com →
 *       www.google.com}, so the re-check is a host set, not a single
 *       host). Protocol-relative targets, scheme changes and non-Google
 *       hosts are rejected and NEVER fetched;</li>
 *   <li>a ~10 s wall-clock budget for the whole walk (monotonic deadline,
 *       checked before every hop) — without it the per-hop timeouts alone
 *       allow 3 × (3 s + 5 s) ≈ 24 s of pinned request thread, and a
 *       slow-loris-style upstream can widen that further;</li>
 *   <li>coordinate extraction on the final URL reuses the frontend's
 *       pattern list ({@link MapsUrlCoordinates}) with the Estonia-bbox
 *       gate + auto-swap.</li>
 * </ul>
 *
 * <p>Outcomes: {@link Outcome.Resolved}, {@link Outcome.NotFound} (one
 * generic 400 for invalid input / non-whitelisted entry host / no
 * extractable pair / outside Estonia — no enumeration) and
 * {@link Outcome.UpstreamFailure} (one generic 502 for timeout / budget
 * expiry / network / upstream server failure / malformed or disallowed
 * {@code Location} — no enumeration, never a 500).
 */
@Service
public class LocationResolveService {

    /** The only host the client ever sends. */
    public static final String WHITELISTED_HOST = "maps.app.goo.gl";

    /** At most this many redirects are followed; the pair is read from
     *  whichever URL the chain stops at. */
    static final int MAX_REDIRECT_HOPS = 3;

    /**
     * Overall wall-clock budget for the whole redirect walk — a monotonic
     * deadline checked before every hop (see class javadoc).
     */
    static final Duration DEFAULT_BUDGET = Duration.ofSeconds(10);

    private final RedirectClient redirectClient;
    private final Duration budget;
    private final LongSupplier monotonicNanos;

    @Autowired
    public LocationResolveService(RedirectClient redirectClient) {
        this(redirectClient, DEFAULT_BUDGET, System::nanoTime);
    }

    /** Test seam — explicit walk budget and monotonic nanosecond clock. */
    LocationResolveService(RedirectClient redirectClient, Duration budget, LongSupplier monotonicNanos) {
        this.redirectClient = Objects.requireNonNull(redirectClient, "redirectClient");
        this.budget = Objects.requireNonNull(budget, "budget");
        this.monotonicNanos = Objects.requireNonNull(monotonicNanos, "monotonicNanos");
    }

    /**
     * Resolves a short link to a coordinate pair.
     *
     * @param url the raw request payload (entry-pinned to the whitelist,
     *            hop targets re-validated against the Google host set)
     * @return a sealed outcome — never null
     */
    public Outcome resolve(String url) {
        String entry = validEntry(url);
        if (entry == null) {
            return Outcome.NotFound.INSTANCE;
        }
        String finalUrl = followRedirects(entry);
        if (finalUrl == null) {
            return Outcome.UpstreamFailure.INSTANCE;
        }
        GeoPoint point = MapsUrlCoordinates.extract(finalUrl);
        if (point == null) {
            return Outcome.NotFound.INSTANCE;
        }
        return new Outcome.Resolved(point.lat(), point.lng());
    }

    /**
     * The normalized entry URL, or {@code null} when the entry is
     * rejected — an unparseable URL, a non-http(s) scheme, a
     * non-whitelisted host, or a non-default port (all map to the generic
     * 400; nothing is fetched).
     */
    private static String validEntry(String url) {
        URI start;
        try {
            start = URI.create(url);
        } catch (IllegalArgumentException e) {
            return null; // unparseable — generic 400
        }
        if (!isHttpScheme(start.getScheme())
                || !WHITELISTED_HOST.equalsIgnoreCase(start.getHost())
                || start.getPort() != -1) {
            return null; // entry violation — generic 400, nothing is fetched
        }
        return normalizeEntry(start);
    }

    /**
     * Follows the redirect chain from the normalized entry, re-validating
     * every hop target before it is fetched.
     *
     * @return the URL the chain stops at (the pair is read from it — the
     *         terminal response's URL, or the hop cap), or {@code null}
     *         when the walk fails — budget expiry, a fetch error, a 5xx
     *         terminal response, or a disallowed hop target (all map to
     *         the generic 502)
     */
    private String followRedirects(String entryUrl) {
        long deadlineNanos = monotonicNanos.getAsLong() + budget.toNanos();
        String current = entryUrl;
        for (int hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
            if (budgetExhausted(deadlineNanos)) {
                return null; // over budget — a stalled upstream, not bad input
            }
            RedirectClient.RedirectHop next = fetch(current);
            if (next == null) {
                return null; // timeout / network / unfetchable — no detail leaks out
            }
            if (!next.isRedirect()) {
                if (next.status() >= 500) {
                    return null; // the short-link service itself is failing — retry later
                }
                return current; // terminal response — the fetched URL is final
            }
            String target = validatedHopTarget(current, next.location());
            if (target == null) {
                return null; // the hop is disallowed — never fetched
            }
            current = target;
        }
        return current; // the hop cap is reached — the pair is read from this URL
    }

    /** The next hop, or {@code null} when the fetch itself fails (the
     *  generic 502 — no upstream detail leaks out). */
    private RedirectClient.RedirectHop fetch(String url) {
        try {
            return redirectClient.fetch(url);
        } catch (IOException | ClassCastException | IllegalArgumentException e) {
            return null;
        }
    }

    /** True when the walk's monotonic deadline has passed. */
    private boolean budgetExhausted(long deadlineNanos) {
        return monotonicNanos.getAsLong() >= deadlineNanos;
    }

    /**
     * The normalized entry URL for the walk:
     * <ul>
     *   <li>{@code http} is UPGRADED to {@code https} — Google upgrades the
     *       same hop itself, and the no-scheme-change rule on HOPS would
     *       reject that first hop for a pasted {@code http://…} entry, so
     *       the walk is pinned to https up front;</li>
     *   <li>userInfo is DROPPED — a pasted {@code https://user:pass@…} entry
     *       must not leak the pasted credentials to Google as an
     *       {@code Authorization: Basic} header.</li>
     * </ul>
     * The host is re-emitted canonical (lower-case whitelist host, default
     * port); the raw path/query/fragment are preserved as-is (no
     * re-encoding).
     */
    private static String normalizeEntry(URI entry) {
        StringBuilder normalized = new StringBuilder("https://").append(WHITELISTED_HOST);
        if (entry.getRawPath() != null) {
            normalized.append(entry.getRawPath());
        }
        if (entry.getRawQuery() != null) {
            normalized.append('?').append(entry.getRawQuery());
        }
        if (entry.getRawFragment() != null) {
            normalized.append('#').append(entry.getRawFragment());
        }
        return normalized.toString();
    }

    /**
     * Resolves a {@code Location} header against the URL that carried it
     * and re-validates the result against the hop policy: an
     * {@code https} scheme (the walk is pinned to the entry's scheme — no
     * mid-walk scheme change), the default port, and a Google host
     * ({@code maps.app.goo.gl} or a {@code google.com} host).
     *
     * @return the absolute target URL, or {@code null} when the Location
     *         is malformed or the target is not an allowed hop — a
     *         disallowed target is never fetched
     */
    private static String validatedHopTarget(String current, String location) {
        URI target;
        try {
            target = URI.create(current).resolve(location);
        } catch (IllegalArgumentException e) {
            return null; // malformed Location — treat as upstream failure
        }
        if (!"https".equalsIgnoreCase(target.getScheme())) {
            return null; // the walk is pinned to https — a scheme change is disallowed
        }
        if (target.getPort() != -1) {
            return null; // Google serves on the default port only
        }
        String host = target.getHost();
        if (host == null || !isGoogleHost(host)) {
            return null;
        }
        return target.toString();
    }

    /**
     * The hop host set: exactly {@code maps.app.goo.gl}, or any
     * {@code google.com} host (the apex domain or a subdomain such as
     * {@code maps.google.com} / {@code www.google.com}). Case-insensitive.
     */
    private static boolean isGoogleHost(String host) {
        String h = host.toLowerCase(Locale.ROOT);
        return WHITELISTED_HOST.equals(h)
                || "google.com".equals(h)
                || h.endsWith(".google.com");
    }

    private static boolean isHttpScheme(String scheme) {
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }

    /** The outcome of a resolve — the controller maps each variant to a status. */
    public sealed interface Outcome {

        /** The final URL carried an in-Estonia pair (auto-swapped when needed). */
        record Resolved(double latitude, double longitude) implements Outcome {
        }

        /** Invalid input, non-whitelisted entry host (incl. a non-default
         *  port), no extractable pair, or the pair is outside Estonia in
         *  both orders — one generic 400, no enumeration. */
        record NotFound() implements Outcome {
            public static final NotFound INSTANCE = new NotFound();
        }

        /** Connect/read timeout, walk-budget expiry, network failure, a 5xx
         *  from the short-link service, or a malformed/disallowed
         *  {@code Location} — one generic 502, no upstream detail. */
        record UpstreamFailure() implements Outcome {
            public static final UpstreamFailure INSTANCE = new UpstreamFailure();
        }
    }
}
