package ee.sheltermap.app;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Resolver behaviour against a scripted {@link RedirectClient} fake —
 * no network: host whitelist
 * (entry pinned to a default-port {@code maps.app.goo.gl}), the ≤3-hop cap
 * (read off the {@code Location} header, one fetch per hop), hop-target
 * re-validation (non-Google hosts, scheme changes, protocol-relative and
 * malformed {@code Location}s are rejected BEFORE any fetch), the ~10 s
 * walk budget, timeout/network → upstream failure, no pair / outside
 * Estonia → not-found, and the auto-swap rule on the final URL.
 */
class LocationResolveServiceTest {

    private static final String START = "https://maps.app.goo.gl/abc";
    private static final String FINAL_IN_ESTONIA =
            "https://www.google.com/maps/place/@59.43703,24.75353,17z?hl=et";

    private final ScriptedClient client = new ScriptedClient();
    private final LocationResolveService service = new LocationResolveService(client);

    @Test
    void resolvesAfterOneRedirectHop() {
        client.hop(redirect("https://www.google.com/maps?q=59.437,24.753"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve(START), 59.437, 24.753);
        assertThat(client.fetches).isEqualTo(2); // start + the final URL
    }

    @Test
    void resolvesAfterTwoRedirectHops() {
        client.hop(redirect("https://maps.app.goo.gl/next"))
                .hop(redirect(FINAL_IN_ESTONIA))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve(START), 59.43703, 24.75353);
        assertThat(client.fetches).isEqualTo(3);
    }

