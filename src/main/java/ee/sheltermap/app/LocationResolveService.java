package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.util.Objects;

/**
 * Resolves {@code maps.app.goo.gl} short links to coordinates
 * (shelter-location-input, design decision 4).
 *
 * <p>The resolver is deliberately narrow:
 * <ul>
 *   <li>host whitelist — only {@code maps.app.goo.gl} is ever fetched
 *       (the only host the client sends);</li>
 *   <li>≤3 redirect hops, followed manually — the {@link RedirectClient}
 *       never auto-follows, so the service reads each {@code Location}
 *       header and counts the hop itself;</li>
 *   <li>coordinate extraction on the final URL reuses the frontend's
 *       pattern list ({@link MapsUrlCoordinates}) with the Estonia-bbox
 *       gate + auto-swap.</li>
 * </ul>
 *
 * <p>Outcomes: {@link Outcome.Resolved}, {@link Outcome.NotFound} (one
 * generic 400 for invalid input / non-whitelisted host / no extractable
 * pair / outside Estonia — no enumeration) and
 * {@link Outcome.UpstreamFailure} (one generic 502 for timeout / network
 * / upstream server failure).
 */
@Service
public class LocationResolveService {

    /** The only host the client ever sends (design decision 4). */
    public static final String WHITELISTED_HOST = "maps.app.goo.gl";

    /** At most this many redirects are followed; the pair is read from
     *  whichever URL the chain stops at. */
    static final int MAX_REDIRECT_HOPS = 3;

    private final RedirectClient redirectClient;

    public LocationResolveService(RedirectClient redirectClient) {
        this.redirectClient = Objects.requireNonNull(redirectClient, "redirectClient");
    }

    /**
     * Resolves a short link to a coordinate pair.
     *
     * @param url the raw request payload (validated: http/https scheme +
     *            the host whitelist, then the hop walk)
     * @return a sealed outcome — never null
     */
    public Outcome resolve(String url) {
        URI start;
        try {
            start = URI.create(url);
        } catch (IllegalArgumentException e) {
            return Outcome.NotFound.INSTANCE;
        }
        String scheme = start.getScheme();
        boolean http = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
        if (!http || !WHITELISTED_HOST.equalsIgnoreCase(start.getHost())) {
            return Outcome.NotFound.INSTANCE;
        }

        String current = start.toString();
        for (int hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
            RedirectClient.RedirectHop next;
            try {
                next = redirectClient.fetch(current);
            } catch (IOException e) {
                // timeout / connection failure — no upstream detail leaks out
                return Outcome.UpstreamFailure.INSTANCE;
            }
            if (!next.isRedirect()) {
                if (next.status() >= 500) {
                    // the short-link service itself is failing — retry later
                    return Outcome.UpstreamFailure.INSTANCE;
                }
                break; // terminal response — the fetched URL is final
            }
            current = URI.create(current).resolve(next.location()).toString();
        }

        GeoPoint point = MapsUrlCoordinates.extract(current);
        if (point == null) {
            return Outcome.NotFound.INSTANCE;
        }
        return new Outcome.Resolved(point.lat(), point.lng());
    }

    /** The outcome of a resolve — the controller maps each variant to a status. */
    public sealed interface Outcome {

        /** The final URL carried an in-Estonia pair (auto-swapped when needed). */
        record Resolved(double latitude, double longitude) implements Outcome {
        }

        /** Invalid input, non-whitelisted host, no extractable pair, or the pair
         *  is outside Estonia in both orders — one generic 400, no enumeration. */
        record NotFound() implements Outcome {
            public static final NotFound INSTANCE = new NotFound();
        }

        /** Connect/read timeout, network failure, or a 5xx from the short-link
         *  service — one generic 502, no upstream detail. */
        record UpstreamFailure() implements Outcome {
            public static final UpstreamFailure INSTANCE = new UpstreamFailure();
        }
    }
}
