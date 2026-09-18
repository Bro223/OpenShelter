package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import ee.sheltermap.guidance.HeroAddressResolver;
import ee.sheltermap.guidance.HeroImageFetchClient;
import ee.sheltermap.guidance.JdkHeroImageFetchClient;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endpoint acceptance for the hero-image import (guidance-hero-import) —
 * full-stack MockMvc against the REAL security chain and the REAL
 * {@link JdkHeroImageFetchClient} (real streaming, real redirects, real
 * size-cap abort, real read-stall watchdog) pointed at a local
 * {@link HttpServer}.
 *
 * <p>The ADDRESS policy seam ({@link HeroAddressResolver}) is the one
 * stubbed layer — the same seam discipline {@code LocationResolveIT}
 * applies to its {@code RedirectClient} (the real DNS cannot be pointed
 * at a loopback test server: the policy would correctly refuse it). The
 * stub models three hosts: {@code public.image} (resolves public — and
 * is rewritten to the local server for the fetch), {@code private.image}
 * (resolves to 127.0.0.1) and IP literals (resolve to themselves, like
 * plain DNS — the redirect-to-127.0.0.1 case).
 *
 * <p>Covers the spec's scenarios: a valid image is imported and linked;
 * a text file served as image/png is refused; an oversized body is
 * refused at the cap (and aborted, not buffered); a redirect to
 * 127.0.0.1 is refused; a file: URL is refused; a URL with credentials
 * is refused; an image over the pixel cap is refused; and a failed
 * import leaves the post a DRAFT with a readable error.
 */
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "app.admin.email=import-admin@example.ee",
        "app.admin.password=import-admin-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // A small cap so the oversized-body test needs no multi-MiB body.
        "app.media.max-bytes=2048"
})
class HeroImageImportIT extends AbstractPersistenceIT {

    /** Isolates the media upload directory per JVM run (the IT idiom). */
    private static final Path MEDIA_DIR;

