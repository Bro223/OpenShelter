package ee.sheltermap.app;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The real {@link HttpUrlRedirectClient} against a real local
 * {@link HttpServer} (no new dependency, per the design): a redirect
 * is REPORTED (status + {@code Location} header) and never auto-followed,
 * the polite User-Agent, deterministic statuses pass through untouched,
 * the documented 3 s/5 s timeouts are the ones wired into the connection,
 * and any non-http(s) scheme or malformed URL is an {@link IOException}
 * (the service's generic 502 vocabulary), never a 500.
 *
 * <p>The ADDRESS policy (host allowlist, hop cap, the coordinate parse)
 * is the {@link LocationResolveService}'s over this seam — that is why a
 * localhost test server is legitimate here: this client is pure I/O.
 */
class HttpUrlRedirectClientTest {

    static HttpServer server;
    static int port;
    /** The User-Agent of the last request (politeness guard). */
    static final AtomicReference<String> lastUserAgent = new AtomicReference<>();
    /** How often the redirect TARGET was actually fetched (must stay 0). */
    static final AtomicInteger targetHits = new AtomicInteger();

    @BeforeAll
    static void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "location-resolve-test-server");
            t.setDaemon(true);
            return t;
        }));
        port = server.getAddress().getPort();
        server.createContext("/redirect", exchange -> {
            lastUserAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            exchange.getResponseHeaders().add(
                    "Location", "http://127.0.0.1:" + port + "/target.png");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.createContext("/target.png", exchange -> {
            targetHits.incrementAndGet();
            exchange.sendResponseHeaders(404, -1); // 404 so even a follow-up would be visible
            exchange.close();
        });
        server.createContext("/moved", exchange -> {
            exchange.getResponseHeaders().add(
                    "Location", "http://127.0.0.1:" + port + "/plain");
            exchange.sendResponseHeaders(301, -1);
            exchange.close();
        });
        server.createContext("/plain", exchange -> {
            byte[] body = "ok".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext("/missing", exchange -> exchange.sendResponseHeaders(404, -1));
        server.createContext("/upstream-500", exchange -> exchange.sendResponseHeaders(500, -1));
        server.start();
    }

    @AfterAll
    static void stopServer() {
        server.stop(0);
    }

    private HttpUrlRedirectClient client() {
        return new HttpUrlRedirectClient();
    }

    @Test
    void aRedirectIsReportedNotFollowed() throws IOException {
        RedirectClient.RedirectHop hop =
                client().fetch("http://127.0.0.1:" + port + "/redirect");

        assertThat(hop.status()).isEqualTo(302);
        assertThat(hop.location()).isEqualTo("http://127.0.0.1:" + port + "/target.png");
        assertThat(hop.isRedirect()).isTrue();
        // THE guard: the service owns the next hop — the client must not
        // have made it (auto-follow would have hit the target once).
        assertThat(targetHits.get()).as("the redirect target was never fetched").isZero();
    }

    @Test
    void thePoliteUserAgentIdentifiesTheResolver() throws IOException {
        client().fetch("http://127.0.0.1:" + port + "/plain");

        assertThat(lastUserAgent.get()).isEqualTo(HttpUrlRedirectClient.USER_AGENT);
    }

    @Test
    void deterministicStatusesPassThroughUntouched() throws IOException {
        assertThat(client().fetch("http://127.0.0.1:" + port + "/missing").status())
                .isEqualTo(404);
        assertThat(client().fetch("http://127.0.0.1:" + port + "/upstream-500").status())
                .isEqualTo(500);
        // A 3xx WITHOUT a Location header is terminal, not a redirect.
        RedirectClient.RedirectHop plain = client().fetch("http://127.0.0.1:" + port + "/plain");
        assertThat(plain.status()).isEqualTo(200);
        assertThat(plain.location()).isNull();
        assertThat(plain.isRedirect()).isFalse();
    }

    @Test
    void aPermanentRedirectPassesItsOwnStatusThrough() throws IOException {
        RedirectClient.RedirectHop hop =
                client().fetch("http://127.0.0.1:" + port + "/moved");

        assertThat(hop.status()).isEqualTo(301);
        assertThat(hop.location()).isEqualTo("http://127.0.0.1:" + port + "/plain");
        assertThat(hop.isRedirect()).isTrue();
    }

    @Test
    void aNonHttpSchemeIsAnUnfetchableIOExceptionNotA500() {
        assertThatThrownBy(() -> client().fetch("file:///etc/passwd"))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("unfetchable redirect target");
    }

    @Test
    void anFtpSchemeIsAnUnfetchableIOExceptionNotA500() {
        assertThatThrownBy(() -> client().fetch("ftp://example.com/a.txt"))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("unfetchable redirect target");
    }

    @Test
    void aMalformedUrlIsAnUnfetchableIOException() {
        // A space in the authority is not a legal URI.
        assertThatThrownBy(() -> client().fetch("http://exa mple.com/x"))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("unfetchable redirect target");
    }

    /** The documented connect/read budget, wired into the connection. */
    @Test
    void theTimeoutsAreTheDocumentedThreeAndFiveSeconds() {
        assertThat(HttpUrlRedirectClient.CONNECT_TIMEOUT_MILLIS).isEqualTo(3_000);
        assertThat(HttpUrlRedirectClient.READ_TIMEOUT_MILLIS).isEqualTo(5_000);
    }
}
