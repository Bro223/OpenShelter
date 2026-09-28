package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceTranslation;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The extracted search seam directly: the searchable-text
 * derivation, the match rule and the query bound in
 * {@link GuidanceSearch} — the class that owns the policy. This is
 * also the unit-level pin of the admin guidance
 * list's search policy (the controller delegates it to
 * {@code GuidanceSearch}: absent/blank q = no filter, over the bound =
 * 400 with the uniform message, the post-level match over EXACTLY the
 * content the read renders) — the end-to-end matrix (real persistence,
 * HTTP) is {@code AdminGuidanceSearchPagingIT}.
 */
class GuidanceSearchTest {

    @Test
    void searchableBodyStripsEveryTagAndCollapsesWhitespace() {
        assertThat(GuidanceSearch.searchableBody("<p>hello</p>"))
                .isEqualTo("hello");
        assertThat(GuidanceSearch.searchableBody("<p><b>Bold</b> and   spaced</p><p>more</p>"))
                .isEqualTo("Bold and spaced more");
        assertThat(GuidanceSearch.searchableBody(null)).isEmpty();
        // no markup survives — a search for markup is not a feature.
        assertThat(GuidanceSearch.searchableBody("<p>hello</p>")).doesNotContain("<");
    }

    @Test
    void matchesSearchIsACaseInsensitiveSubstringOverTitleAndStrippedBody() {
        assertThat(GuidanceSearch.matchesSearch("Kelder juhend", null, "kelder")).isTrue();
        assertThat(GuidanceSearch.matchesSearch("Kelder juhend", null, "KELDER")).isTrue();
        // the body match is over the TAG-STRIPPED text — the markup itself
        // is never searchable.
        assertThat(GuidanceSearch.matchesSearch("Muu", "<p><b>Varjendus</b> keha</p>", "varjendus")).isTrue();
        assertThat(GuidanceSearch.matchesSearch("Muu", "<p>keha</p>", "varjendus")).isFalse();
        assertThat(GuidanceSearch.matchesSearch("Muu", "<p>hello</p>", "<p>"))
                .as("markup is not a feature")
                .isFalse();
    }

    @Test
    void aBlankOrAbsentNeedleMatchesEverything() {
        assertThat(GuidanceSearch.matchesSearch("Title", "<p>body</p>", null)).isTrue();
        assertThat(GuidanceSearch.matchesSearch("Title", "<p>body</p>", "   ")).isTrue();
        assertThat(GuidanceSearch.matchesSearch(null, null, " ")).isTrue();
    }

    @Test
    void matchesSearchIsNullSafeOnTheRow() {
        assertThat(GuidanceSearch.matchesSearch(null, "<p>hello</p>", "hello")).isTrue();
        assertThat(GuidanceSearch.matchesSearch(null, null, "hello")).isFalse();
    }

    @Test
    void theSearchTermBoundIsTwoHundred() {
        // the admin list's q bound — a present q
        // over this is a 400 (the controller enforces it).
        assertThat(GuidanceSearch.MAX_SEARCH_LENGTH).isEqualTo(200);
    }

    @Test
    void requireSearchReturnsNullForAbsentAndBlank() {
        // absent or blank = no filter (null) — the public q-less behaviour,
        // never a 400.
        assertThat(GuidanceSearch.requireSearch(null)).isNull();
        assertThat(GuidanceSearch.requireSearch("")).isNull();
        assertThat(GuidanceSearch.requireSearch("   ")).isNull();
    }

    @Test
    void requireSearchTrimsAndPassesThroughWithinTheBound() {
        assertThat(GuidanceSearch.requireSearch("  water  ")).isEqualTo("water");
        assertThat(GuidanceSearch.requireSearch("  kelder  ")).isEqualTo("kelder");
        assertThat(GuidanceSearch.requireSearch("a".repeat(200)))
                .isEqualTo("a".repeat(200));
        assertThat(GuidanceSearch.requireSearch("x".repeat(GuidanceSearch.MAX_SEARCH_LENGTH)))
                .hasSize(GuidanceSearch.MAX_SEARCH_LENGTH);
    }

