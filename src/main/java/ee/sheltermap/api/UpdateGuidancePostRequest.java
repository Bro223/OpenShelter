package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code PUT /admin/guidance/{id}} body — a FULL
 * replace of the editable fields, same mirror-of-the-service-rules
 * constraints as {@link CreateGuidancePostRequest}.
 *
 * <p>{@code slug} is optional and the post KEEPS its current slug when it
 * is omitted; when given it must not collide with another post
 * (409 naming the slug). {@code status} is NOT an editable field here —
 * the publication state moves only through the publish/unpublish
 * endpoints (their stamps own {@code publishedAt}).
 * {@code heroImageId} {@code null} clears the hero (the previous asset
 * stays in the library). {@code heroImportUrl}
 * {@code null} clears the import URL; a non-null URL is fetched, validated
 * and stored AT SAVE, draft or published alike (the trigger) — a
 * failed import never blocks the update (the response's
 * {@code heroImportError} names it, the URL is kept for a retry).
 */
public record UpdateGuidancePostRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 200) String slug,
        @NotBlank String body,
        @Size(max = 5) String locale,
        boolean pinned,
        Long heroImageId,
        @Size(max = 300) String heroImageAlt,
        @Size(max = 2048) String heroImportUrl) {
}
