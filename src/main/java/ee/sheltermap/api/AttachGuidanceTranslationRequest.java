package ee.sheltermap.api;

import jakarta.validation.constraints.NotNull;

/**
 * {@code POST /admin/guidance/{id}/translations/attach} body.
 *
 * <p>Attaches an EXISTING post as a translation of this one: the
 * {@code sourcePostId}'s home-locale translation row is re-parented onto the
 * target post — a MOVE, not a copy, so the (locale, slug) pair travels with the
 * row and the V26 uniqueness holds. The source is left a shell (no
 * translations) that the admin may hard-delete. The target must not already
 * have a translation in the source's locale (409). This is the
 * operator's pairing convenience; the plain create endpoint is the general path.
 */
public record AttachGuidanceTranslationRequest(
        @NotNull Long sourcePostId) {
}
