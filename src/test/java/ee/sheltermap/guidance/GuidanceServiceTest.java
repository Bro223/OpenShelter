package ee.sheltermap.guidance;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.auth.MutableClock;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.domain.PublicGuidanceView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * GuidanceService behaviour (crisis-guidance D3/D4/D5/D6/D11/D12) against
 * the in-memory repository fakes: draft invisibility, the publish /
 * unpublish / delete lifecycle (a no-op writes NO audit row), the pinned-
 * first public ordering with same-instant tie-breaks, slug transliteration /
 * collision / suffix / 409, the hero+alt pairing (400s) and the replace-
 * keeps-the-old-asset rule, and the D12 audit rows (actor + label snapshot).
 *
 * <p>The REAL {@link BodySanitizer} (static, dependency-free in tests) is
 * on the path: the service contract under test is "the stored body is the
 * sanitizer's OUTPUT" — the sanitizer's own allowlist behaviour is
 * {@code BodySanitizerTest}'s to specify.
 */
class GuidanceServiceTest {

    private static final long ADMIN_ID = 1L;

    private InMemoryGuidancePostRepository posts;
    private InMemoryGuidanceTranslationRepository translations;
    private InMemoryMediaAssetRepository media;
    private InMemoryModerationAuditLog audit;
    private MutableClock clock;
    private MediaStorage storage;
    /**
     * The seam behind the REAL {@link HeroImageImportService}: every test
     * decides what the fetch "sees" (a 200 + PNG bytes, a thrown
     * unreachable, ...) — the walk/policy/store logic on this side is the
     * production code.
     */
    private final AtomicReference<HeroImageFetchClient> fetch = new AtomicReference<>();
    private HeroImageImportService importService;
    private GuidanceService service;

