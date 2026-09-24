package ee.sheltermap.guidance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.LongSupplier;

/**
 * The real {@link HeroImageFetchClient} over the JDK {@link HttpClient}
 * (no new dependency, the same
 * outbound discipline as {@code CsvRegistryClient}):
 *
 * <ul>
 *   <li>a connect timeout (guard 5) — a host that never completes the
 *       handshake cannot pin a request thread;</li>
 *   <li>a READ bound (guard 5) in two phases, both the <em>no progress</em>
 *       read timeout: the response head is polled via {@code sendAsync}
 *       against a deadline (the JDK's own request {@code timeout()} is
 *       deliberately NOT used — it bounds the WHOLE exchange, which would
 *       cut a legitimate multi-second download of a near-cap body short,
 *       and it tears the stream down silently instead of failing it),
 *       and the body is read under a <em>stall watchdog</em> — a reader
 *       thread pulls the stream while the caller polls for progress; if
 *       no bytes arrive for the read timeout the stream is closed
 *       (unblocking the reader) and the fetch fails. A slow-loris body
 *       that drips one byte a second dies here, and the whole walk
 *       additionally dies at the service's wall-clock budget;</li>
 *   <li>the size cap is enforced WHILE READING (guard 4): the reader
 *       stops the instant the running total passes {@code maxBytes},
 *       closes the stream (the server sees the connection drop) and
 *       raises {@link MediaTooLargeException} — the 413 vocabulary the
 *       upload path already uses. Nothing is buffered past the cap;</li>
 *   <li>redirects are NOT auto-followed
 *       ({@code followRedirects(NEVER)}) — the service reads each
 *       {@code Location} header itself and re-validates the target
 *       (scheme + address policy) before the next hop;</li>
 *   <li>a fixed User-Agent identifies the importer upstream (politeness,
 *       the registry-client idiom).</li>
 * </ul>
 */
@Component
public class JdkHeroImageFetchClient implements HeroImageFetchClient {

    /** Identifies the importer to remote hosts (the registry-client idiom). */
    static final String USER_AGENT = "OpenShelter/1.0 (hero image import)";

    private static final int CHUNK_SIZE = 8192;

    private final HttpClient http;
    private final Duration connectTimeout;
    private final Duration readTimeout;
    private final LongSupplier nanos;
    /** Total bytes pulled off the wire (test seam — proves the cap is enforced while reading). */
    final AtomicLong bytesRead = new AtomicLong();

    @Autowired
    public JdkHeroImageFetchClient(
            @Value("${app.media.import-connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.media.import-read-timeout:5s}") Duration readTimeout) {
        this(connectTimeout, readTimeout, System::nanoTime);
    }

