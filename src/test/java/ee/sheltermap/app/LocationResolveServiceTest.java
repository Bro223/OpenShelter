package ee.sheltermap.app;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Resolver behaviour against a scripted {@link RedirectClient} fake —
 * no network (shelter-location-input, design decision 4): host whitelist,
 * the ≤3-hop cap (read off the {@code Location} header, one fetch per
 * hop), timeout/network → upstream failure, no pair / outside Estonia
 * → not-found, and the auto-swap rule on the final URL.
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

    /** A scripted RedirectClient fake — hops and failures in call order. */
    private static final class ScriptedClient implements RedirectClient {

        private final Deque<Object> script = new ArrayDeque<>(); // RedirectHop | IOException
        int fetches;
        String lastFetched;

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