    static {
        try {
            MEDIA_DIR = Files.createTempDirectory("sheltermap-hero-import-it-media");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void mediaUploadDir(DynamicPropertyRegistry registry) {
        registry.add("app.media.upload-dir", MEDIA_DIR::toString);
    }

    // ---------- the remote-image stub (a local HttpServer) ----------

    /** A 1x1 transparent PNG — a real, inspector-readable fixture. */
    private static final byte[] PNG_1X1 = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
                    + "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

    /** A 33-byte PNG whose HEADER claims 100001×1 (the pixel-cap fixture). */
    private static final byte[] PNG_HUGE_DIMS = pngWithDimensions(100_001, 1);

    static HttpServer remote;
    static int port;

    /** Requests the stub served per path (the "never fetched" assertions). */
    static final AtomicLong secretRequests = new AtomicLong();
    /** Bytes the oversized handler managed to write. */
    static final AtomicInteger bigBytesWritten = new AtomicInteger();
    /** Whether the oversized handler saw the client drop the connection. */
    static final AtomicBoolean bigWriteAborted = new AtomicBoolean();

    @BeforeAll
    static void startRemote() throws Exception {
        remote = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        // A thread POOL: the default single dispatch thread would queue
        // every test request behind a slow handler.
        remote.setExecutor(java.util.concurrent.Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "hero-import-it-remote");
            t.setDaemon(true);
            return t;
        }));
        port = remote.getAddress().getPort();
        remote.createContext("/photo.png", exchange -> serve(exchange, 200, "image/png", PNG_1X1));
        remote.createContext("/fake.png", exchange -> {
            // A lying host: text bytes served with an image/png header.
            serve(exchange, 200, "image/png",
                    "this is not an image at all".getBytes(StandardCharsets.UTF_8));
        });
        remote.createContext("/big.png", exchange -> {
            // Fixed length, not chunked: this JDK (21.0.7) HttpServer
            // sends "Content-length: 0" for a -1 (chunked) body — a JDK
            // quirk. The handler still streams in flushed chunks.
            int total = 16 * 1024;
            exchange.getResponseHeaders().add("Content-Type", "image/png");
            exchange.sendResponseHeaders(200, total);
            try (OutputStream out = exchange.getResponseBody()) {
                byte[] chunk = new byte[1024];
                for (int i = 0; i < 16; i++) { // 16 KiB total, cap is 2 KiB
                    out.write(chunk);
                    out.flush();
                    bigBytesWritten.addAndGet(chunk.length);
                }
            } catch (IOException e) {
                bigWriteAborted.set(true); // the expected client abort
            }
        });
        remote.createContext("/huge-dims.png", exchange -> serve(exchange, 200, "image/png", PNG_HUGE_DIMS));
        remote.createContext("/redirect-to-loopback", exchange -> {
            exchange.getResponseHeaders().add(
                    "Location", "http://127.0.0.1:" + port + "/secret.png");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        remote.createContext("/secret.png", exchange -> {
            secretRequests.incrementAndGet();
            serve(exchange, 200, "image/png", PNG_1X1);
        });
        remote.createContext("/redirect-ok", exchange -> {
            exchange.getResponseHeaders().add(
                    "Location", "http://public.image:" + port + "/photo.png");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        remote.createContext("/missing.png", exchange -> exchange.sendResponseHeaders(404, -1));
        remote.start();
    }

    @AfterAll
    static void stopRemote() {
        remote.stop(0);
    }

    private static void serve(HttpExchange exchange, int status,
                              String contentType, byte[] body) throws IOException {
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(body);
        }
    }

    /** Signature + IHDR with the given dimensions (the inspector reads the header only). */
    private static byte[] pngWithDimensions(int width, int height) {
        byte[] b = new byte[33];
        b[0] = (byte) 0x89; b[1] = 0x50; b[2] = 0x4E; b[3] = 0x47;
        b[4] = 0x0D; b[5] = 0x0A; b[6] = 0x1A; b[7] = 0x0A;
        b[8] = 0; b[9] = 0; b[10] = 0; b[11] = 13;
        b[12] = 'I'; b[13] = 'H'; b[14] = 'D'; b[15] = 'R';
        b[16] = (byte) (width >>> 24); b[17] = (byte) (width >>> 16);
        b[18] = (byte) (width >>> 8); b[19] = (byte) width;
        b[20] = (byte) (height >>> 24); b[21] = (byte) (height >>> 16);
        b[22] = (byte) (height >>> 8); b[23] = (byte) height;
        b[24] = 8;
        b[25] = 2;
        return b;
    }

    // ---------- the address-policy seam (the one stubbed layer) ----------

    /**
     * {@code public.image} — a public host (resolves 93.184.216.34); the
     * fetch client rewrites it to the local server. {@code private.image}
     * — a host whose answer is 127.0.0.1. IP literals — themselves, like
     * plain DNS (so a Location of {@code http://127.0.0.1:…} classifies
     * as loopback, as it would in production).
     */
    @TestConfiguration
    static class AddressPolicySeam {

        @Bean
        @Primary
        HeroAddressResolver addressResolver() {
            return host -> {
                try {
                    if ("private.image".equals(host)) {
                        return List.of(InetAddress.getByName("127.0.0.1"));
                    }
                    if ("public.image".equals(host)) {
                        return List.of(InetAddress.getByName("93.184.216.34"));
                    }
                    return List.of(InetAddress.getByName(host));
                } catch (UnknownHostException e) {
                    throw e;
                }
            };
        }

        @Bean
        @Primary
        HeroImageFetchClient fetchClient() {
            // The REAL client (real I/O) — with the public test host
            // rewritten to the local stub, since the stub listens on
            // loopback and the policy seam models the host as public.
            JdkHeroImageFetchClient real = new JdkHeroImageFetchClient(
                    Duration.ofSeconds(3), Duration.ofSeconds(5));
            return (url, maxBytes) -> real.fetch(url.replace("public.image", "127.0.0.1"), maxBytes);
        }
    }

    // ---------- the IT ----------

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    private String admin;

    @org.junit.jupiter.api.BeforeEach
    void login() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"import-admin@example.ee\","
                                + "\"password\":\"import-admin-pass\"}"))
                .andExpect(status().isOk())
                .andReturn();
        admin = JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    /** Creates a draft post with a pending hero import; returns its id. */
    private long createDraftWithImport(String title, String url) throws Exception {
        MvcResult result = mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"" + title + "\",\"body\":\"<p>body</p>\","
                                + "\"heroImageAlt\":\"An alt\",\"heroImportUrl\":\"" + url + "\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void publish(long id) throws Exception {
        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
    }

