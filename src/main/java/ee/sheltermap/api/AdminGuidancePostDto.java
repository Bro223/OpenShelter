package ee.sheltermap.api;

import ee.sheltermap.domain.GuidanceStatus;

import java.time.Instant;

/**
 * The admin guidance post — the full field set
 * behind {@code GET /admin/guidance} (every post, drafts included, in the
 * stored manual order) and {@code GET /admin/guidance/{id}}.
 *
 * <p>{@code bodyHtml} is the stored (sanitized) HTML — the editor
 * round-trips exactly what is stored. The hero fields are the
 * full reference: {@code heroImageId} (the media-library picker's key),
 * the serving {@code heroImageUrl} and the stored alt — all three
 * {@code null} when the post has no hero. {@code heroImportUrl} is the
 * hero's source URL: the admin-supplied remote
 * URL, fetched at SAVE time (draft or published). Kept after a successful
 * import as provenance (the imported asset's {@code source_url} records
 * the same origin); retryable after a failed one. {@code heroImportError}
 * is that import's failure on the save that produced this DTO — write
 * responses only (list/detail reads and successful saves answer null):
 * the post was still stored, the URL kept for a retry on the next save
 * (a failed import never blocks a save).
 *
 * <p>Locale scope: the content fields ({@code title},
 * {@code slug}, {@code bodyHtml}, {@code heroImageAlt}) are served in ONE
 * locale — {@code locale} names it. The UNscoped read (no {@code ?locale=})
 * serves the post's HOME-locale content, so {@code locale} equals
 * {@code homeLocale}; the scoped read (the admin UI always sends the active
 * UI language) serves that locale's translation when the post has one, or
 * the home columns when the post's home locale IS the requested one. The
 * post's home locale — the one whose content lives in the post row's own
 * columns — is always {@code homeLocale}.
 *
 * <p>{@code sortOrder} is the post's stored manual position: the
 * shared slot every translation of the post sorts by (the public
 * index orders by it ascending, with the
 * {@code publishedAt}/{@code id} tie-breakers).
 *
 * <p>{@code heroImageSrcset} (additive) is the hero's derivative
 * {@code srcset} string — one {@code w} descriptor per derivative that
 * EXISTS on disk, in ascending width order, or {@code null} when the post's
 * asset has none (a WebP original, a pre-feature upload) — the slot then
 * renders the original via plain {@code heroImageUrl}.
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
        /** The stored manual position — the shared slot. */
        int sortOrder,
        Long heroImageId,
        String heroImageUrl,
        String heroImageAlt,
        String heroImportUrl,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt,
        /** the hero's derivative {@code srcset} (one {@code w} descriptor per derivative on disk); null = plain src. */
        String heroImageSrcset,
        /** The hero import that FAILED at the save producing this DTO (write responses only —
         *  list/detail reads and successful saves answer null): the post was still stored, the
         *  URL kept for a retry — a failed import never blocks a save. */
        String heroImportError) {
}
