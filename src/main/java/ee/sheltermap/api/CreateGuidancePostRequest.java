package ee.sheltermap.api;

import ee.sheltermap.domain.GuidanceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /admin/guidance} body (crisis-guidance D3/D4/D5/D11).
 *
 * <p>The bean constraints MIRROR the service rules (the service re-checks
 * everything — it is the authority, the annotations are the early 400).
 * {@code slug} is optional: absent the server generates one from the
 * title (D5); when given it is validated to the generated shape and used
 * exactly as given (collision → 409 naming the slug). {@code status} is
 * optional: absent (or DRAFT) the post is created as a draft, an explicit
 * PUBLISHED makes it a one-shot "write and publish" (D4). {@code locale}
 * defaults from {@code app.guidance.default-locale} when omitted (D11).
 * {@code heroImageId} + {@code heroImageAlt}: the alt is mandatory iff
 * the hero is set — the cross-field rule the service enforces (400).
 */
public record CreateGuidancePostRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 200) String slug,
        @NotBlank String body,
        @Size(max = 5) String locale,
        boolean pinned,
        Long heroImageId,
        @Size(max = 300) String heroImageAlt,
        GuidanceStatus status) {
}
