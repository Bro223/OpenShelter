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
 * (shelter-location-input, design decision 4).
 *
 * <p>The resolver is deliberately narrow:
 * <ul>
 *   <li>entry pinned — only a default-port {@code http(s)://maps.app.goo.gl}
 *       URL is ever fetched (the only host the client sends; a non-default
 *       port fails the entry check as well);</li>
 *   <li>≤3 redirect hops, followed manually — the {@link RedirectClient}
 *       never auto-follows, so the service reads each {@code Location}
 *       header and counts the hop itself. EVERY hop target is re-validated
 *       BEFORE it is fetched: an {@code http} or {@code https} scheme (and
 *       the same scheme as the URL it was resolved from — no mid-walk
 *       scheme change), the default port, and a Google host (exactly
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

    /** The only host the client ever sends (design decision 4). */
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
        URI start;
        try {
            start = URI.create(url);
        } catch (IllegalArgumentException e) {
            return Outcome.NotFound.INSTANCE;
        }
        if (!isHttpScheme(start.getScheme())
                || !WHITELISTED_HOST.equalsIgnoreCase(start.getHost())
                || start.getPort() != -1) {
            // entry violation — generic 400, nothing is fetched
            return Outcome.NotFound.INSTANCE;
        }

        String current = start.toString();
        String currentScheme = start.getScheme().toLowerCase(Locale.ROOT);
        long deadlineNanos = monotonicNanos.getAsLong() + budget.toNanos();

        for (int hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
            if (monotonicNanos.getAsLong() >= deadlineNanos) {
                // the walk is over budget — a stalled upstream, not bad input
                return Outcome.UpstreamFailure.INSTANCE;
            }
            RedirectClient.RedirectHop next;
            try {
                next = redirectClient.fetch(current);
            } catch (IOException | ClassCastException | IllegalArgumentException e) {
                // timeout / connection failure / unfetchable target — no
                // upstream detail leaks out
                return Outcome.UpstreamFailure.INSTANCE;
            }
            if (!next.isRedirect()) {
                if (next.status() >= 500) {
                    // the short-link service itself is failing — retry later
                    return Outcome.UpstreamFailure.INSTANCE;
                }
                break; // terminal response — the fetched URL is final
            }
            // Re-validate the hop target BEFORE fetching it: a malformed or
            // non-Google Location is an upstream failure, never a fetch.
            String target = validatedHopTarget(current, currentScheme, next.location());
            if (target == null) {
                return Outcome.UpstreamFailure.INSTANCE;
            }
            current = target;
        }

        GeoPoint point = MapsUrlCoordinates.extract(current);
        if (point == null) {
            return Outcome.NotFound.INSTANCE;
        }
        return new Outcome.Resolved(point.lat(), point.lng());
    }

    /**
     * Resolves a {@code Location} header against the URL that carried it and
     * re-validates the result against the Google hop policy.
     *
     * @return the absolute target URL, or {@code null} when the Location is
     *         malformed or the target is not an allowed Google hop
     *         (an {@code http} or {@code https} scheme equal to the base
     *         URL's scheme, default port, {@code maps.app.goo.gl} or a
     *         {@code google.com} host)
     */
    private static String validatedHopTarget(String current, String currentScheme, String location) {
        URI target;
        try {
            target = URI.create(current).resolve(location);
        } catch (IllegalArgumentException e) {
            return null; // malformed Location — treat as upstream failure
        }
        String scheme = target.getScheme();
        if (!isHttpScheme(scheme) || !scheme.toLowerCase(Locale.ROOT).equals(currentScheme)) {
            // non-http(s) scheme (file:, ftp:, …) or a mid-walk scheme change
            return null;
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
