package ee.sheltermap.guidance;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.auth.MutableClock;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.MediaAsset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * MediaService behaviour (crisis-guidance D7/D8/D12) against the in-memory
 * repository fakes and a REAL {@link MediaStorage} on a temp dir (so "no
 * partial file" and "the file is gone" are asserted on disk): the upload
 * validation ORDER (byte count → magic bytes / dimensions → declared
 * type), generated names with the original filename as metadata only,
 * the library listing with the reused-by count, and the deletion rules —
 * unreferenced (row + file + audit), referenced without confirm (409
 * naming the posts, nothing deleted, no audit row) and referenced with
 * confirm (hero id AND alt cleared on every referencing post, the posts
 * still published and served).
 *
 * <p>The REAL static {@link MediaImageInspector} is on the path: fixtures
 * encode real header layouts (PNG signature + IHDR), so a regression in
 * the magic-byte / dimension path shows up here too.
 */
class MediaServiceTest {

    /** A small cap so the 413 test needs no 5 MiB fixture. */
    private static final long MAX_BYTES = 1024;
    private static final long ADMIN_ID = 1L;

    /** Per-test temp directory: several tests assert absolute file counts
     *  (0 after a rejection, 1 after a store), so a shared directory would
     *  carry earlier tests' files into those counts. */
    @TempDir
    Path mediaDir;

    private InMemoryGuidancePostRepository posts;
    private InMemoryMediaAssetRepository media;
    private InMemoryModerationAuditLog audit;
    private MutableClock clock;
    private MediaStorage storage;
    private MediaService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-09-13T08:00:00Z"));
        posts = new InMemoryGuidancePostRepository(clock);
        media = new InMemoryMediaAssetRepository(posts);
        audit = new InMemoryModerationAuditLog(clock);
        storage = new MediaStorage(mediaDir);
        storage.init();
        service = new MediaService(media, posts, storage, audit, clock, MAX_BYTES);
    }

    // ------------------------------------------------------------- helpers

    /** A minimal readable PNG (signature + IHDR) — the inspector's fixture shape. */
    private static byte[] png(int width, int height) {
        byte[] b = new byte[33];
        b[0] = (byte) 0x89; b[1] = 0x50; b[2] = 0x4E; b[3] = 0x47;
        b[4] = 0x0D; b[5] = 0x0A; b[6] = 0x1A; b[7] = 0x0A;
        b[8] = 0; b[9] = 0; b[10] = 0; b[11] = 13; // IHDR chunk length
        b[12] = 'I'; b[13] = 'H'; b[14] = 'D'; b[15] = 'R';
        // IHDR payload: width and height are 32-bit big-endian values (the
        // reader takes four bytes for each), then bit depth and colour type.
        b[16] = (byte) (width >>> 24); b[17] = (byte) (width >>> 16);
        b[18] = (byte) (width >>> 8); b[19] = (byte) width;
        b[20] = (byte) (height >>> 24); b[21] = (byte) (height >>> 16);
        b[22] = (byte) (height >>> 8); b[23] = (byte) height;
        b[24] = 8; // bit depth
        b[25] = 2; // colour type: truecolour
        return b;
    }

    private MediaAsset uploadPng(String originalFilename, int width, int height) {
        return service.upload(ADMIN_ID, png(width, height), "image/png", originalFilename);
    }

    private GuidancePost newPostWithHero(String slug, String title, Long heroId, String alt) {
        GuidancePost post = GuidancePost.draft(slug, title, "<p>body</p>", "en",
                false, heroId, alt, null, ADMIN_ID, clock.instant());
        post.publish(clock.instant());
        return posts.save(post);
    }

    private long countFiles() throws java.io.IOException {
        return Files.list(mediaDir).count();
    }

    // ------------------------------------------------------------- upload (D7)

    @Test
    void uploadStoresTheAssetWithAGeneratedNameAndItsMetadata() throws Exception {
        MediaAsset asset = uploadPng("photo.png", 100, 50);

        assertThat(asset.getStoredFilename()).matches("^[a-f0-9]{32}\\.png$");
        assertThat(asset.getOriginalFilename()).isEqualTo("photo.png");
        assertThat(asset.getContentType()).isEqualTo("image/png");
        assertThat(asset.getWidth()).isEqualTo(100);
        assertThat(asset.getHeight()).isEqualTo(50);
        assertThat(asset.getSizeBytes()).isEqualTo(png(100, 50).length);
        assertThat(asset.getUploadedBy()).isEqualTo(ADMIN_ID);
        assertThat(asset.getCreatedAt()).isEqualTo(clock.instant());
        // The file is really on disk under the generated name.
        assertThat(Files.exists(storage.resolve(asset.getStoredFilename()).orElseThrow())).isTrue();
        assertThat(countFiles()).isEqualTo(1);
    }

    @Test
    void uploadTreatsTheOriginalFilenameAsMetadataOnly() {
        // A path-shaped client filename must never become part of a path —
        // the stored name is the server-generated one.
        MediaAsset asset = uploadPng("../../etc/passwd", 1, 1);

        assertThat(asset.getStoredFilename()).matches("^[a-f0-9]{32}\\.png$");
        assertThat(asset.getStoredFilename()).doesNotContain("passwd").doesNotContain("..");
        assertThat(asset.getOriginalFilename()).isEqualTo("../../etc/passwd");
        assertThat(storage.resolve(asset.getStoredFilename())).isPresent();
    }

    @Test
    void anOversizeUploadIs413BeforeAnythingElseAndLeavesNothingBehind() throws Exception {
        byte[] oversize = png(10, 10);
        byte[] tooBig = new byte[(int) MAX_BYTES + 1];
        System.arraycopy(oversize, 0, tooBig, 0, oversize.length);

        assertThatThrownBy(() -> service.upload(ADMIN_ID, tooBig, "image/png", "big.png"))
                .isInstanceOf(MediaTooLargeException.class)
                .hasMessageContaining(String.valueOf(MAX_BYTES));
        // The cap check fires FIRST: no file written, no row stored.
        assertThat(countFiles()).isZero();
        assertThat(media.findAll()).isEmpty();
    }

    @Test
    void unrecognizedBytesAre400WithNoFileAndNoRow() throws Exception {
        // Text named .jpg: it fails the magic-byte step (D7 step 2).
        assertThatThrownBy(() -> service.upload(ADMIN_ID,
                "This is not an image.\n".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                "image/jpeg", "text.jpg"))
                .isInstanceOf(UnsupportedImageException.class);
        assertThat(countFiles()).isZero();
        assertThat(media.findAll()).isEmpty();
    }

    @Test
    void aDeclaredTypeThatContradictsTheBytesIs400() throws Exception {
        // Real PNG bytes, declared as JPEG (D7 step 3).
        assertThatThrownBy(() -> service.upload(ADMIN_ID, png(1, 1), "image/jpeg", "lying.jpg"))
                .isInstanceOf(UnsupportedImageException.class)
                .hasMessageContaining("image/jpeg");
        assertThat(countFiles()).isZero();
        assertThat(media.findAll()).isEmpty();
    }

    @Test
    void aDeclaredTypeWithParametersOrCaseStillMatches() {
        MediaAsset asset = service.upload(ADMIN_ID, png(1, 1), "IMAGE/PNG; charset=binary", "ok.png");

        assertThat(asset.getContentType()).isEqualTo("image/png");
        assertThat(media.findById(asset.getId())).isPresent();
    }

    // ------------------------------------------------------------- listing (D8)

    @Test
    void theListIsNewestFirstWithTheReusedCounts() {
        MediaAsset first = uploadPng("one.png", 1, 1);
        MediaAsset second = uploadPng("two.png", 2, 2);
        // Same upload instant → the id descending tie-break; one asset
        // referenced by a post, one unused.
        newPostWithHero("post-slug", "Post", first.getId(), "alt");

        List<MediaService.MediaAssetWithUsage> rows = service.list();

        assertThat(rows).extracting(MediaService.MediaAssetWithUsage::asset)
                .extracting(MediaAsset::getId)
                .containsExactly(second.getId(), first.getId());
        Map<Long, Long> counts = new java.util.HashMap<>();
        rows.forEach(r -> counts.put(r.asset().getId(), r.reusedBy()));
        assertThat(counts).containsEntry(second.getId(), 0L).containsEntry(first.getId(), 1L);
    }

    // ------------------------------------------------------------- delete (D8)

    @Test
    void deletingAnUnreferencedAssetDeletesRowAndFileAndRecordsTheAuditRow() throws Exception {
        MediaAsset asset = uploadPng("solo.png", 1, 1);

        service.delete(ADMIN_ID, asset.getId(), false);

        assertThat(media.findById(asset.getId())).isEmpty();
        // resolve() answers the candidate path for any well-formed name, so
        // existence has to be asked of the filesystem itself.
        assertThat(Files.exists(storage.resolve(asset.getStoredFilename()).orElseThrow())).isFalse();
        assertThat(countFiles()).isZero();
        assertThat(audit.rows()).hasSize(1);
        ModerationAuditLog.Row row = audit.rows().get(0);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.MEDIA_DELETE);
        assertThat(row.moderatorId()).isEqualTo(ADMIN_ID);
        assertThat(row.subjectLabel())
                .isEqualTo("Media asset \"solo.png\" (" + asset.getStoredFilename() + ")");
    }

    @Test
    void deletingAnInUseAssetWithoutConfirmIsRefusedAndChangesNothing() {
        MediaAsset asset = uploadPng("shared.png", 1, 1);
        GuidancePost p1 = newPostWithHero("slug-one", "One", asset.getId(), "alt 1");
        GuidancePost p2 = newPostWithHero("slug-two", "Two", asset.getId(), "alt 2");

        MediaAssetInUseException ex = catchThrowableOfType(
                () -> service.delete(ADMIN_ID, asset.getId(), false), MediaAssetInUseException.class);

        // The 409 names the affected posts (title + slug).
        assertThat(ex.affectedPosts())
                .containsExactlyInAnyOrder("One (slug-one)", "Two (slug-two)");
        // Nothing changed: the asset and both posts are untouched.
        assertThat(media.findById(asset.getId())).isPresent();
        assertThat(posts.findById(p1.getId()).orElseThrow().getHeroImageId()).isEqualTo(asset.getId());
        assertThat(posts.findById(p2.getId()).orElseThrow().getHeroImageId()).isEqualTo(asset.getId());
        // A refused deletion writes nothing — no audit row, the file stays on
        // disk (checked against the filesystem: resolve() only answers paths).
        assertThat(audit.rows()).isEmpty();
        assertThat(Files.exists(storage.resolve(asset.getStoredFilename()).orElseThrow())).isTrue();
    }

    @Test
    void aConfirmedInUseDeleteClearsHeroAndAltOnEveryPostAndAudits() throws Exception {
        MediaAsset asset = uploadPng("shared.png", 1, 1);
        GuidancePost p1 = newPostWithHero("slug-one", "One", asset.getId(), "alt 1");
        GuidancePost p2 = newPostWithHero("slug-two", "Two", asset.getId(), "alt 2");

        service.delete(ADMIN_ID, asset.getId(), true);

        assertThat(media.findById(asset.getId())).isEmpty();
        assertThat(Files.exists(storage.resolve(asset.getStoredFilename()).orElseThrow())).isFalse();
        assertThat(countFiles()).isZero();
        for (GuidancePost original : List.of(p1, p2)) {
            GuidancePost cleared = posts.findById(original.getId()).orElseThrow();
            // Both the hero id AND the alt are cleared (D8).
            assertThat(cleared.getHeroImageId()).isNull();
            assertThat(cleared.getHeroImageAlt()).isNull();
            // The post is otherwise untouched: still published, and its
            // public detail still answers (it now renders without an image).
            assertThat(cleared.isPublished()).isTrue();
            assertThat(posts.findPublishedBySlugAndLocale(cleared.getSlug(), "en")).isPresent();
        }
        assertThat(audit.rows()).hasSize(1);
        ModerationAuditLog.Row row = audit.rows().get(0);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.MEDIA_DELETE);
        assertThat(row.subjectLabel())
                .isEqualTo("Media asset \"shared.png\" (" + asset.getStoredFilename() + ")");
    }

    @Test
    void deletingAnUnknownIdIs404AndTouchesNothing() {
        MediaAsset asset = uploadPng("safe.png", 1, 1);

        assertThatThrownBy(() -> service.delete(ADMIN_ID, 999L, true))
                .isInstanceOf(GuidanceNotFoundException.class);

        assertThat(media.findById(asset.getId())).isPresent();
        assertThat(storage.resolve(asset.getStoredFilename())).isPresent();
        assertThat(audit.rows()).isEmpty();
    }
}
