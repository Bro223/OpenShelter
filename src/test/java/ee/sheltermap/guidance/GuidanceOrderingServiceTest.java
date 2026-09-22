package ee.sheltermap.guidance;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceTranslation;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The extracted ordering seam (W3-A) directly: the full-list and
 * locale-scoped reorders in {@link GuidanceOrderingService} — the
 * permutation validation, the shared-slot algorithm, the no-op idempotence
 * and the single audit row. The bean's delegating methods (transaction
 * boundary + public surface) stay covered by {@code GuidanceServiceTest}.
 */
class GuidanceOrderingServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-02-12T08:00:00Z"), ZoneOffset.UTC);
    private static final long ADMIN = 9L;

    private final InMemoryGuidancePostRepository posts = new InMemoryGuidancePostRepository(CLOCK);
    private final InMemoryGuidanceTranslationRepository translations =
            new InMemoryGuidanceTranslationRepository(CLOCK, posts);
    private final InMemoryModerationAuditLog audit = new InMemoryModerationAuditLog(CLOCK);
    private final GuidanceOrderingService ordering =
            new GuidanceOrderingService(posts, translations, audit);

    // ------------------------------------------------------------------ helpers

    private GuidancePost draft(String slug, String title, String locale, int sortOrder) {
        return posts.save(GuidancePost.draft(slug, title, "<p>body " + title + "</p>", locale,
                false, null, null, null, sortOrder, ADMIN, CLOCK.instant()));
    }

    private void addTranslation(long postId, String locale, String title, String body, String slug) {
        translations.save(GuidanceTranslation.forPost(postId, locale, slug, title, body,
                null, CLOCK.instant()));
    }

    private List<Long> idsInOrder(GuidancePost... posts) {
        List<Long> ids = new ArrayList<>();
        for (GuidancePost post : posts) {
            ids.add(post.getId());
        }
        return ids;
    }

    // --------------------------------------------------------------- reorder

    @Test
    void aPermutationIsRenumberedAndAuditedOnce() {
        GuidancePost a = draft("a", "A", "et", 1);
        GuidancePost b = draft("b", "B", "et", 2);
        GuidancePost c = draft("c", "C", "et", 3);

        ordering.reorder(ADMIN, idsInOrder(c, a, b));

        assertThat(a.getSortOrder()).isEqualTo(2);
        assertThat(b.getSortOrder()).isEqualTo(3);
        assertThat(c.getSortOrder()).isEqualTo(1);
        assertThat(audit.rows()).hasSize(1);
        ModerationAuditLog.Row row = audit.rows().get(0);
        assertThat(row.moderatorId()).isEqualTo(ADMIN);
        assertThat(row.action()).isEqualTo(ModerationAuditLog.Action.GUIDANCE_REORDER);
        assertThat(row.subjectLabel()).isEqualTo("Guidance post order");
    }

    @Test
    void resubmittingTheCurrentOrderChangesNothingAndWritesNoAuditRow() {
        GuidancePost a = draft("a", "A", "et", 1);
        GuidancePost b = draft("b", "B", "et", 2);

        ordering.reorder(ADMIN, idsInOrder(a, b));

        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void anUnknownIdIsA400ThatChangesNothing() {
        GuidancePost a = draft("a", "A", "et", 1);
        GuidancePost b = draft("b", "B", "et", 2);

        assertThatThrownBy(() -> ordering.reorder(ADMIN, List.of(a.getId(), 999L)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds contains unknown post ids: [999] — refresh the list");
        // nothing moved: no save ran, no audit row.
        assertThat(audit.rows()).isEmpty();
        assertThat(a.getSortOrder()).isEqualTo(1);
        assertThat(b.getSortOrder()).isEqualTo(2);
    }

    @Test
    void aDuplicateIdIsA400ThatChangesNothing() {
        GuidancePost a = draft("a", "A", "et", 1);
        GuidancePost b = draft("b", "B", "et", 2);

        assertThatThrownBy(() -> ordering.reorder(ADMIN, List.of(a.getId(), a.getId(), b.getId())))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds lists post " + a.getId() + " more than once");
        assertThat(audit.rows()).isEmpty();
        assertThat(a.getSortOrder()).isEqualTo(1);
    }

    @Test
    void aNullIdIsA400() {
        GuidancePost a = draft("a", "A", "et", 1);
        List<Long> withNull = new ArrayList<>();
        withNull.add(a.getId());
        withNull.add(null); // List.of would refuse the null before the service saw it
        assertThatThrownBy(() -> ordering.reorder(ADMIN, withNull))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds must not contain null ids");
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aStaleListMissingACurrentPostIsA400() {
        GuidancePost a = draft("a", "A", "et", 1);
        GuidancePost b = draft("b", "B", "et", 2);
        draft("c", "C", "et", 3);

        assertThatThrownBy(() -> ordering.reorder(ADMIN, idsInOrder(a, b)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds is missing current posts (the list is stale — a post was "
                        + "created or deleted since the table was loaded): refresh the list and retry");
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void anEmptyListIsA400WhilePostsExistAndANoopWhenNone() {
        GuidancePost a = draft("a", "A", "et", 1);
        assertThatThrownBy(() -> ordering.reorder(ADMIN, List.of()))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds is missing current posts (the list is stale — a post was "
                        + "created or deleted since the table was loaded): refresh the list and retry");
        assertThat(audit.rows()).isEmpty();
        assertThat(a.getSortOrder()).isEqualTo(1);

        posts.delete(a);
        ordering.reorder(ADMIN, List.of()); // no posts at all: a no-op
        assertThat(audit.rows()).isEmpty();
    }

    // ------------------------------------------------------ reorderInLocale

    @Test
    void aLocaleScopedReorderRewritesOnlyTheVisiblePostsIntoTheirSlots() {
        // Global order: v1(1) v2(2) x(3) v3(4) — x is not visible in "en"
        // and must keep its slot.
        GuidancePost v1 = draft("v1", "V1", "et", 1);
        GuidancePost v2 = draft("v2", "V2", "et", 2);
        GuidancePost x = draft("x", "X", "et", 3);
        GuidancePost v3 = draft("v3", "V3", "et", 4);
        addTranslation(v1.getId(), "en", "V1 en", "<p>b1</p>", "v1-en");
        addTranslation(v2.getId(), "en", "V2 en", "<p>b2</p>", "v2-en");
        addTranslation(v3.getId(), "en", "V3 en", "<p>b3</p>", "v3-en");

        // Submit the "en" list reversed: v3, v1, v2 → the visible posts
        // take the SAME slot values (1, 2, 4), x untouched.
        ordering.reorderInLocale(ADMIN, "en", idsInOrder(v3, v1, v2));

        assertThat(v3.getSortOrder()).isEqualTo(1); // slot of v1
        assertThat(v1.getSortOrder()).isEqualTo(2); // slot of v2
        assertThat(v2.getSortOrder()).isEqualTo(4); // slot of v3
        assertThat(x.getSortOrder()).isEqualTo(3);  // untouched
        // The visible order in the locale now equals the submission.
        assertThat(visibleOrder("en")).isEqualTo(List.of(v3.getId(), v1.getId(), v2.getId()));
        // Exactly one audit row, named with the locale.
        assertThat(audit.rows()).hasSize(1);
        assertThat(audit.rows().get(0).subjectLabel()).isEqualTo("Guidance post order (en)");
    }

    @Test
    void aPostWhoseHomeLocaleIsTheRequestedOneIsVisibleThroughItsOwnColumns() {
        // The legacy case: BOTH posts' HOME locale is "en" and neither has
        // a translation row in "en" — both are still visible (their content
        // is their own columns), and the reorder walks them.
        GuidancePost h1 = draft("h1", "H1", "en", 1); // home locale = en, no "en" translation row
        GuidancePost h2 = draft("h2", "H2", "en", 2); // home locale = en, no "en" translation row
        GuidancePost other = draft("o", "O", "et", 3); // home locale = et: invisible in "en"
        addTranslation(other.getId(), "en", "O en", "<p>b</p>", "o-en"); // but visible via a row

        ordering.reorderInLocale(ADMIN, "en", idsInOrder(h2, other, h1));

        // Slots 1, 2 (h1, h2) and 3 (other) — the global order's slots.
        assertThat(h2.getSortOrder()).isEqualTo(1);
        assertThat(other.getSortOrder()).isEqualTo(2);
        assertThat(h1.getSortOrder()).isEqualTo(3);
        assertThat(audit.rows()).hasSize(1);
    }

    @Test
    void aLocaleScopedResubmissionIsANoopWithoutAudit() {
        GuidancePost v1 = draft("v1", "V1", "et", 1);
        GuidancePost v2 = draft("v2", "V2", "et", 2);
        addTranslation(v1.getId(), "en", "V1 en", "<p>b</p>", "v1-en");
        addTranslation(v2.getId(), "en", "V2 en", "<p>b</p>", "v2-en");

        ordering.reorderInLocale(ADMIN, "en", idsInOrder(v1, v2));

        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aLocaleScopedReorderRefusesIdsNotVisibleInTheLocale() {
        GuidancePost v1 = draft("v1", "V1", "et", 1);
        GuidancePost hidden = draft("h", "H", "et", 2); // no "en" content
        addTranslation(v1.getId(), "en", "V1 en", "<p>b</p>", "v1-en");

        assertThatThrownBy(() -> ordering.reorderInLocale(ADMIN, "en", idsInOrder(v1, hidden)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds contains posts without a en translation: ["
                        + hidden.getId() + "] — refresh the list");
        assertThat(audit.rows()).isEmpty();
        assertThat(v1.getSortOrder()).isEqualTo(1);
        assertThat(hidden.getSortOrder()).isEqualTo(2);
    }

    @Test
    void aLocaleScopedStaleListIsA400() {
        GuidancePost v1 = draft("v1", "V1", "et", 1);
        GuidancePost v2 = draft("v2", "V2", "et", 2);
        addTranslation(v1.getId(), "en", "V1 en", "<p>b</p>", "v1-en");
        addTranslation(v2.getId(), "en", "V2 en", "<p>b</p>", "v2-en");

        assertThatThrownBy(() -> ordering.reorderInLocale(ADMIN, "en", idsInOrder(v1)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds is missing current en posts (the list is stale — a post was "
                        + "created or deleted since the table was loaded): refresh the list and retry");
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aLocaleScopedEmptyListIsA400WhileVisiblePostsExistAndANoopWhenNone() {
        GuidancePost v1 = draft("v1", "V1", "et", 1);
        addTranslation(v1.getId(), "en", "V1 en", "<p>b</p>", "v1-en");
        draft("h", "Hidden", "et", 2); // invisible in "en"

        assertThatThrownBy(() -> ordering.reorderInLocale(ADMIN, "en", List.of()))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("postIds is missing current en posts (the list is stale — a post was "
                        + "created or deleted since the table was loaded): refresh the list and retry");
        assertThat(audit.rows()).isEmpty();

        translations.findAllByLocale("en").forEach(t -> translations.delete(t));
        ordering.reorderInLocale(ADMIN, "en", List.of()); // nothing visible: no-op
        assertThat(audit.rows()).isEmpty();
    }

    @Test
    void aBlankLocaleIsA400() {
        // the scoped reorder validates with the REQUIRE rule (a blank is
        // a missing parameter, not an empty-string locale).
        assertThatThrownBy(() -> ordering.reorderInLocale(ADMIN, "  ", List.of()))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale is required");
        assertThat(audit.rows()).isEmpty();
    }

    private List<Long> visibleOrder(String locale) {
        return posts.findAllInStoredGlobalOrder().stream()
                .filter(post -> translations.findByPostIdAndLocale(post.getId(), locale).isPresent()
                        || post.getLocale().equals(locale))
                .map(GuidancePost::getId)
                .toList();
    }
}
