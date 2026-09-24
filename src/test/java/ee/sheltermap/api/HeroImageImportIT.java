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
 * Endpoint acceptance for the hero-image import (guidance-hero-import,
 * at SAVE time — the trigger) — full-stack MockMvc against the
 * REAL security chain and the REAL {@link JdkHeroImageFetchClient}
 * (real streaming, real redirects, real size-cap abort, real read-stall
 * watchdog) pointed at a local {@link HttpServer}.
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
 * <p>The trigger is SAVE (create/update): a failed import NEVER blocks
 * the save — the post is stored anyway and the response body's
 * {@code heroImportError} carries the failure (no more 400/413/502
 * import failures; write-time 400s for URL shape remain). Covers the
 * spec's scenarios: a valid image is imported and linked at save;
 * a text file served as image/png is refused (with the save still
 * succeeding); an oversized body is refused at the cap (and aborted,
 * not buffered); a redirect to 127.0.0.1 is refused; a file: URL is
 * refused; a URL with credentials is refused; an image over the pixel
 * cap is refused; a changed URL re-imports at save; and publish itself
 * no longer fetches anything.
 */
@AutoConfigureMockMvc
@Transactional
// PER_CLASS so the @AfterAll cleanup below can be an instance method
// (it needs the injected DataSource — a static one could not reach it).
@org.junit.jupiter.api.TestInstance(org.junit.jupiter.api.TestInstance.Lifecycle.PER_CLASS)
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

    @Autowired
    javax.sql.DataSource dataSource;

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

    /**
     * Per-test sweep of the previous test's committed imports (a
     * REQUIRES_NEW success outlives the test rollback) so every test
     * starts with a clean media table — the count assertions rely on
     * that. Safe HERE on a raw connection: this test's own Spring
     * transaction is open but has executed NO SQL yet (the test method
     * has not run), so it holds no lock the DELETE could wait on —
     * unlike an @AfterEach placement, where the still-open test
     * transaction's post row holds a KEY SHARE on the imported asset
     * and the DELETE deadlocks against it (the run of 2026-09-22 proved
     * it: a main thread parked on the socket read for 3+ hours).
     */
    @org.junit.jupiter.api.BeforeEach
    void cleanLeakedImportedAssets() {
        deleteImportedAssets();
    }

    /**
     * The final sweep: the import commits in its OWN transaction
     * (REQUIRES_NEW — a failed import must not poison the save's), so a
     * SUCCESSFUL import outlives this class' {@code @Transactional} test
     * rollback. The cleanup must therefore run on a connection OUTSIDE
     * the test transaction (a {@code JdbcTemplate} delete would join it
     * and roll back with it); without it the last test's imported assets
     * would leak into every later IT's media-asset counts (uploads carry
     * a null source_url and are never touched).
     *
     * <p>{@code @AfterAll} (instance method — see the class' PER_CLASS
     * lifecycle, needed to reach the injected DataSource): by then every
     * test transaction has been rolled back, so the DELETE waits on
     * nothing.
    @org.junit.jupiter.api.AfterAll
    void removeLeakedImportedAssets() {
        deleteImportedAssets();
    }

    /** The raw-connection sweep (auto-commit — OUTSIDE any test
     *  transaction, by design; see the callers' javadoc). */
    private void deleteImportedAssets() {
        try (java.sql.Connection conn = dataSource.getConnection();
             java.sql.Statement st = conn.createStatement()) {
            st.executeUpdate("DELETE FROM media_assets WHERE source_url IS NOT NULL");
        } catch (java.sql.SQLException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Saves a draft post with a hero import URL — the save that TRIGGERS
     * the import (the trigger: create, draft status). Always 200
     * (a failed import never blocks a save); returns the response body.
     */
    private String saveDraftWithImport(String title, String url) throws Exception {
        MvcResult result = mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"" + title + "\",\"body\":\"<p>body</p>\","
                                + "\"heroImageAlt\":\"An alt\",\"heroImportUrl\":\"" + url + "\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private static long idOf(String body) {
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    /**
     * The number of imported (source_url-carrying) asset rows — the
     * diff baseline: the import commits in its OWN transaction (a failed
     * one must not poison the save's), so earlier tests' successful
     * imports outlive this class' per-test rollback; an assertion is
     * therefore scoped to what THIS save wrote (the diff), and the
     * class' {@code @AfterAll} reclaims the leftovers for the other ITs.
     */
    private long importedAssetCount() {
        return jdbc.queryForObject(
                "SELECT count(*) FROM media_assets WHERE source_url IS NOT NULL", Long.class);
    }

    private void publish(long id) throws Exception {
        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
    }

    @Test
    void aValidPngIsImportedAndLinkedToThePostAtSave() throws Exception {
        String url = "http://public.image:" + port + "/photo.png";

        // The CREATE saves the draft AND imports the hero: the 200 body
        // already carries the imported asset, the URL is kept as provenance.
        String created = saveDraftWithImport("Imported hero", url);
        long id = idOf(created);
        assertThat((Object) JsonPath.read(created, "$.heroImportError")).isNull();
        long assetId = ((Number) JsonPath.read(created, "$.heroImageId")).longValue();

        // The draft (not yet published) is inspectable with its hero.
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImageId").value(assetId))
                .andExpect(jsonPath("$.heroImportUrl").value(url))
                .andExpect(jsonPath("$.heroImageUrl").value(org.hamcrest.Matchers.matchesPattern("/api/media/[a-f0-9]{32}\\.png")));

        // Publish is a pure stamp (204) — it fetches nothing.
        publish(id);

        // Published with the imported asset as hero; the URL still kept.
        MvcResult published = mvc.perform(get("/admin/guidance/" + id)
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        String body = published.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(((Number) JsonPath.read(body, "$.heroImageId")).longValue()).isEqualTo(assetId);
        String heroUrl = JsonPath.read(body, "$.heroImageUrl");
        String storedName = heroUrl.substring("/api/media/".length());
        assertThat(heroUrl).matches("/api/media/[a-f0-9]{32}\\.png");
        assertThat((Object) JsonPath.read(body, "$.heroImportUrl")).isEqualTo(url);
        assertThat((Object) JsonPath.read(body, "$.heroImageAlt")).isEqualTo("An alt");

        // The asset row: sniffed type + the recorded origin (takedown trail).
        List<String> sourceUrls = jdbc.queryForList(
                "SELECT source_url FROM media_assets WHERE id = ?", String.class, assetId);
        assertThat(sourceUrls).containsExactly(url);
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
    void aTextFileServedAsImagePngIsRefusedButTheSaveStillSucceeds() throws Exception {
        String url = "http://public.image:" + port + "/fake.png";
        long baseline = importedAssetCount();

        // The import is refused at save — but the save itself is a 200
        // with the failure in heroImportError (never a broken save).
        String created = saveDraftWithImport("Fake png", url);
        long id = idOf(created);
        assertThat((String) JsonPath.read(created, "$.heroImportError"))
                .contains("readable JPEG, PNG or WebP");

        // The DRAFT is stored with the URL intact for a retry; no asset
        // row was written, no hero.
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(url))
                .andExpect(jsonPath("$.heroImageId").isEmpty());
        // No NEW imported asset row (the diff — see importedAssetCount).
        assertThat(importedAssetCount()).isEqualTo(baseline);

        // Publish is unaffected by the failed import (the red-proof
        // at endpoint level: it used to fail the publish).
        publish(id);
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.heroImageId").isEmpty());
    }

    @Test
    void anOversizedBodyIsRefusedAtTheCapAndAborted() throws Exception {
        String url = "http://public.image:" + port + "/big.png";
        long baseline = importedAssetCount();

        // The 2 KiB cap fires at SAVE: the post is still stored (200),
        // the failure in the body, the URL kept for a retry — not via a
        // timeout.
        String created = saveDraftWithImport("Big png", url);
        long id = idOf(created);
        assertThat((String) JsonPath.read(created, "$.heroImportError")).contains("2048");

        // No asset row exists. (The client-side "nothing buffered past
        // the cap" invariant is proven deterministically in
        // JdkHeroImageFetchClientTest — TCP socket buffering makes the
        // server-side view of the abort racy.)
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(url));
        // No NEW imported asset row (the diff — see importedAssetCount).
        assertThat(importedAssetCount()).isEqualTo(baseline);
    }

    @Test
    void aRedirectTo127001IsRefusedAndNeverFetched() throws Exception {
        secretRequests.set(0);
        String url = "http://public.image:" + port + "/redirect-to-loopback";

        String created = saveDraftWithImport("Redirect loopback", url);
        long id = idOf(created);
        assertThat((String) JsonPath.read(created, "$.heroImportError")).contains("127.0.0.1");

        // The hop target was re-validated BEFORE being fetched: the secret
        // route never saw a request. The post stays a DRAFT.
        Thread.sleep(100);
        assertThat(secretRequests.get())
                .as("the redirect target 127.0.0.1 was never fetched")
                .isZero();
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(url));
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
        String url = "http://public.image:" + port + "/huge-dims.png";
        long baseline = importedAssetCount();

        // A 33-byte file whose header claims 100001 px — refused at the
        // 10000 px per-side cap (the decompression-bomb guard); the save
        // itself still succeeds (200) with the failure in the body.
        String created = saveDraftWithImport("Huge dims", url);
        long id = idOf(created);
        assertThat((String) JsonPath.read(created, "$.heroImportError")).contains("10000");

        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(url))
                .andExpect(jsonPath("$.heroImageId").isEmpty());
        // No NEW imported asset row (the diff — see importedAssetCount).
        assertThat(importedAssetCount()).isEqualTo(baseline);
    }

    @Test
    void aFailedFetchLeavesTheDraftWithAReadableError() throws Exception {
        String url = "http://public.image:" + port + "/missing.png";

        // The 404 upstream surfaces in the save's heroImportError — the
        // draft is stored anyway, the URL kept for a retry.
        String created = saveDraftWithImport("Missing hero", url);
        long id = idOf(created);
        assertThat((String) JsonPath.read(created, "$.heroImportError")).contains("404");

        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.heroImportUrl").value(url));

        // And the publish — a pure stamp — goes through as well.
        publish(id);
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.heroImageId").isEmpty());
    }

    @Test
    void aPublicRedirectHopIsFollowedAndImportedAtSave() throws Exception {
        String url = "http://public.image:" + port + "/redirect-ok";

        // The public hop is followed (and re-validated) at SAVE — the 200
        // body already carries the imported asset.
        String created = saveDraftWithImport("Public hop", url);
        long id = idOf(created);
        assertThat((Object) JsonPath.read(created, "$.heroImportError")).isNull();
        assertThat(((Number) JsonPath.read(created, "$.heroImageId")).longValue()).isPositive();

        publish(id);

        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.heroImageId").isNumber())
                .andExpect(jsonPath("$.heroImportUrl").value(url));
    }

    @Test
    void aPublishedPostTakesAnImportUrlAtSave() throws Exception {
        // Draft without a URL → publish (plain).
        MvcResult created = mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Live post\",\"body\":\"<p>b</p>\"}"
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        long id = idOf(created.getResponse().getContentAsString(StandardCharsets.UTF_8));
        publish(id);

        // A save (PUT) on the LIVE post with a URL imports it AT SAVE —
        // the trigger (the old 400 "unpublish first" is gone).
        mvc.perform(put("/admin/guidance/" + id)
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"Live post\",\"body\":\"<p>b</p>\","
                                + "\"heroImageAlt\":\"alt\",\"heroImportUrl\":\"http://public.image:"
                                + port + "/photo.png\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heroImportError").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.heroImageId").isNumber())
                .andExpect(jsonPath("$.heroImportUrl")
                        .value("http://public.image:" + port + "/photo.png"));
    }

    @Test
    void aChangedUrlReimportsAtSaveAndASameUrlResaveDoesNotRefetch() throws Exception {
        String urlA = "http://public.image:" + port + "/photo.png";

        String created = saveDraftWithImport("Refetch hero", urlA);
        long id = idOf(created);
        long firstAssetId = ((Number) JsonPath.read(created, "$.heroImageId")).longValue();
        assertThat(firstAssetId).isPositive();

        // A CHANGED URL (the public-redirect hop): the import runs again
        // at save, the new asset supersedes the previous hero.
        String urlB = "http://public.image:" + port + "/redirect-ok";
        MvcResult updated = mvc.perform(put("/admin/guidance/" + id)
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"Refetch hero\",\"body\":\"<p>b</p>\","
                                + "\"heroImageAlt\":\"alt\",\"heroImportUrl\":\"" + urlB + "\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        String body = updated.getResponse().getContentAsString(StandardCharsets.UTF_8);
        long secondAssetId = ((Number) JsonPath.read(body, "$.heroImageId")).longValue();
        assertThat(secondAssetId).isNotEqualTo(firstAssetId);
        assertThat((Object) JsonPath.read(body, "$.heroImportUrl")).isEqualTo(urlB);

        // The superseded asset stays in the library (the replace rule).
        // Scoped to this test's own URLs (the class' @AfterAll reclaims
        // the committed imports for the other ITs — see
        // importedAssetCount's javadoc).
        List<Long> assetIds = jdbc.queryForList(
                "SELECT id FROM media_assets WHERE source_url IN (?, ?) ORDER BY id", Long.class,
                urlA, urlB);
        assertThat(assetIds).containsExactlyInAnyOrder(firstAssetId, secondAssetId);
    }
}
