package ee.sheltermap.api;

import java.time.Instant;
import java.util.Map;

/**
 * The public guidance post (crisis-guidance).
 *
 * <p>Served by {@code GET /api/guidance} (the index) and
 * {@code GET /api/guidance/{slug}} (the detail). The index does NOT
 * expose the post body — {@code bodyHtml} is {@code null} there and the
 * detail carries the stored (sanitized) HTML. The hero image is a
 * reference projection: {@code heroImageUrl} ({@code /api/media/<stored
 * filename>}) and {@code heroImageAlt} are BOTH {@code null} when the
 * post has no hero — the page then renders no image element at all (
 * no placeholder, no broken state).
 *
 * <p>{@code locale} is the SERVED translation's locale (the language the
 * reader is actually reading). {@code alternates} (bilingual-guidance)
 * maps each locale that has a translation to that translation's slug —
 * the field the frontend language switcher follows to open the SAME page
 * in another language; it is populated on the detail and {@code null} on
 * the index (kept lean). {@code localeFallback} is {@code true} when the
 * reader's requested locale had no translation and the default-locale one
 * was served instead — a 200 with the flag, never a 404, so a language
 * switch never dead-ends on a "no such page" error.
 *
 * <p>{@code heroImageSrcset} (additive) is the hero's derivative
 * {@code srcset} string — one {@code w} descriptor per derivative that
 * EXISTS on disk, in ascending width order, or {@code null} when the post's
 * asset has none (a WebP original, a pre-feature upload) — the slot then
 * renders the original via plain {@code heroImageUrl}.
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
        Instant updatedAt,
        Map<String, String> alternates,
        boolean localeFallback,
        /** the hero's derivative {@code srcset} (one {@code w} descriptor per derivative on disk); null = plain src. */
        String heroImageSrcset) {
}
