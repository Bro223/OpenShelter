package ee.sheltermap.guidance;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.auth.MutableClock;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.domain.MediaAsset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    private InMemoryMediaAssetRepository media;
    private InMemoryModerationAuditLog audit;
    private MutableClock clock;
    private GuidanceService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-09-13T08:00:00Z"));
        posts = new InMemoryGuidancePostRepository(clock);
        media = new InMemoryMediaAssetRepository(posts);
        audit = new InMemoryModerationAuditLog(clock);
        service = new GuidanceService(posts, media, audit, clock, "en");
    }

    // ------------------------------------------------------------- helpers

    private GuidancePost createDraft(String title) {
        return service.create(ADMIN_ID, title, null, "<p>body</p>", null, false, null, null, null);
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
        assertThat(service.listPublic()).isEmpty();
        assertThatThrownBy(() -> service.getByPublicSlug(post.getSlug()))
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
                null, false, null, null, GuidanceStatus.PUBLISHED);

        assertThat(post.isPublished()).isTrue();
        assertThat(post.getPublishedAt()).isEqualTo(now);
        assertThat(service.listPublic()).extracting(GuidancePost::getId).containsExactly(post.getId());
        assertThat(service.getByPublicSlug(post.getSlug()).getId()).isEqualTo(post.getId());
    }

    @Test
    void createStoresTheSanitizedBody() {
        String hostile = "<p>ok</p><script>alert(1)</script>";

        GuidancePost post = service.create(ADMIN_ID, "T", null, hostile,
                null, false, null, null, null);

        // The stored value is the sanitizer OUTPUT, not the raw input (D2):
        // exactly what the sanitizer answers for the input, no script left.
        assertThat(post.getBodyHtml()).isEqualTo(BodySanitizer.sanitize(hostile));
        assertThat(post.getBodyHtml()).doesNotContain("script").contains("ok");
        assertThat(posts.findBySlug(post.getSlug()).orElseThrow().getBodyHtml())
                .isEqualTo(BodySanitizer.sanitize(hostile));
    }

    @Test
    void localeDefaultsFromTheConfiguredPrimaryLanguage() {
        assertThat(service.create(ADMIN_ID, "D", null, "<p>b</p>", null, false, null, null, null)
                .getLocale()).isEqualTo("en");
        assertThat(service.create(ADMIN_ID, "E", null, "<p>b</p>", "et", false, null, null, null)
                .getLocale()).isEqualTo("et");
    }

    @Test
    void missingTitleOrBodyAreRefusedAndNothingIsStored() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, null, null, "<p>b</p>", null, false, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "   ", null, "<p>b</p>", null, false, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "T", null, null, null, false, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "T", null, "   ", null, false, null, null, null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThatThrownBy(() -> service.create(ADMIN_ID, "x".repeat(GuidanceService.MAX_TITLE_LENGTH + 1),
                null, "<p>b</p>", null, false, null, null, null))
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
                hostile, null, true, null, null);

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
        service.update(a.getId(), "A", a.getSlug(), "<p>b</p>", null, false, null, null);
        assertThat(posts.findById(a.getId()).orElseThrow().getSlug()).isEqualTo(a.getSlug());

        // Another post's slug → 409 naming it, nothing changed.
        assertThatThrownBy(() -> service.update(b.getId(), "B", a.getSlug(), "<p>b</p>",
                null, false, null, null))
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
        assertThat(service.listPublic()).isEmpty();
        assertThatThrownBy(() -> service.getByPublicSlug(post.getSlug()))
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
        assertThat(service.listPublic()).isEmpty();
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
                () -> service.update(999L, "T", null, "<p>b</p>", null, false, null, null))) {
            assertThatThrownBy(op::run).isInstanceOf(GuidanceNotFoundException.class);
        }
    }

    // ------------------------------------------------------------- ordering (D6)

    @Test
    void publicListIsPinnedFirstThenPublishedAtDescThenIdDesc() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        GuidancePost c = createDraft("C");
        service.publish(ADMIN_ID, a.getId());
        service.publish(ADMIN_ID, b.getId());
        service.publish(ADMIN_ID, c.getId());

        // Same publication instant → the id descending tie-break.
        assertThat(service.listPublic()).extracting(GuidancePost::getId)
                .containsExactly(c.getId(), b.getId(), a.getId());

        // Pinning the oldest floats it to the top.
        service.update(a.getId(), "A", null, "<p>b</p>", null, true, null, null);
        assertThat(service.listPublic()).extracting(GuidancePost::getId)
                .containsExactly(a.getId(), c.getId(), b.getId());

        // A newer non-pinned post outranks the older non-pinned ones.
        clock.advance(Duration.ofHours(1));
        GuidancePost d = service.create(ADMIN_ID, "D", null, "<p>b</p>",
                null, false, null, null, GuidanceStatus.PUBLISHED);
        assertThat(service.listPublic()).extracting(GuidancePost::getId)
                .containsExactly(a.getId(), d.getId(), c.getId(), b.getId());
    }

    @Test
    void adminListIsNewestUpdatedFirst() {
        GuidancePost a = createDraft("A");
        GuidancePost b = createDraft("B");
        clock.advance(Duration.ofMinutes(10));

        service.update(a.getId(), "A edited", null, "<p>b</p>", null, false, null, null);

        assertThat(service.listForAdmin()).extracting(GuidancePost::getId)
                .containsExactly(a.getId(), b.getId());
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
                null, false, null, null, null))
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
                    null, false, null, null, null))
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
                null, false, null, null, GuidanceStatus.PUBLISHED);

        assertThat(post.getHeroImageId()).isNull();
        assertThat(post.getHeroImageAlt()).isNull();
        // Still fully renderable (200 on its slug).
        assertThat(service.getByPublicSlug(post.getSlug()).getId()).isEqualTo(post.getId());
    }

    @Test
    void settingAHeroWithoutAltIsRefusedAndNothingIsStored() {
        MediaAsset asset = newAsset(slug32("a"));

        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, asset.getId(), null, null))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessageContaining("heroImageAlt");
        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, asset.getId(), "   ", null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    @Test
    void anAltWithoutAHeroIsRefused() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, "A", null, "<p>b</p>",
                null, false, null, "an alt", null))
                .isInstanceOf(GuidanceValidationException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    @Test
    void aHeroIdWithoutAnAssetIs404() {
        assertThatThrownBy(() -> service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, 999L, "an alt", null))
                .isInstanceOf(GuidanceNotFoundException.class);
        assertThat(posts.findAllForAdmin()).isEmpty();
    }

    @Test
    void replacingTheHeroKeepsTheOldAssetAndDropsItsCount() {
        MediaAsset oldAsset = newAsset(slug32("a"));
        MediaAsset fresh = newAsset(slug32("b"));
        GuidancePost post = service.create(ADMIN_ID, "H", null, "<p>b</p>",
                null, false, oldAsset.getId(), "old alt", null);
        assertThat(media.referencedCountsByAssetId()).containsEntry(oldAsset.getId(), 1L);

        service.update(post.getId(), "H", null, "<p>b</p>", null, false, fresh.getId(), "new alt");

        assertThat(posts.findById(post.getId()).orElseThrow().getHeroImageId()).isEqualTo(fresh.getId());
        Map<Long, Long> counts = media.referencedCountsByAssetId();
        assertThat(counts.getOrDefault(oldAsset.getId(), 0L)).isZero();
        assertThat(counts).containsEntry(fresh.getId(), 1L);
        // The replaced asset stays in the library (replaced, not deleted).
        assertThat(media.findById(oldAsset.getId())).isPresent();
    }

    // ------------------------------------------------------------- audit (D12)

    private void assertLabeledRow(ModerationAuditLog.Row row, ModerationAuditLog.Action action, String label) {
        assertThat(row.action()).isEqualTo(action);
        assertThat(row.moderatorId()).isEqualTo(ADMIN_ID);
        assertThat(row.subjectLabel()).isEqualTo(label);
    }
}
