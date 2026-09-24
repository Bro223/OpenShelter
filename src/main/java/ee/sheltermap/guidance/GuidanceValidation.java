package ee.sheltermap.guidance;

import java.util.function.Predicate;

/**
 * The guidance locale/slug validation vocabulary (extracted from
 * {@link GuidanceService}).
 *
 * <p>The locale: the VARCHAR(5) column bound and the three distinct
 * absences — a PRESENT-but-blank value on a public read is a 400 (an
 * explicit {@code ?locale=} is a request, not an absence), a required
 * locale that is absent/blank is a 400, and an omitted POST-home locale
 * defaults from the configured primary language (no 400). The
 * messages differ on purpose (the pre-extraction wording, pinned by the
 * suite) — one home for all of them is the point.
 *
 * <p>The slug: the shape rule and the no-op rule spelled ONCE, here, so
 * the post and translation endpoints cannot answer differently — the
 * collision predicate is the post table for posts and (locale, slug)
 * for translations, parameterised by {@code slugTaken}.
 */
final class GuidanceValidation {

    /** The locale column width ({@code guidance_posts.locale VARCHAR(5)}) — the service bound. */
    static final int MAX_LOCALE_LENGTH = 5;

    private GuidanceValidation() {
    }

    /**
     * The reader's requested locale, or the configured default when the
     * parameter is ABSENT ({@code null}). A PRESENT but blank value is a
     * 400 (an explicit {@code ?locale=} is a request, not an absence),
     * and a value longer than the VARCHAR(5) column is a 400 too: it
     * cannot match any stored row, so the 400 is the honest answer
     * instead of a silent empty list. The value is trimmed — a stray
     * space is a client typo, not a locale.
     */
    static String resolveLocale(String locale, String defaultLocale) {
        if (locale == null) {
            return defaultLocale;
        }
        String trimmed = locale.trim();
        if (trimmed.isEmpty()) {
            throw new GuidanceValidationException("locale must not be blank");
        }
        return requireLocaleLength(trimmed);
    }

    /**
     * The OPTIONAL admin locale: {@code null} when
     * the parameter is ABSENT (the admin read stays locale-blind — the
     * legacy all-languages behaviour), a 400 when present but blank or
     * over-long. The admin UI always sends the active UI language; the
     * absent parameter exists for the API's backwards compatibility, not
     * as a "default language" (unlike the public reads).
     */
    static String optionalAdminLocale(String locale) {
        if (locale == null) {
            return null;
        }
        String trimmed = locale.trim();
        if (trimmed.isEmpty()) {
            throw new GuidanceValidationException("locale must not be blank");
        }
        return requireLocaleLength(trimmed);
    }

    /**
     * The locale required, trimmed, and bounded by the VARCHAR(5) column
     * (400).
     */
    static String requireLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            throw new GuidanceValidationException("locale is required");
        }
        return requireLocaleLength(locale.trim());
    }

    /** Locale defaults from the configured primary language when omitted. */
    static String localeOrDefault(String locale, String defaultLocale) {
        return locale == null || locale.isBlank() ? defaultLocale : locale.trim();
    }

    private static String requireLocaleLength(String trimmed) {
        if (trimmed.length() > MAX_LOCALE_LENGTH) {
            throw new GuidanceValidationException(
                    "locale must be at most " + MAX_LOCALE_LENGTH + " characters");
        }
        return trimmed;
    }

    /**
     * The admin-supplied slug, used exactly as given: validated to
     * the generated shape (400) and refused on a collision (409 naming
     * the slug). On an update, a blank slug keeps the current one, and
     * a slug equal to the current one is a no-op, not a collision. The
     * collision predicate is the post table for posts and (locale, slug)
     * for translations — the shape rule and the no-op rule are spelled
     * ONCE, here, so the post and translation endpoints cannot answer
     * differently.
     */
    static String resolveSuppliedSlug(String supplied, String currentSlug,
                                      Predicate<String> slugTaken) {
        if (supplied == null || supplied.isBlank()) {
            return currentSlug;
        }
        String slug = supplied.trim();
        if (!SlugFactory.isValidCustomSlug(slug)) {
            throw new GuidanceValidationException(
                    "slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most "
                            + SlugFactory.MAX_SLUG_LENGTH + " characters");
        }
        if (slug.equals(currentSlug)) {
            return slug;
        }
        if (slugTaken.test(slug)) {
            throw new SlugAlreadyUsedException(slug);
        }
        return slug;
    }

    /**
     * The auto-generated slug: from the title; a collision — with a
     * draft OR a published post, the uniqueness spans both — takes
     * {@code -2}, {@code -3}, ... and takes the first free value. The
     * translation variant scopes the same walk to the locale through the
     * {@code slugTaken} predicate.
     */
    static String nextGeneratedSlug(String title, Predicate<String> slugTaken) {
        String base = SlugFactory.of(title);
        if (!slugTaken.test(base)) {
            return base;
        }
        for (int suffix = 2; ; suffix++) {
            String candidate = base + "-" + suffix;
            if (!slugTaken.test(candidate)) {
                return candidate;
            }
        }
    }
}
