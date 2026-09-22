package ee.sheltermap.guidance;

import java.util.Locale;

/**
 * The admin guidance search match (admin-guidance-search) — the one
 * search vocabulary of the guidance feature: the searchable text of a
 * post/translation body and the case-insensitive substring match over
 * the title + stripped body.
 *
 * <p>Extracted from {@link GuidanceService} (W3-A): these static
 * helpers were the de-facto cross-feature utility API of the guidance
 * service — the admin list's search (api.AdminGuidanceController) used
 * them, which is why a controller outside the feature reached into the
 * service class for a pure string operation. They live here, in the
 * feature's own seam, where the search policy (no ranking, no fuzzy
 * matching, markup is not a feature) has one home.
 *
 * <p>{@code GuidanceService.searchableBody}/{@code matchesSearch} remain
 * as delegates — the pre-extraction public surface (the
 * {@code GuidanceServiceTest} seam stays green by construction).
 */
public final class GuidanceSearch {

    /** The admin search-term bound (admin-guidance-search): a present q over this is a 400. */
    public static final int MAX_SEARCH_LENGTH = 200;

    private GuidanceSearch() {
    }

    /**
     * The body's searchable text (admin-guidance-search): every HTML tag
     * stripped, the remaining whitespace collapsed to single spaces, the
     * ends trimmed. {@code <p>hello</p>} -> "hello" — a search for markup
     * is not a feature (the sanitizer keeps only the allowed tags, so a
     * stripped body is the reader's text). Null-safe (null -> "").
     */
    public static String searchableBody(String bodyHtml) {
        if (bodyHtml == null) {
            return "";
        }
        return bodyHtml.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
    }

    /**
     * The admin list's search match (admin-guidance-search): a case-
     * insensitive SUBSTRING over the title and the tag-stripped body — no
     * ranking, no fuzzy matching. A blank/absent needle matches everything
     * (no filter: the public {@code q}-less behaviour, never a 400).
     * The caller passes the SAME title/body the list renders (the scoped
     * locale's row or the home columns), so search matches what you see.
     */
    public static boolean matchesSearch(String title, String bodyHtml, String needle) {
        if (needle == null || needle.isBlank()) {
            return true;
        }
        String n = needle.trim().toLowerCase(Locale.ROOT);
        if (n.isEmpty()) {
            return true;
        }
        if (title != null && title.toLowerCase(Locale.ROOT).contains(n)) {
            return true;
        }
        return searchableBody(bodyHtml).toLowerCase(Locale.ROOT).contains(n);
    }
}
