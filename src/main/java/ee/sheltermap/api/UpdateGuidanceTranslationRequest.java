package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code PUT /admin/guidance/{id}/translations/{locale}} body — a FULL replace of the translation's content. The locale is
 * the PATH key and never moves here. {@code slug} is optional: the translation
 * KEEPS its current slug when it is omitted; when given it must not collide
 * with another translation in the same locale (409 naming the slug). The body is
 * re-sanitized. {@code heroImageAlt} {@code null} clears the per-locale alt.
 */
public record UpdateGuidanceTranslationRequest(
        @Size(max = 200) String slug,
        @NotBlank @Size(max = 255) String title,
        @NotBlank String body,
        @Size(max = 300) String heroImageAlt) {
}
