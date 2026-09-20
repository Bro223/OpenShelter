package ee.sheltermap.guidance;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The real {@link JdkHeroImageFetchClient} against a real local
 * {@link HttpServer} (no new dependency, per the design): the polite
 * User-Agent, redirects returned WITHOUT auto-follow, the size cap
 * enforced WHILE READING (aborted, not buffered), the read-stall
 * watchdog on a hanging host, and the status pass-through.
 *
 * <p>The ADDRESS policy is not on this layer (it is the service's, over
 * the resolver seam) — that is why a localhost test server is legitimate
 * here: this client is pure I/O with the two guard-4/5 contracts.
 */
class JdkHeroImageFetchClientTest {

    /** A 1x1 transparent PNG — a real, inspector-readable fixture. */
    private static final byte[] PNG_1X1 = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
                    + "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

    static HttpServer server;
    static int port;
    /** The User-Agent of the last request (politeness guard). */
    static final AtomicReference<String> lastUserAgent = new AtomicReference<>();

    @BeforeAll
    static void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        // A thread POOL: the default HttpServer dispatch thread is single,
        // so a slow handler (the /stall.png one sleeps 15 s) would queue
        // every other test request behind it.
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "hero-import-test-server");
            t.setDaemon(true);
            return t;
        }));
        port = server.getAddress().getPort();
        server.createContext("/photo.png", exchange -> {
            lastUserAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            byte[] body = PNG_1X1;
            exchange.getResponseHeaders().add("Content-Type", "image/png");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.createContext("/fake.png", exchange -> {
            // A lying host: text bytes served as image/png — the sniff,
            // not this header, is what the import service trusts.
            byte[] body = "this is not an image at all".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "image/png");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        // NOTE: fixed-length bodies (sendResponseHeaders(200, total)), NOT
        // chunked (-1): on this JDK (21.0.7) the HttpServer sends
        // "Content-length: 0" for a -1 body and the stream dies — a JDK
        // quirk. Streaming is preserved: the handler flushes in chunks,
        // so the client still has to read progressively.
        server.createContext("/big.png", exchange -> {
            // The client aborts mid-stream when the cap is hit — the
            // IOException is the expected outcome, not a server failure.
            int total = 64 * 4096;
            exchange.getResponseHeaders().add("Content-Type", "image/png");
            exchange.sendResponseHeaders(200, total); // 256 KiB total
            try (OutputStream out = exchange.getResponseBody()) {
                byte[] chunk = new byte[4096];
                for (int i = 0; i < 64; i++) {
                    out.write(chunk);
                    out.flush();
                }
            } catch (IOException ignored) {
                // The client dropping the connection at the cap.
            }
        });
        server.createContext("/stall.png", exchange -> {
            // Response head declares a body, then SILENCE: a hanging host.
            exchange.getResponseHeaders().add("Content-Type", "image/png");
            exchange.sendResponseHeaders(200, 100);
            OutputStream out = exchange.getResponseBody();
            // ONE body byte before the silence. Without it the test is
            // JVM-version coupled: on JDK 21 the sendAsync future for an
            // InputStream body completes at the head alone, but on JDK 27
            // it waits for at least one body byte (a head-then-silence
            // host looks, to the client, exactly like a host that never
            // answers), so the client's head-deadline branch fires there
            // instead of the stall watchdog. With the byte, both JDKs
            // complete the head, pull it, and hang on the missing rest —
            // the SAME observable condition, asserted below.
            out.write(new byte[] {0});
            out.flush();
            try {
                Thread.sleep(15_000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            exchange.close();
        });
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().add(
                    "Location", "http://127.0.0.1:" + port + "/photo.png");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.createContext("/missing.png", exchange -> exchange.sendResponseHeaders(404, -1));
        server.createContext("/upstream-500", exchange -> exchange.sendResponseHeaders(500, -1));
        server.start();
    }

    @AfterAll
    static void stopServer() {
        server.stop(0);
    }

    private JdkHeroImageFetchClient client(Duration readTimeout) {
        return new JdkHeroImageFetchClient(Duration.ofSeconds(3), readTimeout, System::nanoTime);
    }

    @Test
    void aValidImageIsFetchedWithThePoliteUserAgent() {
        HeroImageFetchClient.FetchedImage response = client(Duration.ofSeconds(5))
                .fetch("http://127.0.0.1:" + port + "/photo.png", 5_242_880);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body()).isEqualTo(PNG_1X1);
        assertThat(lastUserAgent.get()).contains("hero image import");
    }

    @Test
    void aRedirectIsReportedNotFollowed() {
        HeroImageFetchClient.FetchedImage response = client(Duration.ofSeconds(5))
                .fetch("http://127.0.0.1:" + port + "/redirect", 5_242_880);

        assertThat(response.status()).isEqualTo(302);
        assertThat(response.isRedirect()).isTrue();
        assertThat(response.location()).isEqualTo("http://127.0.0.1:" + port + "/photo.png");
        // The redirect body is discarded — the service owns the next hop.
        assertThat(response.body()).isNull();
    }

    /**
     * Guard 4: the cap is enforced WHILE READING — the oversized body is
     * ABORTED (the server sees the connection drop) and the 413
     * vocabulary is raised, not "buffered everything, then checked".
     */
    @Test
    void anOversizedBodyIsAbortedAtTheCap() throws Exception {
        // Cap of 16 KiB against a 256 KiB body. (TCP socket buffering
        // makes the SERVER side's observation of the abort racy at this
        // size — the kernel buffer can absorb the whole body — so the
        // abort proof is on the CLIENT side: the client never pulls more
        // than the cap plus one chunk off the wire.)
        JdkHeroImageFetchClient client = client(Duration.ofSeconds(5));
        long start = System.nanoTime();

        assertThatThrownBy(() -> client.fetch("http://127.0.0.1:" + port + "/big.png", 16 * 1024))
                .isInstanceOf(MediaTooLargeException.class)
                .hasMessageContaining("16384");

        long elapsedMillis = Duration.ofNanos(System.nanoTime() - start).toMillis();
        assertThat(elapsedMillis)
                .as("the cap fired while reading, not via the 5 s read timeout")
                .isLessThan(2_000);
        // THE guard-4 invariant: nothing was buffered past the cap — the
        // wire-byte total never exceeded cap + one chunk (8 KiB).
        assertThat(client.bytesRead.get())
                .as("the client stopped pulling bytes at the cap")
                .isLessThanOrEqualTo(16 * 1024 + 8192);
    }

    /** Guard 5: a host that answers the head and then hangs is aborted at the read timeout. */
    @Test
    void aStalledBodyIsAbortedAtTheReadTimeout() {
        long start = System.nanoTime();

        assertThatThrownBy(() -> client(Duration.ofMillis(500))
                        .fetch("http://127.0.0.1:" + port + "/stall.png", 5_242_880))
                .isInstanceOf(HeroImportUnreachableException.class)
                .hasMessageContaining("stalled");

        long elapsedMillis = Duration.ofNanos(System.nanoTime() - start).toMillis();
        assertThat(elapsedMillis)
                .as("the stall is aborted at the read timeout, not after the server's 15 s")
                .isLessThan(5_000);
    }

    @Test
    void deterministicStatusesPassThroughUntouched() {
        assertThat(client(Duration.ofSeconds(5))
                .fetch("http://127.0.0.1:" + port + "/missing.png", 1024).status())
                .isEqualTo(404);
        assertThat(client(Duration.ofSeconds(5))
                .fetch("http://127.0.0.1:" + port + "/upstream-500", 1024).status())
                .isEqualTo(500);
    }

    @Test
    void anUnreachableHostIsUnreachableNotA500() {
        // Nothing listens on this port (the server bound an ephemeral one).
        assertThatThrownBy(() -> client(Duration.ofSeconds(2))
                        .fetch("http://127.0.0.1:1/none.png", 1024))
                .isInstanceOf(HeroImportUnreachableException.class);
    }
}

