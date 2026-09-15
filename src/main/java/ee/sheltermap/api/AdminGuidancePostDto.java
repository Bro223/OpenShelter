package ee.sheltermap.api;

import ee.sheltermap.domain.GuidanceStatus;

import java.time.Instant;

/**
 * The admin guidance post (crisis-guidance D3) — the full field set
 * behind {@code GET /admin/guidance} (every post, drafts included,
 * newest-updated first) and {@code GET /admin/guidance/{id}}.
 *
 * <p>{@code bodyHtml} is the stored (sanitized) HTML — the editor
 * round-trips exactly what is stored (D2/D9). The hero fields are the
 * full reference: {@code heroImageId} (the media-library picker's key),
 * the serving {@code heroImageUrl} and the stored alt — all three
 * {@code null} when the post has no hero.
 */
public record AdminGuidancePostDto(
        long id,
        String slug,
        String title,
        String bodyHtml,
        String locale,
        GuidanceStatus status,
        boolean pinned,
        Long heroImageId,
        String heroImageUrl,
        String heroImageAlt,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt) {
}