    @Test
    void requireSearchRefusesAValueOverTheBoundWithTheUniform400() {
        assertThatThrownBy(() -> GuidanceSearch.requireSearch("a".repeat(201)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("q must be at most 200 characters");
        // the same 400 with the message built from the bound constant
        // (the admin list's spelling of the same pin):
        assertThatThrownBy(() -> GuidanceSearch.requireSearch("x".repeat(201)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("q must be at most " + GuidanceSearch.MAX_SEARCH_LENGTH + " characters");
    }

    @Test
    void matchesPostMatchesEverythingForANullOrBlankQuery() {
        GuidancePost post = post("one", "<p>home body</p>");
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), null)).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), "   "))
                .as("a blank term is no filter, like an absent one")
                .isTrue();
        assertThat(GuidanceSearch.matchesPost(post, row("<p>row body</p>"), List.of(), null)).isTrue();
        // the admin list's own scenario pins the same two answers:
        GuidancePost bare = post("T", "<p>b</p>");
        assertThat(GuidanceSearch.matchesPost(bare, null, List.of(), null)).isTrue();
        assertThat(GuidanceSearch.matchesPost(bare, null, List.of(), "   ")).isTrue();
    }

    @Test
    void matchesPostWithARenderedRowSearchesOnlyTheRow() {
        // a scoped read: the row IS the rendered content, so the home
        // columns are NOT searched — the match is what you see.
        GuidancePost post = post("home title", "<p>home body</p>");
        GuidanceTranslation row = row("<p>row body</p>");
        assertThat(GuidanceSearch.matchesPost(post, row, List.of(), "row body")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, row, List.of(), "ROW BODY")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, row, List.of(), "home title"))
                .as("the home columns are not searched when a row renders")
                .isFalse();
        assertThat(GuidanceSearch.matchesPost(post, row, List.of(), "home body")).isFalse();
        // the row's TITLE is searchable too (the IT's Estonian scenario):
        GuidancePost home = post("Estonian shelter guide", "<p>en body</p>");
        GuidanceTranslation et = row("et", "Eestikeelne keldri juhend", "<p>et keha</p>");
        assertThat(GuidanceSearch.matchesPost(home, et, List.of(), "keldri")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, et, List.of(), "Estonian")).isFalse();
    }

    @Test
    void matchesPostWithoutARenderedRowSearchesTheHomeColumns() {
        // the post's home IS the scoped locale (no row) or the read is
        // unscoped: the home columns are the rendered content.
        GuidancePost post = post("home title", "<p>home body</p>");
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), "home title")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), "home body")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), "absent")).isFalse();
        // the admin list's own scenario, same three answers:
        GuidancePost home = post("Estonian shelter guide", "<p>en body</p>");
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(), "Estonian")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(), "en body")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(), "keldri")).isFalse();
    }

    @Test
    void matchesPostWithoutARenderedRowCoversEveryOtherRow() {
        // an unscoped read covers ANY locale's content: a term in any
        // translation row matches the post.
        GuidancePost post = post("home title", "<p>home body</p>");
        List<GuidanceTranslation> rows = List.of(row("<p>first</p>"), row("<p>second</p>"));
        assertThat(GuidanceSearch.matchesPost(post, null, rows, "first")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, null, rows, "second")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, null, rows, "absent")).isFalse();
        // the covered row's TITLE matches too (the IT's Estonian scenario):
        GuidancePost home = post("Estonian shelter guide", "<p>en body</p>");
        GuidanceTranslation et = row("et", "Eestikeelne keldri juhend", "<p>et keha</p>");
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(et), "keldri")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(et), "Estonian")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(et), "absent word")).isFalse();
    }

    @Test
    void matchesPostMatchesTheStrippedBodyNotTheMarkup() {
        // the match runs over the tag-stripped body (the searcher sees
        // text, not markup) — the same policy as matchesSearch.
        GuidancePost post = post("t", "<p><b>Bold</b> text</p>");
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), "bold text")).isTrue();
        assertThat(GuidanceSearch.matchesPost(post, null, List.of(), "<b>"))
                .as("markup is not a feature")
                .isFalse();
    }

    private static GuidancePost post(String title, String bodyHtml) {
        return GuidancePost.draft("slug-1", title, bodyHtml, "en", false, null, null,
                null, 1, 1L, NOW);
    }

    private static GuidanceTranslation row(String bodyHtml) {
        return GuidanceTranslation.forPost(1L, "ru", "slug-1-ru", "row title", bodyHtml,
                null, NOW);
    }

    private static GuidanceTranslation row(String locale, String title, String bodyHtml) {
        return GuidanceTranslation.forPost(1L, locale, locale + "-slug", title, bodyHtml,
                null, NOW);
    }

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");
}
