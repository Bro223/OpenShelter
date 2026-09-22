package ee.sheltermap.guidance;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The extracted search seam (W3-A) directly: the searchable-text
 * derivation and the match rule in {@link GuidanceSearch} — the
 * {@code GuidanceService} delegates (the pre-extraction public surface)
 * are covered by {@code GuidanceServiceTest}, this suite covers the
 * class that now owns the policy.
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
    void theSearchTermBoundIsTwenty() {
        // the admin list's q bound (admin-guidance-search) — a present q
        // over this is a 400 (the controller enforces it).
        assertThat(GuidanceSearch.MAX_SEARCH_LENGTH).isEqualTo(200);
    }

    @Test
    void theServiceDelegateIsTheSamePolicy() {
        // the pre-extraction public surface delegates — same answers, by
        // construction and by test.
        assertThat(GuidanceService.searchableBody("<p>hello</p>"))
                .isEqualTo(GuidanceSearch.searchableBody("<p>hello</p>"));
        assertThat(GuidanceService.matchesSearch("T", "<p>b</p>", "b"))
                .isEqualTo(GuidanceSearch.matchesSearch("T", "<p>b</p>", "b"));
    }
}