    /** Test seam — explicit timeouts and monotonic nanoseconds. */
    JdkHeroImageFetchClient(Duration connectTimeout, Duration readTimeout, LongSupplier nanos) {
        this.connectTimeout = connectTimeout;
        this.readTimeout = readTimeout;
        this.nanos = nanos;
        this.http = HttpClient.newBuilder()
                .connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    @Override
    public FetchedImage fetch(String url, long maxBytes) {
        URI uri = parseUrl(url);
        HttpRequest request = singleGetRequest(uri);
        HttpResponse<InputStream> response = awaitHead(request, uri);
        return toFetchedImage(response, uri, maxBytes);
    }

    private static URI parseUrl(String url) {
        try {
            return URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new HeroImportUnreachableException("The hero image URL is not fetchable: " + url);
        }
    }

    /**
     * One GET request: deliberately NO request {@code timeout()} — the
     * JDK's exchange timeout would bound the WHOLE download, not the
     * no-progress interval the read timeout is meant to bound (a steady
     * near-cap download would be killed mid-stream, and the stream is
     * torn down silently instead of failed). The head is deadline-polled
     * in {@link #awaitHead}; the body has its stall watchdog in
     * {@link #readCapped}.
     */
    private static HttpRequest singleGetRequest(URI uri) {
        return HttpRequest.newBuilder(uri)
                .GET()
                .header("User-Agent", USER_AGENT)
                .build();
    }

    /**
     * The response HEAD must arrive within the read timeout — a host
     * that accepts the connection and never answers cannot pin the
     * thread past this deadline. sendAsync + a polled deadline (the
     * same discipline as the body watchdog) instead of the exchange
     * timeout, so a legitimate long download is not capped by it.
     */
    private HttpResponse<InputStream> awaitHead(HttpRequest request, URI uri) {
        CompletableFuture<HttpResponse<InputStream>> head =
                http.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream());
        long headDeadline = nanos.getAsLong() + readTimeout.toNanos();
        while (!head.isDone()) {
            if (nanos.getAsLong() > headDeadline) {
                head.cancel(true);
                throw new HeroImportUnreachableException(
                        "The hero image host timed out answering (no response within "
                                + readTimeout + "): " + uri.getHost());
            }
            nap(100);
        }
        try {
            return head.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new HeroImportUnreachableException("Interrupted while fetching the hero image", e);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof Exception ex) {
                throw new HeroImportUnreachableException(
                        "The hero image host could not be reached: " + uri.getHost(), ex);
            }
            throw new HeroImportUnreachableException(
                    "The hero image host could not be reached: " + uri.getHost(),
                    new RuntimeException(cause));
        }
    }

    /**
     * The observed response as the service's seam type: a redirect
     * carries its {@code Location} and its body — often a tiny HTML
     * stub — is discarded (the service re-validates the target and
     * fetches it itself); anything else is read under the size cap and
     * the stall watchdog.
     */
    private FetchedImage toFetchedImage(HttpResponse<InputStream> response,
                                        URI uri, long maxBytes) {
        try {
            int status = response.statusCode();
            String location = response.headers().firstValue("Location").orElse(null);
            InputStream body = response.body();
            if (status >= 300 && status <= 399) {
                body.close();
                return new FetchedImage(status, location, null);
            }
            byte[] bytes = readCapped(body, maxBytes);
            return new FetchedImage(status, location, bytes);
        } catch (IOException e) {
            throw new HeroImportUnreachableException(
                    "Reading the hero image response failed: " + uri.getHost(), e);
        }
    }

    /**
     * Reads the body up to {@code maxBytes}, aborting past the cap and
     * aborting on a stalled stream (no bytes for {@code readTimeout}).
     *
     * <p>The JDK's {@code HttpClient} exposes no per-read socket timeout
     * for a streaming body, so the read runs on a short-lived daemon
     * thread while the caller watches the last-progress instant: a stall
     * closes the stream from here, which interrupts the reader's blocking
     * read. The cap is checked on EVERY chunk — the buffer never exceeds
     * {@code maxBytes} + one chunk, and the stream is closed the moment
     * it is crossed, so an oversized response is ABORTED, not buffered.
     */
    private byte[] readCapped(InputStream in, long maxBytes) {
        byte[] buffer = new byte[CHUNK_SIZE];
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        AtomicBoolean over = new AtomicBoolean();
        AtomicBoolean finished = new AtomicBoolean();
        AtomicLong lastProgress = new AtomicLong(nanos.getAsLong());
        Thread reader = new Thread(() -> {
            try {
                int n;
                while ((n = in.read(buffer)) != -1) {
                    bytesRead.addAndGet(n); // test seam: the wire-byte total
                    out.write(buffer, 0, n);
                    lastProgress.set(nanos.getAsLong());
                    if (out.size() > maxBytes) {
                        // Guard 4: past the cap — stop reading NOW and let
                        // the caller close the connection (the server sees
                        // the drop instead of the client soaking up the
                        // rest of the body).
                        over.set(true);
                        break;
                    }
                }
            } catch (IOException e) {
                failure.set(e);
            } finally {
                lastProgress.set(nanos.getAsLong());
                finished.set(true);
            }
        }, "hero-import-body-read");
        reader.setDaemon(true);
        reader.start();
        try {
            while (!finished.get()) {
                if (nanos.getAsLong() - lastProgress.get() > readTimeout.toNanos()) {
                    // No bytes for the read timeout: a hanging host. Close
                    // the stream to interrupt the reader's blocking read,
                    // give it a short grace to die, then fail the fetch.
                    closeQuietly(in);
                    waitFinished(finished, Duration.ofSeconds(2));
                    throw new HeroImportUnreachableException(
                            "The hero image host stalled the download (no bytes for "
                                    + readTimeout + ")");
                }
                nap(250);
            }
        } finally {
            closeQuietly(in);
        }
        if (over.get()) {
            // The same 413 vocabulary the upload path uses (the message
            // names the cap) — a downloaded image is "uploaded" to the
            // library from the admin's point of view.
            throw new MediaTooLargeException(maxBytes);
        }
        if (failure.get() != null) {
            throw new HeroImportUnreachableException(
                    "Reading the hero image body failed", failure.get());
        }
        return out.toByteArray();
    }

    private static void nap(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new HeroImportUnreachableException("Interrupted while reading the hero image", e);
        }
    }

    private static void waitFinished(AtomicBoolean finished, Duration grace) {
        long deadline = System.nanoTime() + grace.toNanos();
        while (!finished.get() && System.nanoTime() < deadline) {
            nap(50);
        }
    }

    private static void closeQuietly(InputStream in) {
        try {
            in.close();
        } catch (IOException ignored) {
            // Closing a dying stream is best-effort — the outcome is the
            // caller's (stall / over-cap), not the close's.
        }
    }
}
