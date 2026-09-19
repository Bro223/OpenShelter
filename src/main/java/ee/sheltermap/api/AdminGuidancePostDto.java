package ee.sheltermap.api;

import ee.sheltermap.domain.GuidanceStatus;

import java.time.Instant;

/**
 * The admin guidance post (crisis-guidance D3) — the full field set
 * behind {@code GET /admin/guidance} (every post, drafts included, in the
 * stored manual order) and {@code GET /admin/guidance/{id}}.
 *
 * <p>{@code bodyHtml} is the stored (sanitized) HTML — the editor
 * round-trips exactly what is stored (D2/D9). The hero fields are the
 * full reference: {@code heroImageId} (the media-library picker's key),
 * the serving {@code heroImageUrl} and the stored alt — all three
 * {@code null} when the post has no hero. {@code heroImportUrl} is the
 * PENDING hero import (guidance-hero-import): the admin-supplied remote
 * URL consumed at the next publish ({@code null} when the hero is a
 * plain library reference — a published post always carries none).
 *
 * <p>Locale scope (admin-locale-scope): the content fields ({@code title},
 * {@code slug}, {@code bodyHtml}, {@code heroImageAlt}) are served in ONE
 * locale — {@code locale} names it. The UNscoped read (no {@code ?locale=})
 * serves the post's HOME-locale content, so {@code locale} equals
 * {@code homeLocale}; the scoped read (the admin UI always sends the active
 * UI language) serves that locale's translation when the post has one, or
 * the home columns when the post's home locale IS the requested one. The
 * post's home locale — the one whose content lives in the post row's own
 * columns — is always {@code homeLocale}.
 *
 * <p>{@code sortOrder} is the post's stored manual position
 * (guidance-manual-order D1): the shared slot every translation of the
 * post sorts by (the public index orders by it ascending, with the
 * {@code publishedAt}/{@code id} tie-breakers).
 */
public record AdminGuidancePostDto(
        long id,
        String slug,
        String title,
        String bodyHtml,
        /** The locale of the content carried by this DTO (the home locale on the unscoped read). */
        String locale,
        /** The post's home locale — the locale of the post row's own content columns. */
        String homeLocale,
        GuidanceStatus status,
        boolean pinned,
        /** The stored manual position (the shared slot, guidance-manual-order D1). */
        int sortOrder,
        Long heroImageId,
        String heroImageUrl,
        String heroImageAlt,
        String heroImportUrl,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt) {
}
