package ee.sheltermap.api;

import java.time.Instant;

/**
 * The admin view of one guidance translation (bilingual-guidance, V26) — the
 * row set behind {@code GET /admin/guidance/{id}/translations} and the response
 * of the create / update / attach endpoints. {@code bodyHtml} is the stored
 * (sanitized) HTML — the editor round-trips exactly what is stored (D2).
 * {@code heroImageAlt} is the per-locale alt for the post's shared hero image.
 */
public record GuidanceTranslationDto(
        long id,
        long postId,
        String locale,
        String slug,
        String title,
        String bodyHtml,
        String heroImageAlt,
        Instant createdAt,
        Instant updatedAt) {
}
