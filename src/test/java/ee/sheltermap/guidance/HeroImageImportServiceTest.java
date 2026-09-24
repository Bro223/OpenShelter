package ee.sheltermap.guidance;

import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.auth.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import static ee.sheltermap.guidance.PngFixtures.png;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The hero-import walk and store (guidance-hero-import) against a scripted
 * {@link HeroImageFetchClient} and a scripted {@link HeroAddressResolver}:
 * the entry validation (guards 1–2), the address policy on the entry AND
 * every redirect target (guard 3 — the "public host redirects to
 * 127.0.0.1" case), the redirect hop cap, the remote 4xx/5xx vocabulary
 * split, the walk budget (guard 5), the store (guards 6–7) and the
 * orphan cleanup. The classifier itself is
 * {@link HeroAddressPolicyTest}'s; the client I/O is
 * {@link JdkHeroImageFetchClientTest}'s.
 */
class HeroImageImportServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final long MAX_BYTES = 5_242_880;

    /** A 1x1-ish readable PNG (signature + IHDR with real dimensions). */
    private static final Map<String, List<InetAddress>> PUBLIC = Map.of(
            "public.example", List.of(addr("93.184.216.34")));
    private static final Map<String, List<InetAddress>> PRIVATE_HOST = Map.of(
            "private.example", List.of(addr("127.0.0.1")),
            "public.example", List.of(addr("93.184.216.34")));
    private static final Map<String, List<InetAddress>> METADATA_HOST = Map.of(
            "meta.example", List.of(addr("169.254.169.254")));

    @TempDir
    Path mediaDir;

    private InMemoryMediaAssetRepository media;
    private InMemoryGuidancePostRepository posts;
    private MediaStorage storage;
    private MutableClock clock;
    /** url -> scripted response; the default is a 200 + PNG. */
    private final Map<String, HeroImageFetchClient.FetchedImage> script = new java.util.HashMap<>();
    private final Map<String, RuntimeException> scriptErrors = new java.util.HashMap<>();
    private final AtomicInteger fetchCount = new AtomicInteger();
    private final List<String> fetchedUrls = new java.util.ArrayList<>();
    private HeroImageImportService service;
    private long nanos;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-09-13T08:00:00Z"));
        posts = new InMemoryGuidancePostRepository(clock);
        media = new InMemoryMediaAssetRepository(posts);
        storage = new MediaStorage(mediaDir);
        storage.init();
        nanos = 0;
        script.clear();
        scriptErrors.clear();
        fetchCount.set(0);
        fetchedUrls.clear();
        service = new HeroImageImportService(
                (url, maxBytes) -> {
                    fetchCount.incrementAndGet();
                    fetchedUrls.add(url);
                    RuntimeException error = scriptErrors.get(url);
                    if (error != null) {
                        throw error;
                    }
                    return script.getOrDefault(url,
                            new HeroImageFetchClient.FetchedImage(200, null, png(100, 50)));
                },
                host -> addressesFor(host),
                storage, media, clock, MAX_BYTES,
                Duration.ofSeconds(10), HeroImageImportService.DEFAULT_MAX_SIDE,
                () -> nanos);
    }

    // ------------------------------------------------------------- helpers

    private static InetAddress addr(String literal) {
        try {
            return InetAddress.getByName(literal);
        } catch (UnknownHostException e) {
            throw new AssertionError(e);
        }
    }

    private static boolean isIpLiteral(String host) {
        String h = host;
        if (h.startsWith("[") && h.endsWith("]")) {
            h = h.substring(1, h.length() - 1);
        }
        if (h.indexOf(':') >= 0) {
            return h.matches("[0-9a-fA-F:]+");
        }
        return h.matches("[0-9]+(\\.[0-9]+){3}");
    }

    private List<InetAddress> addressesFor(String host) {
        if (PRIVATE_HOST.containsKey(host)) {
            return PRIVATE_HOST.get(host);
        }
        if (METADATA_HOST.containsKey(host)) {
            return METADATA_HOST.get(host);
        }
        // An IP literal resolves to itself, like plain DNS — this is what
        // makes the redirect-to-127.0.0.1 case work in the tests below.
        if (isIpLiteral(host)) {
            return List.of(addr(host));
        }
        // default: public
        return List.of(addr("93.184.216.34"));
    }

    private long countFiles() throws java.io.IOException {
        return Files.list(mediaDir).count();
    }

    private static HeroImageFetchClient.FetchedImage redirect(String location) {
        return new HeroImageFetchClient.FetchedImage(302, location, null);
    }

    // ------------------------------------------------------------- entry validation (guards 1–2)

    @Test
    void nonHttpSchemesAreRefusedBeforeAnyIo() {
        for (String url : List.of("file:///etc/passwd", "ftp://public.example/x.png",
                "gopher://public.example/x", "data:image/png;base64,AAAA",
                "javascript:alert(1)", "public.example/x.png")) {
            assertThatThrownBy(() -> service.importHero(ADMIN_ID, url))
                    .isInstanceOf(HeroImportRefusedException.class)
                    .as("url %s", url)
                    .hasMessageContaining("http or https");
        }
        assertThat(fetchCount.get()).isZero();
    }

    @Test
    void credentialsInTheUrlAreRefusedBeforeAnyIo() {
        assertThatThrownBy(() -> service.importHero(ADMIN_ID,
                        "https://user:pass@public.example/photo.png"))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("credentials");
        assertThatThrownBy(() -> service.importHero(ADMIN_ID,
                        "https://justuser@public.example/photo.png"))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("credentials");
        assertThat(fetchCount.get()).isZero();
    }

    @Test
    void aHostResolvingToADisallowedAddressIsRefusedBeforeAnyFetch() {
        // Guard 3: the ENTRY host resolves to loopback — refused before
        // the fetch client is ever called.
        assertThatThrownBy(() -> service.importHero(ADMIN_ID,
                        "https://private.example/secret.png"))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("127.0.0.1")
                .hasMessageContaining("loopback");
        assertThat(fetchCount.get()).isZero();
        assertThat(fetchedUrls).isEmpty();
    }

    @Test
    void aHostResolvingToTheMetadataAddressIsRefused() {
        assertThatThrownBy(() -> service.importHero(ADMIN_ID,
                        "http://meta.example/latest/meta-data/"))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("169.254.169.254");
        assertThat(fetchCount.get()).isZero();
    }

    @Test
    void anUnresolvableHostIsUnreachable() {
        // The default seam answers public for unknown hosts; model a DNS
        // failure with a host the seam throws for.
        HeroImageImportService failingService = new HeroImageImportService(
                (url, maxBytes) -> new HeroImageFetchClient.FetchedImage(200, null, png(1, 1)),
                host -> {
                    throw new UnknownHostException(host);
                },
                storage, media, clock, MAX_BYTES, Duration.ofSeconds(10),
                HeroImageImportService.DEFAULT_MAX_SIDE, () -> nanos);
        assertThatThrownBy(() -> failingService.importHero(ADMIN_ID,
                        "https://public.example/photo.png"))
                .isInstanceOf(HeroImportUnreachableException.class)
                .hasMessageContaining("resolve");
    }

    // ------------------------------------------------------------- redirect walk (guard 3)

    @Test
    void aRedirectToALoopbackHostIsRefusedAndNeverFetched() {
        // THE SSRF case: a PUBLIC entry host (passes the address policy)
        // answers a 302 to 127.0.0.1 — the hop target is re-resolved and
        // re-checked BEFORE it is fetched.
        String entry = "https://public.example/redirect";
        script.put(entry, redirect("http://127.0.0.1:8080/admin/secret"));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, entry))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("127.0.0.1")
                .hasMessageContaining("loopback");
        // Exactly ONE fetch happened (the entry) — the hop target was
        // never fetched.
        assertThat(fetchCount.get()).isEqualTo(1);
        assertThat(fetchedUrls).containsExactly(entry);
    }

    @Test
    void aRedirectToAPrivateHostIsRefusedAndNeverFetched() {
        String entry = "https://public.example/redirect";
        script.put(entry, redirect("http://private.example/internal.png"));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, entry))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("127.0.0.1");
        assertThat(fetchedUrls).containsExactly(entry);
    }

    @Test
    void aRedirectToANonHttpSchemeIsRefusedAndNeverFetched() {
        String entry = "https://public.example/redirect";
        script.put(entry, redirect("ftp://public.example/stolen.png"));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, entry))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("http or https");
        assertThat(fetchedUrls).containsExactly(entry);
    }

    @Test
    void aRedirectTargetWithCredentialsIsRefusedAndNeverFetched() {
        String entry = "https://public.example/redirect";
        script.put(entry, redirect("https://user:pass@public.example/x.png"));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, entry))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("credentials");
        assertThat(fetchedUrls).containsExactly(entry);
    }

    @Test
    void aMalformedRedirectLocationIsRefusedAndNeverFetched() {
        String entry = "https://public.example/redirect";
        script.put(entry, redirect("http://"));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, entry))
                .isInstanceOf(HeroImportRefusedException.class);
        assertThat(fetchedUrls).containsExactly(entry);
    }

    @Test
    void moreThanThreeRedirectsAreRefused() {
        String u1 = "https://public.example/1";
        String u2 = "https://public.example/2";
        String u3 = "https://public.example/3";
        String u4 = "https://public.example/4";
        script.put(u1, redirect(u2));
        script.put(u2, redirect(u3));
        script.put(u3, redirect(u4));
        script.put(u4, redirect("https://public.example/5"));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, u1))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("3 redirects");
        // Entry + 3 hops fetched, the 4th redirect not followed.
        assertThat(fetchCount.get()).isEqualTo(4);
    }

    @Test
    void aPublicHopIsFollowedAndImported() {
        String entry = "https://public.example/short";
        String hop1 = "https://public.example/cdn";
        String finalUrl = "https://public.example/hero.png";
        script.put(entry, redirect(hop1));
        script.put(hop1, redirect(finalUrl));

        MediaAsset asset = service.importHero(ADMIN_ID, entry);

        assertThat(fetchCount.get()).isEqualTo(3);
        assertThat(fetchedUrls).containsExactly(entry, hop1, finalUrl);
        assertThat(asset.getStoredFilename()).matches("^[a-f0-9]{32}\\.png$");
        // Attribution records the ORIGINAL (entry) URL the admin pasted.
        assertThat(asset.getSourceUrl()).isEqualTo(entry);
    }

    // ------------------------------------------------------------- budget (guard 5)

    @Test
    void aWalkOverBudgetIsUnreachable() {
        // A walk that stalls past the 10 s budget between hops. The
        // monotonic clock advances DURING the walk (after the deadline
        // was computed at entry), so the next hop's check trips it.
        String u1 = "https://public.example/1";
        String u2 = "https://public.example/2";
        script.put(u1, redirect(u2));
        script.put(u2, redirect("https://public.example/3"));
        service = new HeroImageImportService(
                (url, maxBytes) -> {
                    fetchCount.incrementAndGet();
                    fetchedUrls.add(url);
                    if (fetchedUrls.size() == 1) {
                        nanos += Duration.ofSeconds(11).toNanos(); // the walk stalls
                    }
                    return script.getOrDefault(url,
                            new HeroImageFetchClient.FetchedImage(200, null, png(100, 50)));
                },
                host -> addressesFor(host),
                storage, media, clock, MAX_BYTES,
                Duration.ofSeconds(10), HeroImageImportService.DEFAULT_MAX_SIDE, () -> nanos);

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, u1))
                .isInstanceOf(HeroImportUnreachableException.class)
                .hasMessageContaining("budget");
        // The second hop was never fetched.
        assertThat(fetchedUrls).containsExactly(u1);
    }

    // ------------------------------------------------------------- status + content (guards 6–7)

    @Test
    void aReadablePngIsStoredWithSniffedTypeDimensionsAndSource() throws Exception {
        MediaAsset asset = service.importHero(ADMIN_ID, "https://public.example/hero.png");

        assertThat(asset.getStoredFilename()).matches("^[a-f0-9]{32}\\.png$");
        assertThat(asset.getContentType()).isEqualTo("image/png");
        assertThat(asset.getWidth()).isEqualTo(100);
        assertThat(asset.getHeight()).isEqualTo(50);
        assertThat(asset.getSizeBytes()).isEqualTo(png(100, 50).length);
        assertThat(asset.getSourceUrl()).isEqualTo("https://public.example/hero.png");
        assertThat(asset.getUploadedBy()).isEqualTo(ADMIN_ID);
        assertThat(countFiles()).isEqualTo(1);
    }

    @Test
    void aRemoteContentTypeLyingHostCannotSpoofTheImage() throws Exception {
        // The fetch client hands over TEXT bytes (a host served a text file
        // with Content-Type: image/png): the SNIFFED bytes decide.
        script.put("https://public.example/fake.png", new HeroImageFetchClient.FetchedImage(
                200, null, "this is not an image".getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, "https://public.example/fake.png"))
                .isInstanceOf(UnsupportedImageException.class);
        assertThat(countFiles()).isZero();
    }

    @Test
    void aRemoteHeaderClaimingGiganticDimensionsIsRefused() throws Exception {
        // Guard 7: a 33-byte file claiming 100001×1 — a decompression
        // bomb in header form.
        script.put("https://public.example/huge.png", new HeroImageFetchClient.FetchedImage(
                200, null, png(100_001, 1)));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, "https://public.example/huge.png"))
                .isInstanceOf(UnsupportedImageException.class)
                .hasMessageContaining("100001");
        assertThat(countFiles()).isZero();
    }

    @Test
    void thePixelCapIsConfigurable() {
        HeroImageImportService strict = new HeroImageImportService(
                (url, maxBytes) -> new HeroImageFetchClient.FetchedImage(200, null, png(5000, 1)),
                host -> List.of(addr("93.184.216.34")),
                storage, media, clock, MAX_BYTES, Duration.ofSeconds(10), 4000, () -> nanos);

        assertThatThrownBy(() -> strict.importHero(ADMIN_ID, "https://public.example/wide.png"))
                .isInstanceOf(UnsupportedImageException.class)
                .hasMessageContaining("4000");
    }

    @Test
    void aRemote4xxIsRefusedAndA5xxIsUnreachable() throws Exception {
        script.put("https://public.example/gone.png",
                new HeroImageFetchClient.FetchedImage(404, null, new byte[0]));
        assertThatThrownBy(() -> service.importHero(ADMIN_ID, "https://public.example/gone.png"))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("404");

        script.put("https://public.example/down.png",
                new HeroImageFetchClient.FetchedImage(503, null, new byte[0]));
        assertThatThrownBy(() -> service.importHero(ADMIN_ID, "https://public.example/down.png"))
                .isInstanceOf(HeroImportUnreachableException.class)
                .hasMessageContaining("503");
        assertThat(countFiles()).isZero();
    }

    @Test
    void anEmptyBodyIsRefused() {
        script.put("https://public.example/empty.png",
                new HeroImageFetchClient.FetchedImage(200, null, new byte[0]));
        assertThatThrownBy(() -> service.importHero(ADMIN_ID, "https://public.example/empty.png"))
                .isInstanceOf(HeroImportRefusedException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void anOverCapBodyPropagatesThe413Vocabulary() throws Exception {
        scriptErrors.put("https://public.example/big.png", new MediaTooLargeException(MAX_BYTES));

        assertThatThrownBy(() -> service.importHero(ADMIN_ID, "https://public.example/big.png"))
                .isInstanceOf(MediaTooLargeException.class)
                .hasMessageContaining(String.valueOf(MAX_BYTES));
        assertThat(countFiles()).isZero();
    }

    // ------------------------------------------------------------- store discipline

    @Test
    void aRowFailureRemovesTheJustWrittenFile() throws Exception {
        // The repository fails on the row insert: the file written moments
        // before must be removed (no orphan, the upload path's discipline).
        InMemoryMediaAssetRepository failingMedia = new InMemoryMediaAssetRepository(posts) {
            @Override
            public MediaAsset save(MediaAsset asset) {
                throw new IllegalStateException("row insert failed");
            }
        };
        HeroImageImportService failingService = new HeroImageImportService(
                (url, maxBytes) -> new HeroImageFetchClient.FetchedImage(200, null, png(10, 10)),
                host -> List.of(addr("93.184.216.34")),
                storage, failingMedia, clock, MAX_BYTES, Duration.ofSeconds(10),
                HeroImageImportService.DEFAULT_MAX_SIDE, () -> nanos);

        assertThatThrownBy(() -> failingService.importHero(ADMIN_ID, "https://public.example/x.png"))
                .isInstanceOf(IllegalStateException.class);
        assertThat(countFiles())
                .as("a failed import leaves no orphan file")
                .isZero();
    }

    // ------------------------------------------------------------- derivatives

    /** A REAL decodable PNG (ImageIO-encoded gradient) — the header-only
     *  {@link #png} fixture is inspector-readable but undecodable. */
    private static byte[] realPng(int width, int height) throws java.io.IOException {
        java.awt.image.BufferedImage img =
                new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                img.setRGB(x, y, (x * 255 / Math.max(1, width - 1) << 16)
                        | (y * 255 / Math.max(1, height - 1) << 8) | 128);
            }
        }
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        if (!javax.imageio.ImageIO.write(img, "png", out)) {
            throw new java.io.IOException("no PNG writer on this JDK");
        }
        return out.toByteArray();
    }

    @Test
    void anImportStoresTheDerivativesBesideTheOriginal() throws Exception {
        // A decodable 300×150 original: the renderable widths (96, 192)
        // join the original beside it; 480/800 would upscale.
        script.put("https://public.example/real.png", new HeroImageFetchClient.FetchedImage(
                200, null, realPng(300, 150)));

        MediaAsset asset = service.importHero(ADMIN_ID, "https://public.example/real.png");

        String stem = asset.getStoredFilename().substring(0, 32);
        assertThat(Files.exists(storage.resolve(asset.getStoredFilename()).orElseThrow())).isTrue();
        assertThat(Files.exists(storage.resolve(stem + "-t96.png").orElseThrow())).isTrue();
        assertThat(Files.exists(storage.resolve(stem + "-t192.png").orElseThrow())).isTrue();
        assertThat(Files.exists(storage.resolve(stem + "-t480.png").orElseThrow())).isFalse();
        assertThat(countFiles()).isEqualTo(3);
    }

    @Test
    void aDerivativeThatFailsValidationRefusesTheImportLeavingNothingBehind() throws Exception {
        // THE acceptance rule, pinned at the seam: a derivative that
        // fails the content gate fails the import — the publish transaction
        // rolls back and the post stays a DRAFT (the existing failure
        // behaviour), and nothing is left on disk.
        HeroImageImportService gateFailing = new HeroImageImportService(
                (url, maxBytes) -> new HeroImageFetchClient.FetchedImage(200, null, png(100, 50)),
                host -> List.of(addr("93.184.216.34")),
                storage, media, clock, MAX_BYTES, Duration.ofSeconds(10),
                HeroImageImportService.DEFAULT_MAX_SIDE, () -> nanos) {
            @Override
            List<MediaDerivatives.RenderedDerivative> renderDerivativesStrict(
                    MediaImageInspector.ImageInfo info, byte[] bytes) {
                throw new UnsupportedImageException("simulated gate failure");
            }
        };

        assertThatThrownBy(() ->
                gateFailing.importHero(ADMIN_ID, "https://public.example/hero.png"))
                .isInstanceOf(UnsupportedImageException.class);
        assertThat(countFiles()).isZero();
        assertThat(media.findAll()).isEmpty();
    }

    @Test
    void anUndecodableImportedImageIsStoredWithoutDerivatives() throws Exception {
        // The default fixture is header-only: the inspector reads it,
        // ImageIO cannot decode it — the import stores the original and
        // skips the derivatives (the pre-behaviour, unchanged).
        MediaAsset asset = service.importHero(ADMIN_ID, "https://public.example/hero.png");

        assertThat(asset.getStoredFilename()).matches("^[a-f0-9]{32}\\.png$");
        assertThat(countFiles()).isEqualTo(1);
    }
}
