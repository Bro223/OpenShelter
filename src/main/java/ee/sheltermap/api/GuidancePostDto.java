package ee.sheltermap.api;

import java.time.Instant;

/**
 * The public guidance post (crisis-guidance D3/D6).
 *
 * <p>Served by {@code GET /api/guidance} (the index) and
 * {@code GET /api/guidance/{slug}} (the detail). The index does NOT
 * expose the post body — {@code bodyHtml} is {@code null} there and the
 * detail carries the stored (sanitized) HTML. The hero image is a
 * reference projection: {@code heroImageUrl} ({@code /api/media/<stored
 * filename>}) and {@code heroImageAlt} are BOTH {@code null} when the
 * post has no hero — the page then renders no image element at all (D1,
 * no placeholder, no broken state).
 *
 * <p>{@code locale} is a stored attribute returned verbatim (D11: v1 has
 * no translation workflow — posts in different locales are all listed).
 */
public record GuidancePostDto(
        String slug,
        String title,
        String bodyHtml,
        String heroImageUrl,
        String heroImageAlt,
        boolean pinned,
        String locale,
        Instant publishedAt,
        Instant updatedAt) {
}