    @TempDir
    Path mediaDir;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-09-13T08:00:00Z"));
        posts = new InMemoryGuidancePostRepository(clock);
        translations = new InMemoryGuidanceTranslationRepository(clock, posts);
        media = new InMemoryMediaAssetRepository(posts);
        audit = new InMemoryModerationAuditLog(clock);
        storage = new MediaStorage(mediaDir);
        storage.init();
        fetch.set(refusingClient());
        importService = new HeroImageImportService(
                (url, maxBytes) -> fetch.get().fetch(url, maxBytes),
                host -> publicAddresses(), storage, media, clock,
                5242880L, Duration.ofSeconds(10), 10000, System::nanoTime);
        service = new GuidanceService(posts, media, audit, clock, "en", importService, translations);
    }

    // ------------------------------------------------------------- helpers

    /** The seam's default: every fetch fails (unreachable). */
    private static HeroImageFetchClient refusingClient() {
        return (url, maxBytes) -> {
            throw new HeroImportUnreachableException("stub: " + url + " is unreachable");
        };
    }

    private static HeroImageFetchClient servingPngClient() {
        return (url, maxBytes) -> new HeroImageFetchClient.FetchedImage(200, null, png(100, 50));
    }

    /** The fake resolver answers one public address for every host (no DNS). */
    private static List<InetAddress> publicAddresses() throws UnknownHostException {
        return List.of(InetAddress.getByName("93.184.216.34"));
    }

    /** A minimal readable PNG (signature + IHDR) — the inspector's fixture shape. */
    private static byte[] png(int width, int height) {
        byte[] b = new byte[33];
        b[0] = (byte) 0x89; b[1] = 0x50; b[2] = 0x4E; b[3] = 0x47;
        b[4] = 0x0D; b[5] = 0x0A; b[6] = 0x1A; b[7] = 0x0A;
        b[8] = 0; b[9] = 0; b[10] = 0; b[11] = 13; // IHDR chunk length
        b[12] = 'I'; b[13] = 'H'; b[14] = 'D'; b[15] = 'R';
        b[16] = (byte) (width >>> 24); b[17] = (byte) (width >>> 16);
        b[18] = (byte) (width >>> 8); b[19] = (byte) width;
        b[20] = (byte) (height >>> 24); b[21] = (byte) (height >>> 16);
        b[22] = (byte) (height >>> 8); b[23] = (byte) height;
        b[24] = 8; // bit depth
        b[25] = 2; // colour type: truecolour
        return b;
    }

    private GuidancePost createDraft(String title) {
        return service.create(ADMIN_ID, title, null, "<p>body</p>", null, false, null, null, null, null);
    }

    private GuidancePost createDraft(String title, String locale) {
        return service.create(ADMIN_ID, title, null, "<p>body</p>", locale, false, null, null, null, null);
    }

    private GuidancePost createAndPublish(String title, String locale) {
        GuidancePost post = createDraft(title, locale);
        service.publish(ADMIN_ID, post.getId());
        return post;
    }

    private MediaAsset newAsset(String storedFilename) {
        return media.save(MediaAsset.create(storedFilename, "photo.png", "image/png",
                100, 50, 1234L, ADMIN_ID, clock.instant()));
    }

    private static String slug32(String hex) {
        return (hex + "00000000000000000000000000000000").substring(0, 32) + ".png";
    }

    // ------------------------------------------------------------- create

    @Test
    void createStoresADraftInvisibleToThePublicSurface() {
        GuidancePost post = createDraft("Varjumine droonirünnaku ajal");

        assertThat(post.getStatus()).isEqualTo(GuidanceStatus.DRAFT);
        assertThat(post.getSlug()).isEqualTo("varjumine-droonirunnaku-ajal");
        assertThat(post.getPublishedAt()).isNull();
        assertThat(post.getCreatedBy()).isEqualTo(ADMIN_ID);
        // Draft invisibility: absent from the public index, its slug is a
        // 404, and it IS listed by the admin.
        assertThat(service.listPublic(null)).isEmpty();
        assertThatThrownBy(() -> service.getByPublicSlug(post.getSlug(), null))
                .isInstanceOf(GuidanceNotFoundException.class)
                .hasMessage(GuidanceService.POST_NOT_FOUND_MESSAGE);
        assertThat(service.listForAdmin())
                .extracting(GuidancePost::getId)
                .containsExactly(post.getId());
    }

    @Test
    void createWithExplicitPublishedStampsFromTheClock() {
        Instant now = clock.instant();

        GuidancePost post = service.create(ADMIN_ID, "First", null, "<p>b</p>",
                null, false, null, null, null, GuidanceStatus.PUBLISHED);

        assertThat(post.isPublished()).isTrue();
        assertThat(post.getPublishedAt()).isEqualTo(now);
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId).containsExactly(post.getId());
        assertThat(service.getByPublicSlug(post.getSlug(), null).getId()).isEqualTo(post.getId());
    }

    @Test
    void createStoresTheSanitizedBody() {
        String hostile = "<p>ok</p><script>alert(1)</script>";

        GuidancePost post = service.create(ADMIN_ID, "T", null, hostile,
                null, false, null, null, null, null);

        // The stored value is the sanitizer OUTPUT, not the raw input (D2):
        // exactly what the sanitizer answers for the input, no script left.
        assertThat(post.getBodyHtml()).isEqualTo(BodySanitizer.sanitize(hostile));
        assertThat(post.getBodyHtml()).doesNotContain("script").contains("ok");
        assertThat(posts.findBySlug(post.getSlug()).orElseThrow().getBodyHtml())
                .isEqualTo(BodySanitizer.sanitize(hostile));
    }

    @Test
    void localeDefaultsFromTheConfiguredPrimaryLanguage() {
        assertThat(service.create(ADMIN_ID, "D", null, "<p>b</p>", null, false, null, null, null, null)
                .getLocale()).isEqualTo("en");
        assertThat(service.create(ADMIN_ID, "E", null, "<p>b</p>", "et", false, null, null, null, null)
                .getLocale()).isEqualTo("et");
    }

    @Test
    void missingTitleOrBodyAreRefusedAndNothingIsStored() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, null, null, "<p>b</p>", null, false, null, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "   ", null, "<p>b</p>", null, false, null, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "T", null, null, null, false, null, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "T", null, "   ", null, false, null, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "x".repeat(GuidanceService.MAX_TITLE_LENGTH + 1),
                null, "<p>b</p>", null, false, null, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    // ------------------------------------------------------------- update

    @Test
    void updateIsAFullReplaceReSanitizesAndKeepsTheSlugWhenOmitted() {
        GuidancePost post = createDraft("Old Title");
        clock.advance(Duration.ofMinutes(5));
        String hostile = "<p>new</p><script>x</script>";

        GuidancePost updated = service.update(post.getId(), "New Title", null,
                hostile, null, true, null, null, null);

        assertThat(updated.getSlug()).isEqualTo(post.getSlug());
        assertThat(updated.getTitle()).isEqualTo("New Title");
        assertThat(updated.getBodyHtml()).isEqualTo(BodySanitizer.sanitize(hostile));
        assertThat(updated.getBodyHtml()).doesNotContain("script").contains("new");
        assertThat(updated.isPinned()).isTrue();
        assertThat(updated.getLocale()).isEqualTo("en");
        assertThat(updated.getUpdatedAt()).isEqualTo(clock.instant());
        assertThat(updated.getUpdatedAt()).isAfter(post.getCreatedAt());
        // Publication state is NOT editable through update (D4: the
        // publish/unpublish stamps own it).
        assertThat(updated.isPublished()).isFalse();
    }

    @Test
    void updateCanKeepItsOwnSlugAndRefusesAForeignCollision() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");

        // Its own slug is a no-op, not a collision.
        service.update(a.getId(), "A", a.getSlug(), "<p>b</p>", null, false, null, null, null);
        assertThat(posts.findById(a.getId()).orElseThrow().getSlug()).isEqualTo(a.getSlug());

        // Another post's slug → 409 naming it, nothing changed.
        assertThatThrownBy(() -> service.update(b.getId(), "B", a.getSlug(), "<p>b</p>",
                null, false, null, null, null))
                .isInstanceOf(SlugAlreadyUsedException.class)
                .hasMessageContaining(a.getSlug());
        assertThat(posts.findById(b.getId()).orElseThrow().getSlug()).isEqualTo(b.getSlug());
    }

    // ------------------------------------------------------------- lifecycle

    @Test
    void publishStampsFromTheClockAndIsIdempotentWithoutAuditOnNoop() {
        GuidancePost post = createDraft("T");
        Instant t0 = clock.instant();

        service.publish(ADMIN_ID, post.getId());

        GuidancePost published = posts.findById(post.getId()).orElseThrow();
        assertThat(published.isPublished()).isTrue();
        assertThat(published.getPublishedAt()).isEqualTo(t0);
        assertThat(audit.rows()).hasSize(1);
        assertLabeledRow(audit.rows().get(0), ModerationAuditLog.Action.GUIDANCE_PUBLISH,
                "Guidance post \"T\" (" + post.getSlug() + ")");

        // A second publish is a no-op: no second audit row, stamp untouched.
        clock.advance(Duration.ofHours(1));
        service.publish(ADMIN_ID, post.getId());
        assertThat(posts.findById(post.getId()).orElseThrow().getPublishedAt()).isEqualTo(t0);
        assertThat(audit.rows()).hasSize(1);
    }

    @Test
    void unpublishClearsTheStampIsIdempotentWithoutAuditOnNoopAndHidesThePost() {
        GuidancePost post = createDraft("T");
        service.publish(ADMIN_ID, post.getId());
        clock.advance(Duration.ofHours(1));

        service.unpublish(ADMIN_ID, post.getId());

        GuidancePost draft = posts.findById(post.getId()).orElseThrow();
        assertThat(draft.isPublished()).isFalse();
        assertThat(draft.getPublishedAt()).isNull();
        assertThat(service.listPublic(null)).isEmpty();
        assertThatThrownBy(() -> service.getByPublicSlug(post.getSlug(), null))
                .isInstanceOf(GuidanceNotFoundException.class);
        assertThat(audit.rows()).hasSize(2);
        assertLabeledRow(audit.rows().get(1), ModerationAuditLog.Action.GUIDANCE_UNPUBLISH,
                "Guidance post \"T\" (" + post.getSlug() + ")");

        // Unpublishing a draft is a no-op: no third row.
        service.unpublish(ADMIN_ID, post.getId());
        assertThat(audit.rows()).hasSize(2);
    }

    @Test
    void republishStampsAFreshInstant() {
        GuidancePost post = createDraft("T");
        service.publish(ADMIN_ID, post.getId());
        Instant first = posts.findById(post.getId()).orElseThrow().getPublishedAt();
        clock.advance(Duration.ofDays(2));

        service.unpublish(ADMIN_ID, post.getId());
        service.publish(ADMIN_ID, post.getId());

        assertThat(posts.findById(post.getId()).orElseThrow().getPublishedAt()).isAfter(first);
    }

    @Test
    void deleteWithoutConfirmIsRefusedAndChangesNothing() {
        GuidancePost post = createDraft("Keep me");

        assertThatThrownBy(() -> service.delete(ADMIN_ID, post.getId(), false))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("confirm");
        assertThat(posts.findById(post.getId())).isPresent();
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void confirmedDeleteRemovesThePostAndRecordsTheAuditRow() {
        GuidancePost post = createDraft("Bye");

        service.delete(ADMIN_ID, post.getId(), true);

        assertThat(posts.findById(post.getId())).isEmpty();
        assertThat(service.listForAdmin()).isEmpty();
        assertThat(service.listPublic(null)).isEmpty();
        assertThat(audit.rows()).hasSize(1);
        assertLabeledRow(audit.rows().get(0), ModerationAuditLog.Action.GUIDANCE_DELETE,
                "Guidance post \"Bye\" (" + post.getSlug() + ")");
    }

    @Test
    void unknownIdsAre404() {
        for (Runnable op : List.<Runnable>of(
                () -> service.getById(999L),
                () -> service.publish(ADMIN_ID, 999L),
                () -> service.unpublish(ADMIN_ID, 999L),
                () -> service.delete(ADMIN_ID, 999L, true),
                () -> service.update(999L, "T", null, "<p>b</p>", null, false, null, null, null))) {
            assertThatThrownBy(op::run).isInstanceOf(GuidanceNotFoundException.class);
        }
    }

    // ------------------------------------------------------------- ordering (D6)

    @Test
    void publicListIsPinnedFirstThenSortOrderAscThenTieBreakers() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        GuidancePost c = createDraft("C");
        service.publish(ADMIN_ID, a.getId());
        service.publish(ADMIN_ID, b.getId());
        service.publish(ADMIN_ID, c.getId());

        // Same publication instant, distinct sortOrder: the STORED MANUAL
        // order decides (sortOrder ascending) — the id/publishedAt
        // tie-breakers only kick in on equal sortOrder values.
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(a.getId(), b.getId(), c.getId());

        // Pinning the LARGEST sortOrder floats it to the top — the pinned
        // head block sits above every non-pinned post regardless of value.
        service.reorder(ADMIN_ID, List.of(b.getId(), c.getId(), a.getId()));
        service.update(a.getId(), "A", null, "<p>b</p>", null, true, null, null, null);
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(a.getId(), b.getId(), c.getId());

        // A newer post APPENDS at the end of the manual order (D4): it does
        // NOT float to the top of the non-pinned block by its timestamp.
        clock.advance(Duration.ofHours(1));
        GuidancePost d = service.create(ADMIN_ID, "D", null, "<p>b</p>",
                null, false, null, null, null, GuidanceStatus.PUBLISHED);
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(a.getId(), b.getId(), c.getId(), d.getId());
    }

    @Test
    void adminListIsInStoredManualOrder() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        clock.advance(Duration.ofMinutes(10));

        service.reorder(ADMIN_ID, List.of(b.getId(), a.getId()));

        // The newest-updated post is 'b' after the reorder save — but the
        // admin list is the LIVE PREVIEW of the public order (sortOrder
        // ascending), not the newest-updated order.
        clock.advance(Duration.ofMinutes(10));
        service.update(a.getId(), "A edited", null, "<p>b</p>", null, false, null, null, null);
        assertThat(service.listForAdmin()).extracting(GuidancePost::getId)
                .containsExactly(b.getId(), a.getId());
    }

    // --------------------------------------------- manual order (guidance-manual-order)

    @Test
    void aNewDraftAppendsAtTheEndOfTheManualOrder() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        GuidancePost c = createDraft("C");

        // max(sortOrder) + 1 — the new draft sits at the bottom of the
        // admin list (its starting position, not a lock).
        assertThat(c.getSortOrder()).isGreaterThan(b.getSortOrder());
        assertThat(service.listForAdmin()).extracting(GuidancePost::getId)
                .containsExactly(a.getId(), b.getId(), c.getId());
    }

    @Test
    void aCreateAndPublishLandsAtTheEndOfTheNonPinnedBlock() {
        GuidancePost a = createAndPublish("A", null);
        GuidancePost b = createAndPublish("B", null);
        service.update(a.getId(), "A", null, "<p>b</p>", null, true, null, null, null); // pin a

        GuidancePost c = service.create(ADMIN_ID, "C", null, "<p>b</p>",
                null, false, null, null, null, GuidanceStatus.PUBLISHED);

        // Below the pinned post, at the END of the non-pinned block.
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(a.getId(), b.getId(), c.getId());
    }

    @Test
    void publishingNeverMovesAPost() {
        GuidancePost a = createAndPublish("A", null);
        GuidancePost b = createAndPublish("B", null);
        GuidancePost c = createAndPublish("C", null);

        // Unpublish the middle post and re-publish it with a FRESH stamp —
        // under the old timestamp-driven order it would re-enter at the top
        // of the non-pinned block; under the manual order its slot is its
        // sortOrder.
        clock.advance(Duration.ofHours(1));
        service.unpublish(ADMIN_ID, b.getId());
        service.publish(ADMIN_ID, b.getId());

        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(a.getId(), b.getId(), c.getId());
    }

    @Test
    void aDraftsSlotIsRespectedWhenItIsPublished() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");

        // Move the draft to the FIRST manual position, then publish it.
        service.reorder(ADMIN_ID, List.of(b.getId(), a.getId()));
        service.publish(ADMIN_ID, b.getId());

        // It enters the public index at its manual position — the
        // publication stamp did not move it.
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(b.getId());
        service.publish(ADMIN_ID, a.getId());
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(b.getId(), a.getId());
    }

    @Test
    void reorderRenamesEveryPostToOneThroughNAndThePublicOrderFollows() {
        GuidancePost a = createAndPublish("A", null);
        GuidancePost b = createAndPublish("B", null);
        GuidancePost c = createAndPublish("C", null);
        GuidancePost d = createAndPublish("D", null);

        service.reorder(ADMIN_ID, List.of(c.getId(), a.getId(), d.getId(), b.getId()));

        // Dense 1..N in the submitted order.
        assertThat(service.getById(c.getId()).getSortOrder()).isEqualTo(1);
        assertThat(service.getById(a.getId()).getSortOrder()).isEqualTo(2);
        assertThat(service.getById(d.getId()).getSortOrder()).isEqualTo(3);
        assertThat(service.getById(b.getId()).getSortOrder()).isEqualTo(4);
        // The public index follows the renumber.
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(c.getId(), a.getId(), d.getId(), b.getId());
        // And so does the admin list (drafts and published alike).
        assertThat(service.listForAdmin()).extracting(GuidancePost::getId)
                .containsExactly(c.getId(), a.getId(), d.getId(), b.getId());
    }

    @Test
    void resubmittingTheCurrentOrderIsANoopWithoutAnAuditRow() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        // A CHANGING reorder first (the current order is [a, b]).
        List<Long> order = List.of(b.getId(), a.getId());

        service.reorder(ADMIN_ID, order);
        int rowsAfterFirst = audit.rows().size();
        assertThat(audit.rows()).extracting(ModerationAuditLog.Row::action)
                .containsExactly(ModerationAuditLog.Action.GUIDANCE_REORDER);

        // The identical order again: no value changes, NO second audit row.
        int beforeA = a.getSortOrder();
        int beforeB = b.getSortOrder();
        service.reorder(ADMIN_ID, order);

        assertThat(a.getSortOrder()).isEqualTo(beforeA);
        assertThat(b.getSortOrder()).isEqualTo(beforeB);
        assertThat(audit.rows()).hasSize(rowsAfterFirst);
    }

    @Test
    void reorderRejectsAnUnknownIdAndChangesNothing() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        int beforeA = a.getSortOrder();
        int beforeB = b.getSortOrder();

        assertThatThrownBy(() -> service.reorder(ADMIN_ID, List.of(a.getId(), b.getId(), 999L)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("999");

        assertThat(a.getSortOrder()).isEqualTo(beforeA);
        assertThat(b.getSortOrder()).isEqualTo(beforeB);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void reorderRejectsADuplicateIdAndChangesNothing() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        int beforeA = a.getSortOrder();
        int beforeB = b.getSortOrder();

        assertThatThrownBy(() -> service.reorder(ADMIN_ID, List.of(a.getId(), b.getId(), a.getId())))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining(String.valueOf(a.getId()));

        assertThat(a.getSortOrder()).isEqualTo(beforeA);
        assertThat(b.getSortOrder()).isEqualTo(beforeB);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void reorderRejectsAStaleListMissingACurrentPostAndChangesNothing() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        // A post is created while the admin's table is open — the stale
        // list (missing 'c') is refused, forcing a refresh.
        GuidancePost c = createDraft("C");
        int beforeA = a.getSortOrder();
        int beforeB = b.getSortOrder();
        int beforeC = c.getSortOrder();

        assertThatThrownBy(() -> service.reorder(ADMIN_ID, List.of(a.getId(), b.getId())))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("stale");

        assertThat(a.getSortOrder()).isEqualTo(beforeA);
        assertThat(b.getSortOrder()).isEqualTo(beforeB);
        // The new post keeps its appended position.
        assertThat(c.getSortOrder()).isEqualTo(beforeC);
        assertThat(service.listForAdmin()).extracting(GuidancePost::getId)
                .containsExactly(a.getId(), b.getId(), c.getId());
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void reorderWithAnEmptyListIsRefusedWhilePostsExist() {
        createDraft("A");
        assertThatThrownBy(() -> service.reorder(ADMIN_ID, List.of()))
                .isInstanceOf(GuidanceValidationException.class);
    }

    @Test
    void reorderWithAnEmptyListAndNoPostsIsANoop() {
        service.reorder(ADMIN_ID, List.of()); // no posts: the empty list IS the order
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aChangingReorderWritesExactlyOneGuidanceReorderRow() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");

        service.reorder(ADMIN_ID, List.of(b.getId(), a.getId()));

        assertThat(audit.rows()).hasSize(1);
        assertLabeledRow(audit.rows().get(0), ModerationAuditLog.Action.GUIDANCE_REORDER,
                "Guidance post order");
    }

    @Test
    void equalSortOrderRowsTieBreakOnPublishedAtThenIdDescending() {
        GuidancePost a = createAndPublish("A", null);
        clock.advance(Duration.ofMinutes(5));
        GuidancePost b = createAndPublish("B", null);

        // Force the prevented-in-practice state the tie-breakers exist for:
        // two published posts carrying the SAME sortOrder — the newer-
        // published one leads.
        a.setSortOrder(1);
        posts.save(a);
        b.setSortOrder(1);
        posts.save(b);
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactly(b.getId(), a.getId());

        // …and rows sharing publishedAt AS WELL order by id descending.
        // C and D are created at the SAME frozen clock instant (the service
        // stamps from the injected Clock) and are forced onto one shared
        // sortOrder; 'b' is pushed off the shared value.
        GuidancePost c = service.create(ADMIN_ID, "C", null, "<p>b</p>",
                null, false, null, null, null, GuidanceStatus.PUBLISHED);
        GuidancePost d = service.create(ADMIN_ID, "D", null, "<p>b</p>",
                null, false, null, null, null, GuidanceStatus.PUBLISHED);
        assertThat(c.getPublishedAt()).isEqualTo(d.getPublishedAt());
        c.setSortOrder(9);
        posts.save(c);
        d.setSortOrder(9);
        posts.save(d);
        b.setSortOrder(2);
        posts.save(b);

        List<Long> order = service.listPublic(null).stream()
                .map(PublicGuidanceView::getId).toList();
        // Within the shared sortOrder + shared stamp: id descending (d, then c).
        assertThat(order).containsSequence(d.getId(), c.getId());
        // Repeated calls return the same order (the stable-order discipline).
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getId)
                .containsExactlyElementsOf(order);
    }

    // ------------------------------------------------------------- slugs (D5)

    @Test
    void generatedSlugTransliteratesEstonianTitles() {
        assertThat(SlugFactory.of("Varjumine droonirünnaku ajal"))
                .isEqualTo("varjumine-droonirunnaku-ajal");
        assertThat(SlugFactory.of("Õhk-häire: mida teha?")).isEqualTo("ohk-haire-mida-teha");
        assertThat(SlugFactory.of("Ääretu õhtu")).isEqualTo("aaretu-ohtu");
        // A symbol-only title still gets a URL (the fixed fallback).
        assertThat(SlugFactory.of("!!!")).isEqualTo("post");
    }

    @Test
    void generatedSlugIsBoundedToTheColumnWidth() {
        assertThat(SlugFactory.of("a".repeat(300))).hasSize(SlugFactory.MAX_SLUG_LENGTH);
        String spaced = "x-".repeat(150); // 300 characters
        assertThat(SlugFactory.of(spaced)).hasSizeLessThanOrEqualTo(SlugFactory.MAX_SLUG_LENGTH);
        // The generator's output is always a valid custom slug.
        assertThat(SlugFactory.isValidCustomSlug(SlugFactory.of(spaced))).isTrue();
    }

    @Test
    void generatedCollisionsTakeNumericSuffixesAndDraftsReserveTheirSlugs() {
        GuidancePost first = createDraft("Same Title");
        GuidancePost second = createDraft("Same Title");
        GuidancePost third = createDraft("Same Title");

        // All three are DRAFTS — a draft reserves its slug (never reused).
        assertThat(first.getSlug()).isEqualTo("same-title");
        assertThat(second.getSlug()).isEqualTo("same-title-2");
        assertThat(third.getSlug()).isEqualTo("same-title-3");
    }

    @Test
    void anAdminSuppliedCollisionIsRefusedNamingTheSlug() {
        createDraft("Taken");

        assertThatThrownBy(() -> service.create(ADMIN_ID, "Other", "taken", "<p>b</p>",
                null, false, null, null, null, null))
                .isInstanceOf(SlugAlreadyUsedException.class)
                .hasMessageContaining("taken");
        // Neither post is changed — the refused create stored nothing.
        assertThat(posts.findAllForAdmin()).hasSize(1);
    }

    @Test
    void invalidAdminSuppliedSlugsAreRefused() {
        for (String bad : List.of("UPPER", "has space", "-lead", "trail-",
                "double--dash", "a".repeat(SlugFactory.MAX_SLUG_LENGTH + 1))) {
            assertThatThrownBy(() -> service.create(ADMIN_ID, "T", bad, "<p>b</p>",
                    null, false, null, null, null, null))
                    .isInstanceOf(GuidanceValidationException.class)
                    .as("slug %s", bad);
            assertThat(posts.findAllForAdmin()).isEmpty();
        }
        // The validator itself: the generated shape, length 1..200.
        assertThat(SlugFactory.isValidCustomSlug("abc")).isTrue();
        assertThat(SlugFactory.isValidCustomSlug("abc-123")).isTrue();
        assertThat(SlugFactory.isValidCustomSlug("a".repeat(SlugFactory.MAX_SLUG_LENGTH))).isTrue();
        assertThat(SlugFactory.isValidCustomSlug(null)).isFalse();
        assertThat(SlugFactory.isValidCustomSlug("")).isFalse();
        assertThat(SlugFactory.isValidCustomSlug("-a")).isFalse();
        assertThat(SlugFactory.isValidCustomSlug("a-")).isFalse();
        assertThat(SlugFactory.isValidCustomSlug("a--b")).isFalse();
        assertThat(SlugFactory.isValidCustomSlug("A")).isFalse();
        assertThat(SlugFactory.isValidCustomSlug("a".repeat(SlugFactory.MAX_SLUG_LENGTH + 1))).isFalse();
    }

    // ------------------------------------------------------------- hero (D1/D8/D10)

    @Test
    void aPostWithoutAHeroCarriesNullHeroFields() {
        GuidancePost post = service.create(ADMIN_ID, "No hero", null, "<p>b</p>",
                null, false, null, null, null, GuidanceStatus.PUBLISHED);

        assertThat(post.getHeroImageId()).isNull();
        assertThat(post.getHeroImageAlt()).isNull();
        // Still fully renderable (200 on its slug).
        assertThat(service.getByPublicSlug(post.getSlug(), null).getId()).isEqualTo(post.getId());
    }

    @Test
    void settingAHeroWithoutAltIsRefusedAndNothingIsStored() {
        MediaAsset asset = newAsset(slug32("a"));

        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, asset.getId(), null, null, null))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("heroImageAlt");
        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, asset.getId(), "   ", null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    @Test
    void anAltWithoutAHeroIsRefused() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, "A", null, "<p>b</p>",
                null, false, null, "an alt", null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    @Test
    void aHeroIdWithoutAnAssetIs404() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, 999L, "an alt", null, null))
                .isInstanceOf(GuidanceNotFoundException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    @Test
    void replacingTheHeroKeepsTheOldAssetAndDropsItsCount() {
        MediaAsset oldAsset = newAsset(slug32("a"));
        MediaAsset fresh = newAsset(slug32("b"));
        GuidancePost post = service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, oldAsset.getId(), "old alt", null, null);
        assertThat(media.referencedCountsByAssetId()).containsEntry(oldAsset.getId(), 1L);

        service.update(post.getId(), "H", null, "<p>b</p>", null, false, fresh.getId(), "new alt", null);

        assertThat(posts.findById(post.getId()).orElseThrow().getHeroImageId()).isEqualTo(fresh.getId());
        Map<Long, Long> counts = media.referencedCountsByAssetId();
        assertThat(counts.getOrDefault(oldAsset.getId(), 0L)).isZero();
        assertThat(counts).containsEntry(fresh.getId(), 1L);
        // The replaced asset stays in the library (replaced, not deleted).
        assertThat(media.findById(oldAsset.getId())).isPresent();
    }

    // ------------------------------------------------------------- locale filter (public reads)

    @Test
    void publicListFiltersByTheRequestedLocaleAndTheTwoSetsAreDisjoint() {
        GuidancePost en1 = createAndPublish("English one", "en");
        GuidancePost en2 = createAndPublish("English two", "en");
        GuidancePost et1 = createAndPublish("Eesti uus", "et");
        GuidancePost et2 = createAndPublish("Eesti kaks", "et");

        Set<Long> enIds = service.listPublic("en").stream()
                .map(PublicGuidanceView::getId).collect(Collectors.toSet());
        Set<Long> etIds = service.listPublic("et").stream()
                .map(PublicGuidanceView::getId).collect(Collectors.toSet());

        // Both sets are NON-EMPTY on this data, hold exactly their own
        // locale's rows, and are DISJOINT — the filter is real, not a
        // plumbing accident.
        assertThat(enIds).containsExactlyInAnyOrder(en1.getId(), en2.getId());
        assertThat(etIds).containsExactlyInAnyOrder(et1.getId(), et2.getId());
        assertThat(enIds).doesNotContainAnyElementsOf(etIds);

        // A draft in a locale stays invisible in that same locale.
        GuidancePost etDraft = createDraft("Eesti draft", "et");
        assertThat(service.listPublic("et")).extracting(PublicGuidanceView::getId)
                .doesNotContain(etDraft.getId());
        assertThat(service.listPublic("et")).extracting(PublicGuidanceView::getId)
                .containsExactlyInAnyOrder(et1.getId(), et2.getId());
    }

    @Test
    void theAbsentLocaleParameterFallsBackToTheConfiguredDefault() {
        createAndPublish("English", "en");
        createAndPublish("Eesti", "et");

        // This test's service is configured with default "en"...
        assertThat(service.listPublic(null)).extracting(PublicGuidanceView::getLocale)
                .containsExactly("en");
        // ...and a service configured with "et" falls back to "et" — the
        // fallback IS app.guidance.default-locale, not a hard-coded value.
        GuidanceService etDefault = new GuidanceService(posts, media, audit, clock, "et",
                importService, translations);
        assertThat(etDefault.listPublic(null)).extracting(PublicGuidanceView::getLocale)
                .containsExactly("et");
    }

    @Test
    void blankOrOverlongLocalesAre400OnIndexAndDetail() {
        GuidancePost post = createAndPublish("T", "en");
        for (String bad : List.of("", "   ", "abcdef",
                "a".repeat(GuidanceService.MAX_LOCALE_LENGTH + 1))) {
            assertThatThrownBy(() -> service.listPublic(bad))
                    .isInstanceOf(GuidanceValidationException.class)
                    .as("index locale %s", bad);
            assertThatThrownBy(() -> service.getByPublicSlug(post.getSlug(), bad))
                    .isInstanceOf(GuidanceValidationException.class)
                    .as("detail locale %s", bad);
        }
        // A value that FITS the column but matches no row is NOT a 400 —
        // it is an empty list (honest "nothing published in fi").
        assertThat(service.listPublic("fi")).isEmpty();
        // A value padded with spaces trims to a real locale.
        assertThat(service.getByPublicSlug(post.getSlug(), "  en ").getId()).isEqualTo(post.getId());
    }

    @Test
    void theDetailFallsBackToTheDefaultLocaleWhenThePostLacksTheRequestedOne() {
        GuidancePost post = createAndPublish("English only", "en");

        // Matching locale -> the post, no fallback.
        assertThat(service.getByPublicSlug(post.getSlug(), "en").getId()).isEqualTo(post.getId());
        assertThat(service.getByPublicSlug(post.getSlug(), "en").isLocaleFallback()).isFalse();
        // Parameter absent -> the default locale ("en") resolves it —
        // existing links keep working.
        assertThat(service.getByPublicSlug(post.getSlug(), null).getId()).isEqualTo(post.getId());
        // Another locale the post has no translation of -> the DEFAULT-locale
        // translation is served with the fallback flag (a 200, never a 404 —
        // the language switch must not dead-end on a "no such page" error).
        PublicGuidanceView fallback = service.getByPublicSlug(post.getSlug(), "et");
        assertThat(fallback.getId()).isEqualTo(post.getId());
        assertThat(fallback.getLocale()).isEqualTo("en");
        assertThat(fallback.isLocaleFallback()).isTrue();

        // A DRAFT in the requested locale is still a 404 — the
        // PUBLISHED-only rule is untouched by the locale filter.
        GuidancePost etDraft = createDraft("Eesti draft", "et");
        assertThatThrownBy(() -> service.getByPublicSlug(etDraft.getSlug(), "et"))
                .isInstanceOf(GuidanceNotFoundException.class);
    }

    @Test
    void theAdminListStaysLocaleBlind() {
        createAndPublish("English", "en");
        createAndPublish("Eesti", "et");
        createDraft("Eesti draft", "et");

        // The admin surface sees EVERY language, drafts included — the
        // administrator has to manage both.
        assertThat(service.listForAdmin()).extracting(GuidancePost::getLocale)
                .containsExactlyInAnyOrder("en", "et", "et");
    }

    // ------------------------------------------------------------- admin locale scope

    @Test
    void theAdminListScopedToALocaleShowsOnlyPostsThatHaveContentInIt() {
        GuidancePost en1 = createAndPublish("English one", "en");
        GuidancePost en2 = createAndPublish("English two", "en");
        GuidancePost et1 = createAndPublish("Eesti uus", "et");
        GuidancePost ru1 = createAndPublish("Russkiy post", "ru");
        // en1 gains an et translation (the same post in both languages).
        service.createTranslation(en1.getId(), "et", null, "Eesti üks", "<p>et keha</p>", null);

        // The en scope: en1 + en2 (their home rows). et1 and ru1 are absent.
        assertThat(service.listForAdmin("en")).extracting(GuidancePost::getId)
                .containsExactlyInAnyOrder(en1.getId(), en2.getId());
        // The et scope: en1 (its et row) + et1 (home et). en2, ru1 absent.
        assertThat(service.listForAdmin("et")).extracting(GuidancePost::getId)
                .containsExactlyInAnyOrder(en1.getId(), et1.getId());
        // The ru scope: ru1 only.
        assertThat(service.listForAdmin("ru")).extracting(GuidancePost::getId)
                .containsExactly(ru1.getId());
        // The unscoped list is untouched: every post, in the stored order.
        assertThat(service.listForAdmin()).hasSize(4);
    }

    @Test
    void aScopedAdminListKeepsTheStoredGlobalOrder() {
        GuidancePost a = createAndPublish("A", "en");
        GuidancePost b = createAndPublish("B", "et");
        GuidancePost c = createAndPublish("C", "en");

        service.reorder(ADMIN_ID, List.of(c.getId(), a.getId(), b.getId()));

        // The en scope renders the visible posts in the GLOBAL order
        // (c=1, a=2, b=3 → c, a), not in some locale-local renumber.
        assertThat(service.listForAdmin("en")).extracting(GuidancePost::getId)
                .containsExactly(c.getId(), a.getId());
    }

    @Test
    void anAdminListScopedToALocaleWithoutPostsIsAnEmptyListNotAnError() {
        createAndPublish("English", "en");
        // A locale that fits the column but matches nothing: empty, not a 400.
        assertThat(service.listForAdmin("fi")).isEmpty();
    }

    @Test
    void aBlankOrOverlongAdminLocaleIs400AndAnAbsentOneStaysUnscoped() {
        createAndPublish("English", "en");
        for (String bad : List.of("", "   ", "abcdef",
                "a".repeat(GuidanceService.MAX_LOCALE_LENGTH + 1))) {
            assertThatThrownBy(() -> service.listForAdmin(bad))
                    .isInstanceOf(GuidanceValidationException.class)
                    .as("list locale %s", bad);
            assertThatThrownBy(() -> service.optionalAdminLocale(bad))
                    .isInstanceOf(GuidanceValidationException.class);
        }
        // The absent parameter (null) means "no scope" — not the default
        // locale (the public reads' fallback does not apply to the admin).
        assertThat(service.optionalAdminLocale(null)).isNull();
        assertThat(service.optionalAdminLocale("  et ")).isEqualTo("et");
    }

    @Test
    void aPostWithNoTranslationRowInAnyLocaleShowsInItsHomeLocaleView() {
        GuidancePost ru = createDraft("Russkiy bez stroki", "ru");
        // The V26-invariant anomaly (legacy rows): the home row is missing.
        GuidanceTranslation own = translations.findByPostIdAndLocale(ru.getId(), "ru").orElseThrow();
        translations.delete(own);

        // The home COLUMNS are the locale's content: the RU view still
        // surfaces the post (editable), never a 500, never silently hidden.
        assertThat(service.listForAdmin("ru")).extracting(GuidancePost::getId)
                .containsExactly(ru.getId());
        assertThat(service.translationInLocale(ru.getId(), "ru")).isEmpty();
        // The other views do not show it.
        assertThat(service.listForAdmin("en")).extracting(GuidancePost::getId)
                .doesNotContain(ru.getId());
        assertThat(service.listForAdmin("et")).extracting(GuidancePost::getId)
                .doesNotContain(ru.getId());
    }

    @Test
    void aScopedDetailServesTheLocaleRowWhenPresentAndTheHomeColumnsOtherwise() {
        GuidancePost en = createAndPublish("English original", "en");
        service.createTranslation(en.getId(), "et", null, "Eesti originaal", "<p>et keha</p>", null);

        // A row in the locale: the row's content.
        GuidanceTranslation et = service.translationInLocale(en.getId(), "et").orElseThrow();
        assertThat(et.getTitle()).isEqualTo("Eesti originaal");
        // The home locale: the own row (in sync with the columns).
        assertThat(service.translationInLocale(en.getId(), "en").orElseThrow().getTitle())
                .isEqualTo("English original");
        // A locale the post has no content in: empty (the controller 404s).
        assertThat(service.translationInLocale(en.getId(), "ru")).isEmpty();
    }

    @Test
    void anUpdateInAForeignLocaleEditsOnlyTheTranslationRow() {
        GuidancePost en = createAndPublish("English original", "en");
        service.createTranslation(en.getId(), "et", null, "Eesti originaal", "<p>et keha</p>", null);

        GuidancePost saved = service.updateInLocale(en.getId(), "et", "Eesti uus tiitel", null,
                "<p>uus et keha</p>", "en", true, null, null, null);

        // The et row carries the new content.
        GuidanceTranslation et = translations.findByPostIdAndLocale(en.getId(), "et").orElseThrow();
        assertThat(et.getTitle()).isEqualTo("Eesti uus tiitel");
        assertThat(et.getBodyHtml()).isEqualTo("<p>uus et keha</p>");
        // The post's home columns are untouched.
        assertThat(saved.getTitle()).isEqualTo("English original");
        assertThat(saved.getSlug()).isEqualTo(en.getSlug());
        assertThat(saved.getBodyHtml()).isEqualTo("<p>body</p>");
        // The post-level field (pinned — shared by every translation) moved.
        assertThat(saved.isPinned()).isTrue();
    }

    @Test
    void anUpdateInTheHomeLocaleKeepsTheUnscopedSemantics() {
        GuidancePost en = createAndPublish("English original", "en");
        service.createTranslation(en.getId(), "et", null, "Eesti originaal", "<p>et keha</p>", null);

        GuidancePost saved = service.updateInLocale(en.getId(), "en", "English changed", null,
                "<p>new en body</p>", "en", false, null, null, null);
        assertThat(saved.getTitle()).isEqualTo("English changed");
        // The home row stays in sync with the columns (the V26 invariant).
        assertThat(translations.findByPostIdAndLocale(en.getId(), "en").orElseThrow().getTitle())
                .isEqualTo("English changed");
        // The et row is untouched.
        assertThat(translations.findByPostIdAndLocale(en.getId(), "et").orElseThrow().getTitle())
                .isEqualTo("Eesti originaal");
    }

    @Test
    void aScopedUpdateToALocaleWithoutATranslationIs404AndWritesNothing() {
        GuidancePost en = createAndPublish("English original", "en");

        assertThatThrownBy(() -> service.updateInLocale(en.getId(), "et", "Eesti", null,
                "<p>b</p>", "en", true, null, null, null))
                .isInstanceOf(GuidanceNotFoundException.class);

        // Nothing moved (fail first — the home columns, the home row, the pin).
        assertThat(service.getById(en.getId()).getTitle()).isEqualTo("English original");
        assertThat(service.getById(en.getId()).isPinned()).isFalse();
    }

    @Test
    void aScopedForeignLocaleUpdateRefusesToMoveTheHomeLocale() {
        GuidancePost en = createAndPublish("English original", "en");
        service.createTranslation(en.getId(), "et", null, "Eesti originaal", "<p>et keha</p>", null);

        assertThatThrownBy(() -> service.updateInLocale(en.getId(), "et", "Eesti uus", null,
                "<p>uus keha</p>", "ru", false, null, null, null))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("home locale");

        // The home is still en, the et row untouched.
        assertThat(service.getById(en.getId()).getLocale()).isEqualTo("en");
        assertThat(translations.findByPostIdAndLocale(en.getId(), "et").orElseThrow().getTitle())
                .isEqualTo("Eesti originaal");
    }

    @Test
    void aScopedReorderWritesTheSubmittedOrderIntoTheGlobalSlotsAndLeavesInvisiblePostsAlone() {
        GuidancePost a = createAndPublish("A", "en"); // global slot 1
        GuidancePost b = createAndPublish("B", "et"); // slot 2 — invisible in en
        GuidancePost c = createAndPublish("C", "en"); // slot 3
        GuidancePost d = createAndPublish("D", "et"); // slot 4 — invisible in en
        // a is visible in et too (its shared slot travels with it).
        service.createTranslation(a.getId(), "et", null, "A et", "<p>b</p>", null);

        // The en scope sees [a, c]; submit [c, a].
        service.reorderInLocale(ADMIN_ID, "en", List.of(c.getId(), a.getId()));

        // a and c swapped SLOTS (the values 1 and 3), they did not take
        // 1..N — the invisible posts' values are untouched.
        assertThat(service.getById(a.getId()).getSortOrder()).isEqualTo(3);
        assertThat(service.getById(c.getId()).getSortOrder()).isEqualTo(1);
        assertThat(service.getById(b.getId()).getSortOrder()).isEqualTo(2);
        assertThat(service.getById(d.getId()).getSortOrder()).isEqualTo(4);
        // The en view renders the submission; the et view stays consistent
        // (b=2, then a=3, then d=4 — a's position is SHARED).
        assertThat(service.listForAdmin("en")).extracting(GuidancePost::getId)
                .containsExactly(c.getId(), a.getId());
        assertThat(service.listForAdmin("et")).extracting(GuidancePost::getId)
                .containsExactly(b.getId(), a.getId(), d.getId());
    }

    @Test
    void aScopedReorderResubmittingTheCurrentVisibleOrderIsANoopWithoutAnAuditRow() {
        GuidancePost a = createDraft("A", "en");
        GuidancePost b = createDraft("B", "et");
        GuidancePost c = createDraft("C", "en");

        // A changing reorder first: the en scope [c, a] (global [a, b, c]).
        service.reorderInLocale(ADMIN_ID, "en", List.of(c.getId(), a.getId()));
        int rowsAfterFirst = audit.rows().size();
        assertThat(audit.rows())
                .extracting(ModerationAuditLog.Row::action)
                .containsExactly(ModerationAuditLog.Action.GUIDANCE_REORDER);
        // The audit row names the locale (the unscoped one says "order").
        assertThat(audit.rows().get(0).subjectLabel()).contains("en");

        // The identical visible order again: no value changes, NO second row.
        int beforeA = service.getById(a.getId()).getSortOrder();
        int beforeC = service.getById(c.getId()).getSortOrder();
        service.reorderInLocale(ADMIN_ID, "en", List.of(c.getId(), a.getId()));
        assertThat(service.getById(a.getId()).getSortOrder()).isEqualTo(beforeA);
        assertThat(service.getById(c.getId()).getSortOrder()).isEqualTo(beforeC);
        assertThat(audit.rows()).hasSize(rowsAfterFirst);
    }

    @Test
    void aScopedReorderRejectsAnIdNotVisibleInTheLocaleAndChangesNothing() {
        GuidancePost a = createDraft("A", "en");
        GuidancePost b = createDraft("B", "et");
        int beforeA = a.getSortOrder();
        int beforeB = b.getSortOrder();

        // b has no content in en — it cannot ride along in the en list.
        assertThatThrownBy(() -> service.reorderInLocale(ADMIN_ID, "en",
                List.of(a.getId(), b.getId())))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining(String.valueOf(b.getId()));

        assertThat(a.getSortOrder()).isEqualTo(beforeA);
        assertThat(b.getSortOrder()).isEqualTo(beforeB);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aScopedReorderRejectsAStaleListMissingAVisiblePostAndChangesNothing() {
        GuidancePost a = createDraft("A", "en");
        GuidancePost c = createDraft("C", "en");
        // A post is created while the admin's table is open — the stale en
        // list (missing 'c') is refused, forcing a refresh.
        int beforeA = a.getSortOrder();
        int beforeC = c.getSortOrder();

        assertThatThrownBy(() -> service.reorderInLocale(ADMIN_ID, "en", List.of(a.getId())))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("stale");

        assertThat(a.getSortOrder()).isEqualTo(beforeA);
        assertThat(c.getSortOrder()).isEqualTo(beforeC);
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aScopedReorderWithAnEmptyListIsRefusedWhileVisiblePostsExist() {
        createDraft("A", "en");
        createDraft("B", "et");
        assertThatThrownBy(() -> service.reorderInLocale(ADMIN_ID, "en", List.of()))
                .isInstanceOf(GuidanceValidationException.class);
        // With nothing visible in the locale, the empty list IS the order.
        service.reorderInLocale(ADMIN_ID, "ru", List.of());
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aScopedReorderRefusesABlankOrOverlongLocale() {
        createAndPublish("A", "en");
        for (String bad : List.of("", "   ", "abcdef",
                "a".repeat(GuidanceService.MAX_LOCALE_LENGTH + 1))) {
            assertThatThrownBy(() -> service.reorderInLocale(ADMIN_ID, bad, List.of()))
                    .isInstanceOf(GuidanceValidationException.class);
        }
    }

    @Test
    void aScopedReorderDoesNotDisturbAnotherLanguagesDraftsOrPublishedRows() {
        // The owner's case: reordering the EN view must not disturb the RU
        // drafts (separate posts, invisible in en).
        GuidancePost en1 = createAndPublish("EN one", "en");
        GuidancePost en2 = createAndPublish("EN two", "en");
        GuidancePost ruDraft1 = createDraft("RU ochen' pervyi", "ru");
        GuidancePost ruDraft2 = createDraft("RU vtoroy", "ru");
        int ruBefore1 = ruDraft1.getSortOrder();
        int ruBefore2 = ruDraft2.getSortOrder();

        // Global: en1=1, en2=2, ruDraft1=3, ruDraft2=4. Reorder en to [en2, en1].
        service.reorderInLocale(ADMIN_ID, "en", List.of(en2.getId(), en1.getId()));

        // The RU drafts' values (and therefore their ru order) are untouched.
        assertThat(service.getById(ruDraft1.getId()).getSortOrder()).isEqualTo(ruBefore1);
        assertThat(service.getById(ruDraft2.getId()).getSortOrder()).isEqualTo(ruBefore2);
        assertThat(service.listForAdmin("ru")).extracting(GuidancePost::getId)
                .containsExactly(ruDraft1.getId(), ruDraft2.getId());
        // The en view shows the submission.
        assertThat(service.listForAdmin("en")).extracting(GuidancePost::getId)
                .containsExactly(en2.getId(), en1.getId());
    }

    // ------------------------------------------------------------- hero import (guidance-hero-import)

    @Test
    void aPendingImportIsStoredOnTheDraftAndConsumedAtPublish() {
        fetch.set(servingPngClient());
        GuidancePost post = service.create(ADMIN_ID, "Imported", null, "<p>b</p>",
                null, false, null, "an alt", "https://images.example.com/hero.png", null);

        // The draft carries the URL as a PENDING import — no asset yet.
        assertThat(post.getHeroImportUrl()).isEqualTo("https://images.example.com/hero.png");
        assertThat(post.getHeroImageId()).isNull();
        assertThat(media.findAll()).isEmpty();

        service.publish(ADMIN_ID, post.getId());

        GuidancePost published = posts.findById(post.getId()).orElseThrow();
        assertThat(published.isPublished()).isTrue();
        // Consumed: the URL is gone, the imported asset is the hero.
        assertThat(published.getHeroImportUrl()).isNull();
        assertThat(published.getHeroImageId()).isNotNull();
        assertThat(published.getHeroImageAlt()).isEqualTo("an alt");
        MediaAsset asset = media.findById(published.getHeroImageId()).orElseThrow();
        assertThat(asset.getStoredFilename()).matches("^[a-f0-9]{32}\\.png$");
        assertThat(asset.getContentType()).isEqualTo("image/png");
        // Attribution: the origin is recorded on the asset (takedown trail).
        assertThat(asset.getSourceUrl()).isEqualTo("https://images.example.com/hero.png");
        assertThat(asset.getUploadedBy()).isEqualTo(ADMIN_ID);
        // Exactly ONE audit row — the publish (the import writes no row of its own).
        assertThat(audit.rows()).hasSize(1);
        assertLabeledRow(audit.rows().get(0), ModerationAuditLog.Action.GUIDANCE_PUBLISH,
                "Guidance post \"Imported\" (imported)");
    }

    @Test
    void aFailedImportFailsThePublishAndTheDraftKeepsTheUrl() {
        // refusingClient() is the default: every fetch is unreachable.
        GuidancePost post = service.create(ADMIN_ID, "Broken", null, "<p>b</p>",
                null, false, null, "an alt", "https://images.example.com/gone.png", null);

        assertThatThrownBy(() -> service.publish(ADMIN_ID, post.getId()))
                .isInstanceOf(HeroImportUnreachableException.class);

        // The post stays a DRAFT with the URL intact — retryable after a
        // fix; no asset, no hero, NO audit row.
        GuidancePost draft = posts.findById(post.getId()).orElseThrow();
        assertThat(draft.isPublished()).isFalse();
        assertThat(draft.getHeroImportUrl()).isEqualTo("https://images.example.com/gone.png");
        assertThat(draft.getHeroImageId()).isNull();
        assertThat(media.findAll()).isEmpty();
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aOneShotCreateAndPublishWithAFailedImportStoresNothing() {
        // refusingClient() is the default.
        assertThatThrownBy(() -> service.create(ADMIN_ID, "X", null, "<p>b</p>",
                null, false, null, "an alt", "https://images.example.com/x.png", GuidanceStatus.PUBLISHED))
                .isInstanceOf(HeroImportUnreachableException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
        assertThat(media.findAll()).isEmpty();
    }

    @Test
    void aOneShotCreateAndPublishImportsBeforeWriting() {
        fetch.set(servingPngClient());

        GuidancePost post = service.create(ADMIN_ID, "Direct", null, "<p>b</p>",
                null, false, null, "an alt", "https://images.example.com/d.png", GuidanceStatus.PUBLISHED);

        assertThat(post.isPublished()).isTrue();
        assertThat(post.getHeroImportUrl()).isNull();
        assertThat(post.getHeroImageId()).isNotNull();
        assertThat(media.findById(post.getHeroImageId()).orElseThrow().getSourceUrl())
                .isEqualTo("https://images.example.com/d.png");
    }

    @Test
    void aPublishedPostCannotTakeAPendingImport() {
        GuidancePost post = createAndPublish("Live", "en");

        assertThatThrownBy(() -> service.update(post.getId(), "Live", null, "<p>b</p>",
                null, false, null, null, "https://images.example.com/x.png"))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("unpublish");
        // Untouched.
        assertThat(posts.findById(post.getId()).orElseThrow().getHeroImportUrl()).isNull();
    }

    @Test
    void aPendingImportUrlParticipatesInTheAltPairingRule() {
        // A URL without alt → 400; a URL + alt → fine.
        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, null, null, "https://images.example.com/x.png", null))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("heroImageAlt");
        assertThat(posts.findAllForAdmin()).isEmpty();

        // Both hero kinds at once is legal: the import supersedes the id at publish.
        MediaAsset asset = newAsset(slug32("a"));
        fetch.set(servingPngClient());
        GuidancePost post = service.create(ADMIN_ID, "Both", null, "<p>b</p>",
                null, false, asset.getId(), "an alt", "https://images.example.com/x.png", null);
        service.publish(ADMIN_ID, post.getId());
        GuidancePost published = posts.findById(post.getId()).orElseThrow();
        assertThat(published.getHeroImageId()).isNotEqualTo(asset.getId());
        // The superseded asset stays in the library (the D8 replace rule).
        assertThat(media.findById(asset.getId())).isPresent();
    }

    @Test
    void malformedImportUrlsAreRefusedAtWriteTime() {
        for (String bad : List.of("file:///etc/passwd", "ftp://images.example.com/x.png",
                "data:image/png;base64,AAAA", "javascript:alert(1)",
                "https://user:pass@images.example.com/x.png", "not a url")) {
            assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                    null, false, null, "an alt", bad, null))
                    .isInstanceOf(GuidanceValidationException.class)
                    .as("url %s", bad);
        }
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    // ------------------------------------------------------------- audit (D12)

    private void assertLabeledRow(ModerationAuditLog.Row row, ModerationAuditLog.Action action, String label) {
        assertThat(row.action()).isEqualTo(action);
        assertThat(row.moderatorId()).isEqualTo(ADMIN_ID);
        assertThat(row.subjectLabel()).isEqualTo(label);
    }
}
