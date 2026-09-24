package ee.sheltermap.api;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.guidance.GuidanceSearch;
import ee.sheltermap.guidance.GuidanceValidationException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The admin guidance list's search policy, pinned in isolation as the
 * controller delegates it to {@link GuidanceSearch}: the query bound
 * (absent/blank = no filter, over-long = 400 with the uniform message)
 * and the post-level match over EXACTLY the content the read renders —
 * the scoped locale's row when the read has one (the home columns are
 * not searched then), otherwise the home columns plus every covered
 * translation row. The end-to-end matrix (real persistence, HTTP) is
 * {@code AdminGuidanceSearchPagingIT}; this suite is the unit-level pin
 * of the moved policy.
 */
class AdminGuidanceSearchPolicyTest {

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    private static GuidancePost post(String title, String bodyHtml) {
        return GuidancePost.draft("policy-post", title, bodyHtml, "en",
                false, null, null, null, 1, 1L, NOW);
    }

    private static GuidanceTranslation row(String locale, String title, String bodyHtml) {
        return GuidanceTranslation.forPost(1L, locale, locale + "-slug", title, bodyHtml, null, NOW);
    }

    @Test
    void theQueryBoundAnswersNullForNoFilterAndTrimsTheTerm() {
        assertThat(GuidanceSearch.requireSearch(null)).isNull();
        assertThat(GuidanceSearch.requireSearch("   ")).isNull();
        assertThat(GuidanceSearch.requireSearch("  kelder  ")).isEqualTo("kelder");
    }

    @Test
    void anOverLongQueryIsA400WithTheUniformMessage() {
        assertThatThrownBy(() -> GuidanceSearch.requireSearch("x".repeat(201)))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("q must be at most " + GuidanceSearch.MAX_SEARCH_LENGTH + " characters");
    }

    @Test
    void theQueryBoundAcceptsExactlyTheBound() {
        assertThat(GuidanceSearch.requireSearch("x".repeat(GuidanceSearch.MAX_SEARCH_LENGTH)))
                .hasSize(GuidanceSearch.MAX_SEARCH_LENGTH);
    }

    @Test
    void aNullOrBlankTermMatchesEverything() {
        assertThat(GuidanceSearch.matchesPost(post("T", "<p>b</p>"), null, List.of(), null)).isTrue();
        assertThat(GuidanceSearch.matchesPost(post("T", "<p>b</p>"), null, List.of(), "   ")).isTrue();
    }

    @Test
    void aScopedReadWithARowMatchesOnlyTheRow() {
        // The IT's own scenario: an en-home post with an et translation.
        GuidancePost home = post("Estonian shelter guide", "<p>en body</p>");
        GuidanceTranslation et = row("et", "Eestikeelne keldri juhend", "<p>et keha</p>");

        // The row IS the rendered content: a home-only term does not match...
        assertThat(GuidanceSearch.matchesPost(home, et, List.of(), "Estonian")).isFalse();
        // ...a row term matches (the match is what you see).
        assertThat(GuidanceSearch.matchesPost(home, et, List.of(), "keldri")).isTrue();
    }

    @Test
    void aScopedReadWithoutARowFallsBackToTheHomeColumns() {
        GuidancePost home = post("Estonian shelter guide", "<p>en body</p>");
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(), "Estonian")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(), "keldri")).isFalse();
    }

    @Test
    void anUnscopedReadMatchesTheHomeColumnsOrAnyCoveredRow() {
        GuidancePost home = post("Estonian shelter guide", "<p>en body</p>");
        GuidanceTranslation et = row("et", "Eestikeelne keldri juhend", "<p>et keha</p>");

        // The translation's text hits the post with no locale given...
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(et), "keldri")).isTrue();
        // ...and so does the home content; an absent word matches nothing.
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(et), "Estonian")).isTrue();
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(et), "absent word")).isFalse();
        // No rows at all: the home columns alone.
        assertThat(GuidanceSearch.matchesPost(home, null, List.of(), "en body")).isTrue();
    }
}