    @Test
    void aValidPngIsImportedAndLinkedToThePost() throws Exception {
        long id = createDraftWithImport("Imported hero",
                "http://public.image:" + port + "/photo.png");

        // The draft carries the pending URL, no asset yet.
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heroImportUrl").value("http://public.image:" + port + "/photo.png"))
                .andExpect(jsonPath("$.heroImageId").isEmpty());

        publish(id);

        // Published with the imported asset as hero; the URL is consumed.
        MvcResult published = mvc.perform(get("/admin/guidance/" + id)
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        String body = published.getResponse().getContentAsString(StandardCharsets.UTF_8);
        long assetId = ((Number) JsonPath.read(body, "$.heroImageId")).longValue();
        String heroUrl = JsonPath.read(body, "$.heroImageUrl");
        String storedName = heroUrl.substring("/api/media/".length());
        assertThat(heroUrl).matches("/api/media/[a-f0-9]{32}\\.png");
        assertThat((Object) JsonPath.read(body, "$.heroImportUrl")).isNull();
        assertThat((Object) JsonPath.read(body, "$.heroImageAlt")).isEqualTo("An alt");

        // The asset row: sniffed type + the recorded origin (takedown trail).
        List<String> sourceUrls = jdbc.queryForList(
                "SELECT source_url FROM media_assets WHERE id = ?", String.class, assetId);
        assertThat(sourceUrls).containsExactly("http://public.image:" + port + "/photo.png");
        List<String> types = jdbc.queryForList(
                "SELECT content_type FROM media_assets WHERE id = ?", String.class, assetId);
        assertThat(types).containsExactly("image/png");

        // The public page can load the imported image (anonymous).
        mvc.perform(get("/api/media/" + storedName))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().string("Content-Type", "image/png"));
    }