    @Test
    void relativeLocationIsResolvedAgainstTheCurrentUrl() {
        client.hop(redirect("/maps?q=59.437,24.753"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve(START), 59.437, 24.753);
    }

    @Test
    void hopCapStopsAtThreeRedirects() {
        // Four redirects are offered; only three may be followed, so the
        // pair on the 4th (never fetched) target is unreachable.
        client.hop(redirect("https://maps.app.goo.gl/h1"))
                .hop(redirect("https://maps.app.goo.gl/h2"))
                .hop(redirect("https://www.google.com/maps/search/Tallinn"))
                .hop(redirect("https://www.google.com/maps?q=59.437,24.753"));

        assertThatNotFound(service.resolve(START));
        assertThat(client.fetches).isEqualTo(3); // the 4th hop is never fetched
    }

    @Test
    void nonWhitelistedHostIsNotFoundAndNeverFetched() {
        assertThatNotFound(service.resolve("https://evil.example.com/maps?q=59.437,24.753"));
        assertThat(client.fetches).isZero();
    }

    @Test
    void nonHttpSchemeIsNotFoundAndNeverFetched() {
        assertThatNotFound(service.resolve("ftp://maps.app.goo.gl/abc"));
        assertThat(client.fetches).isZero();
    }

    @Test
    void entryWithNonDefaultPortIsNotFoundAndNeverFetched() {
        // http://maps.app.goo.gl:8080/ must fail the entry check — the
        // whitelist is host AND default port, not just host
        assertThatNotFound(service.resolve("http://maps.app.goo.gl:8080/abc"));
        assertThat(client.fetches).isZero();
    }

    @Test
    void httpEntryIsUpgradedToHttpsBeforeTheFirstFetch() {
        // A pasted http://maps.app.goo.gl/… link is
        // legitimate — Google upgrades it to https on the first hop, and
        // the no-scheme-change rule would reject THAT hop without the entry
        // upgrade (502 for a valid link). The walk must start on https.
        client.hop(redirect("https://www.google.com/maps?q=59.437,24.753"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve("http://maps.app.goo.gl/abc"), 59.437, 24.753);
        assertThat(client.fetches).isEqualTo(2);
        // the first fetch is the NORMALIZED entry — https, never http
        assertThat(client.fetched.get(0)).isEqualTo("https://maps.app.goo.gl/abc");
        // and the hop to https Google is accepted (no scheme change any more)
        assertThat(client.fetched.get(1)).isEqualTo("https://www.google.com/maps?q=59.437,24.753");
    }

    @Test
    void entryUserInfoIsStrippedBeforeTheFirstFetch() {
        // A pasted https://user:pass@maps.app.goo.gl/…
        // entry passes the host check but must not transmit an
        // Authorization: Basic header to Google — the userInfo is dropped
        // when the entry is normalized.
        client.hop(redirect("https://www.google.com/maps?q=59.437,24.753"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve("https://user:pass@maps.app.goo.gl/abc"), 59.437, 24.753);
        // no fetch may carry the pasted credentials
        assertThat(client.fetched.get(0)).isEqualTo("https://maps.app.goo.gl/abc");
        assertThat(client.fetched).noneMatch(url -> url.contains("user:pass@"));
    }

    @Test
    void unparseableUrlIsNotFoundAndNeverFetched() {
        assertThatNotFound(service.resolve("not a url"));
        assertThat(client.fetches).isZero();
    }

    @Test
    void noPairInFinalUrlIsNotFound() {
        client.hop(new RedirectClient.RedirectHop(200, null));

        assertThatNotFound(service.resolve(START));
    }

    @Test
    void upstreamOutsideEstoniaIsNotFound() {
        client.hop(redirect("https://www.google.com/maps?q=48.858,2.294"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatNotFound(service.resolve(START));
    }

    @Test
    void reversedPairInFinalUrlIsAutoSwapped() {
        client.hop(redirect("https://www.google.com/maps?q=24.7535,59.437"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve(START), 59.437, 24.7535);
    }

    @Test
    void liveGoogleSearchPathRedirectTargetIsResolvedEndToEnd() {
        // 2026-09: the live maps.app.goo.gl redirect target — the pair rides
        // in the /search/ path with a comma+plus separator (no q/ll/@ at
        // all). One hop to the exact URL, then the terminal fetch.
        client.hop(redirect(
                        "https://www.google.com/maps/search/58.999669,+27.289732?entry=tts"
                                + "&g_ep=EgoyMDI2MDkwOS4wIPu8ASoASAFQAw%3D%3D"
                                + "&skid=df6dfcee-5f27-4f5d-bb58-77a07c0e71e7"))
                .hop(new RedirectClient.RedirectHop(200, null));

        assertThatResolved(service.resolve(START), 58.999669, 27.289732);
        assertThat(client.fetches).isEqualTo(2); // start + the final URL
    }

    @Test
    void readTimeoutIsUpstreamFailure() {
        client.fail("Read timed out");

        assertThat(service.resolve(START)).isInstanceOf(
                LocationResolveService.Outcome.UpstreamFailure.class);
    }

    @Test
    void networkFailureIsUpstreamFailure() {
        client.fail("Connection refused");

        assertThat(service.resolve(START)).isInstanceOf(
                LocationResolveService.Outcome.UpstreamFailure.class);
    }

    @Test
    void upstreamServerErrorIsUpstreamFailure() {
        client.hop(new RedirectClient.RedirectHop(500, null));

        assertThat(service.resolve(START)).isInstanceOf(
                LocationResolveService.Outcome.UpstreamFailure.class);
    }

    @Test
    void upstreamClientErrorIsNotFound() {
        // e.g. an expired short link — the chain ended, nothing to retry
        client.hop(new RedirectClient.RedirectHop(404, null));

        assertThatNotFound(service.resolve(START));
    }

    // ---------- hop re-validation — violations are rejected BEFORE any fetch ----------

    @Test
    void hopToCloudMetadataIpIsUpstreamFailureAndNeverFetched() {
        client.hop(redirect("http://169.254.169.254/latest/meta-data/"));

        assertThatUpstreamFailure(service.resolve(START));
        assertThat(client.fetches).isEqualTo(1); // only the entry was fetched
        assertThat(client.lastFetched).isEqualTo(START);
    }

    @Test
    void hopToLoopbackPortIsUpstreamFailureAndNeverFetched() {
        client.hop(redirect("http://127.0.0.1:8080/maps?q=59.437,24.753"));

        assertThatUpstreamFailure(service.resolve(START));
        assertThat(client.fetches).isEqualTo(1);
        assertThat(client.lastFetched).isEqualTo(START);
    }

    @Test
    void hopSchemeChangeToHttpIsUpstreamFailureAndNeverFetched() {
        // entry is https — an http target (even on a Google host) is a
        // mid-walk scheme change and must not be followed
        client.hop(redirect("http://www.google.com/maps?q=59.437,24.753"));

        assertThatUpstreamFailure(service.resolve(START));
        assertThat(client.fetches).isEqualTo(1);
        assertThat(client.lastFetched).isEqualTo(START);
    }

    @Test
    void protocolRelativeHopToForeignHostIsUpstreamFailureAndNeverFetched() {
        // resolves (against the https base) to a non-Google host
        client.hop(redirect("//evil.example.com/maps?q=59.437,24.753"));

        assertThatUpstreamFailure(service.resolve(START));
        assertThat(client.fetches).isEqualTo(1);
        assertThat(client.lastFetched).isEqualTo(START);
    }

    @Test
    void malformedLocationIsUpstreamFailureNotFiveHundred() {
        // URI resolution throws IllegalArgumentException — it must map to the
        // generic 502 outcome, never escape as a 500
        client.hop(redirect("://bad"));

        assertThatUpstreamFailure(service.resolve(START));
        assertThat(client.fetches).isEqualTo(1);
    }

    @Test
    void nonHttpSchemeHopIsUpstreamFailureAndNeverFetched() {
        client.hop(redirect("file:///etc/passwd"));

        assertThatUpstreamFailure(service.resolve(START));
        assertThat(client.fetches).isEqualTo(1);
        assertThat(client.lastFetched).isEqualTo(START);
    }

    @Test
    void walkExceedingTheBudgetIsUpstreamFailureAndStopsTheWalk() {
        // fake monotonic clock: each fetch "stalls" 11 s, well over the 10 s
        // budget — the deadline check before hop 2 must stop the walk
        AtomicLong clock = new AtomicLong(0);
        ScriptedClient inner = new ScriptedClient();
        inner.hop(redirect("https://www.google.com/maps?q=59.437,24.753"));
        RedirectClient stalled = url -> {
            RedirectClient.RedirectHop hop = inner.fetch(url);
            clock.addAndGet(11_000_000_000L);
            return hop;
        };
        LocationResolveService budgeted =
                new LocationResolveService(stalled, Duration.ofSeconds(10), clock::get);

        assertThatUpstreamFailure(budgeted.resolve(START));
        assertThat(inner.fetches).isEqualTo(1); // the 2nd hop is never fetched
    }

    @Test
    void fetchThatEscapesACastExceptionIsUpstreamFailure() {
        // a client-side cast oddity (non-HTTP URL slipped past validation)
        // must map to the generic 502 outcome, never a 500
        LocationResolveService service = new LocationResolveService(
                url -> {
                    throw new ClassCastException("no HttpURLConnection for " + url);
                });

        assertThatUpstreamFailure(service.resolve(START));
    }

    // ---------- helpers ----------

    private static RedirectClient.RedirectHop redirect(String location) {
        return new RedirectClient.RedirectHop(302, location);
    }

    private static void assertThatResolved(LocationResolveService.Outcome outcome,
                                           double latitude, double longitude) {
        assertThat(outcome).isInstanceOfSatisfying(
                LocationResolveService.Outcome.Resolved.class,
                r -> {
                    assertThat(r.latitude()).isEqualTo(latitude);
                    assertThat(r.longitude()).isEqualTo(longitude);
                });
    }

    private static void assertThatNotFound(LocationResolveService.Outcome outcome) {
        assertThat(outcome).isInstanceOf(LocationResolveService.Outcome.NotFound.class);
    }

    private static void assertThatUpstreamFailure(LocationResolveService.Outcome outcome) {
        assertThat(outcome).isInstanceOf(
                LocationResolveService.Outcome.UpstreamFailure.class);
    }

    /** A scripted RedirectClient fake — hops and failures in call order. */
    private static final class ScriptedClient implements RedirectClient {

        private final Deque<Object> script = new ArrayDeque<>(); // RedirectHop | IOException
        int fetches;
        String lastFetched;
        final List<String> fetched = new ArrayList<>();

        ScriptedClient hop(RedirectHop hop) {
            script.add(hop);
            return this;
        }

        ScriptedClient fail(String message) {
            script.add(new IOException(message));
            return this;
        }

        @Override
        public RedirectHop fetch(String url) throws IOException {
            fetches++;
            lastFetched = url;
            fetched.add(url);
            Object step = script.poll();
            if (step instanceof IOException ex) {
                throw ex;
            }
            if (step == null) {
                throw new AssertionError("unexpected fetch #" + fetches + " of " + url);
            }
            return (RedirectHop) step;
        }
    }
}
