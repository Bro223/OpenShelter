package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /admin/guidance/{id}/translations} body (bilingual-guidance, V26).
 *
 * <p>Creates a translation of the post in a NEW locale. {@code locale} is
 * required (VARCHAR(5)); the post must not already have a translation there
 * (409). {@code slug} is optional: absent the server generates one from the
 * title; when given it is validated to the generated shape and must be
 * free WITHIN the locale (409 naming the slug). The stored body is the
 * sanitizer output. {@code heroImageAlt} is the per-locale alt for the
 * post's shared hero image (the image reference itself is post-level).
 */
public record CreateGuidanceTranslationRequest(
        @NotBlank @Size(max = 5) String locale,
        @Size(max = 200) String slug,
        @NotBlank @Size(max = 255) String title,
        @NotBlank String body,
        @Size(max = 300) String heroImageAlt) {
}