    @Test
    void aTextFileServedAsImagePngIsRefusedAndTheDraftStays() throws Exception {
        long id = createDraftWithImport("Fake png",
                "http://public.image:" + port + "/fake.png");

        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("readable JPEG, PNG or WebP")));

        // Still a DRAFT with the URL intact; no asset row was written.
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value("http://public.image:" + port + "/fake.png"))
                .andExpect(jsonPath("$.heroImageId").isEmpty());
        Integer assets = jdbc.queryForObject(
                "SELECT count(*) FROM media_assets WHERE source_url IS NOT NULL", Integer.class);
        assertThat(assets).isZero();
    }

    @Test
    void anOversizedBodyIsRefusedAtTheCapAndAborted() throws Exception {
        long id = createDraftWithImport("Big png",
                "http://public.image:" + port + "/big.png");

        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("2048")));

        // The 413 fired at the 2 KiB cap, not via a timeout: the draft
        // keeps its URL for a retry and no asset row exists.
        // (The client-side "nothing buffered past the cap" invariant is
        // proven deterministically in JdkHeroImageFetchClientTest — TCP
        // socket buffering makes the server-side view of the abort racy.)
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(
                        "http://public.image:" + port + "/big.png"));
        Integer assets = jdbc.queryForObject(
                "SELECT count(*) FROM media_assets WHERE source_url IS NOT NULL", Integer.class);
        assertThat(assets).isZero();
    }

    @Test
    void aRedirectTo127001IsRefusedAndNeverFetched() throws Exception {
        secretRequests.set(0);
        long id = createDraftWithImport("Redirect loopback",
                "http://public.image:" + port + "/redirect-to-loopback");

        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("127.0.0.1")));

        // The hop target was re-validated BEFORE being fetched: the secret
        // route never saw a request. The post stays a DRAFT.
        Thread.sleep(100);
        assertThat(secretRequests.get())
                .as("the redirect target 127.0.0.1 was never fetched")
                .isZero();
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void aFileUrlIsRefusedAtWriteTime() throws Exception {
        long before = ((Number) JsonPath.read(mvc.perform(get("/admin/guidance")
                        .header("Authorization", "Bearer " + admin))
                        .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8),
                        "$.length()")).intValue();

        mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"File url\",\"body\":\"<p>b</p>\","
                                + "\"heroImageAlt\":\"alt\",\"heroImportUrl\":\"file:///etc/passwd\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("http or https")));

        long after = ((Number) JsonPath.read(mvc.perform(get("/admin/guidance")
                        .header("Authorization", "Bearer " + admin))
                        .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8),
                        "$.length()")).intValue();
        assertThat(after).isEqualTo(before);
    }

    @Test
    void aUrlWithCredentialsIsRefusedAtWriteTime() throws Exception {
        long before = ((Number) JsonPath.read(mvc.perform(get("/admin/guidance")
                        .header("Authorization", "Bearer " + admin))
                        .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8),
                        "$.length()")).intValue();

        mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"Cred url\",\"body\":\"<p>b</p>\","
                                + "\"heroImageAlt\":\"alt\",\"heroImportUrl\":\"https://user:pass@public.image/photo.png\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("credentials")));

        long after = ((Number) JsonPath.read(mvc.perform(get("/admin/guidance")
                        .header("Authorization", "Bearer " + admin))
                        .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8),
                        "$.length()")).intValue();
        assertThat(after).isEqualTo(before);
    }

    @Test
    void anImageOverThePixelCapIsRefused() throws Exception {
        long id = createDraftWithImport("Huge dims",
                "http://public.image:" + port + "/huge-dims.png");

        // A 33-byte file whose header claims 100001 px — refused at the
        // 10000 px per-side cap (the decompression-bomb guard).
        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("10000")));

        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImageId").isEmpty());
        Integer assets = jdbc.queryForObject(
                "SELECT count(*) FROM media_assets WHERE source_url IS NOT NULL", Integer.class);
        assertThat(assets).isZero();
    }

    @Test
    void aFailedFetchLeavesTheDraftWithAReadableError() throws Exception {
        long id = createDraftWithImport("Missing hero",
                "http://public.image:" + port + "/missing.png");

        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("404")));

        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(
                        "http://public.image:" + port + "/missing.png"));
    }

    @Test
    void aPublicRedirectHopIsFollowedAndImported() throws Exception {
        long id = createDraftWithImport("Public hop",
                "http://public.image:" + port + "/redirect-ok");

        publish(id);

        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.heroImageId").isNumber())
                .andExpect(jsonPath("$.heroImportUrl").isEmpty());
    }

    @Test
    void aPublishedPostCannotTakeAPendingImportUrl() throws Exception {
        // Draft without a URL → publish (plain).
        MvcResult created = mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Live post\",\"body\":\"<p>b</p>\"}"
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
        publish(id);

        // Trying to attach a pending import to the LIVE post is a 400.
        mvc.perform(put("/admin/guidance/" + id)
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"Live post\",\"body\":\"<p>b</p>\","
                                + "\"heroImageAlt\":\"alt\",\"heroImportUrl\":\"http://public.image:"
                                + port + "/photo.png\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("unpublish")));
    }
}
