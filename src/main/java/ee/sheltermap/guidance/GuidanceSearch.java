package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceTranslation;

import java.util.List;
import java.util.Locale;

/**
 * The admin guidance search match (admin-guidance-search) — the one
 * search vocabulary of the guidance feature: the searchable text of a
 * post/translation body and the case-insensitive substring match over
 * the title + stripped body.
 *
 * <p>Extracted from {@link GuidanceService}: these static
 * helpers were the de-facto cross-feature utility API of the guidance
 * service — the admin list's search (api.AdminGuidanceController) used
 * them, which is why a controller outside the feature reached into the
 * service class for a pure string operation. They live here, in the
 * feature's own seam, where the search policy (no ranking, no fuzzy
 * matching, markup is not a feature) has one home. The admin list's
 * query bound ({@link #requireSearch}) and its post-level match
 * ({@link #matchesPost}) live here too — moved from that controller.
 *
 * <p>{@code GuidanceService.searchableBody}/{@code matchesSearch} remain
 * as delegates — the pre-extraction public surface (the
 * {@code GuidanceServiceTest} seam stays green by construction).
 */
public final class GuidanceSearch {

    /** The admin search-term bound: a present q over this is a 400. */
    public static final int MAX_SEARCH_LENGTH = 200;

    private GuidanceSearch() {
    }

    /**
     * The admin list's query bound (admin-guidance-search): absent or
     * blank = no filter ({@code null} — the public {@code q}-less
     * behaviour, never a 400); a present-but-over-long value is a 400
     * (the uniform vocabulary, the locale bound's shape). The trimmed
     * term otherwise.
     *
     * @throws GuidanceValidationException 400 — a present q over
     *                                     {@link #MAX_SEARCH_LENGTH}
     */
    public static String requireSearch(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String trimmed = q.trim();
        if (trimmed.length() > MAX_SEARCH_LENGTH) {
            throw new GuidanceValidationException("q must be at most "
                    + MAX_SEARCH_LENGTH + " characters");
        }
        return trimmed;
    }

    /**
     * The body's searchable text: every HTML tag
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
     * The admin list's search match: a case-
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

    /**
     * The admin list's post-level match: does the post match the search
     * term over EXACTLY the content the read renders for it. A scoped
     * read passes the locale's row as {@code renderedRow} — the row IS
     * the rendered content, so when a row exists the home columns are
     * NOT searched (the match is what you see). A read whose rendered
     * content is the home columns passes {@code null} there — the
     * post's home IS the scoped locale (no row), or the read is
     * unscoped — and the match then covers the home columns plus every
     * row in {@code otherRows} (an unscoped read covers any locale's
     * content). A null/blank term matches everything.
     */
    public static boolean matchesPost(GuidancePost post, GuidanceTranslation renderedRow,
                                      List<GuidanceTranslation> otherRows, String query) {
        if (query == null) {
            return true;
        }
        if (renderedRow != null) {
            return matchesSearch(renderedRow.getTitle(), renderedRow.getBodyHtml(), query);
        }
        if (matchesSearch(post.getTitle(), post.getBodyHtml(), query)) {
            return true;
        }
        for (GuidanceTranslation row : otherRows) {
            if (matchesSearch(row.getTitle(), row.getBodyHtml(), query)) {
                return true;
            }
        }
        return false;
    }
}
