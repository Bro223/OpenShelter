package ee.sheltermap.guidance;

import org.junit.jupiter.api.Test;

import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The extracted validation seam directly: the locale and slug
 * rules in {@link GuidanceValidation}. The {@code GuidanceService}
 * delegates ({@code MAX_LOCALE_LENGTH}, {@code optionalAdminLocale}) are
 * covered by {@code GuidanceServiceTest}; this suite covers the class
 * that now owns the rules — the exact 400 vocabulary included, since the
 * frozen admin suite asserts on those messages.
 */
class GuidanceValidationTest {

    // ------------------------------------------------------------- locale

    @Test
    void requireLocaleRequiresTrimAndBoundsAtTheColumnWidth() {
        assertThat(GuidanceValidation.requireLocale("et")).isEqualTo("et");
        assertThat(GuidanceValidation.requireLocale("  et  ")).isEqualTo("et");

        assertThatThrownBy(() -> GuidanceValidation.requireLocale(null))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale is required");
        assertThatThrownBy(() -> GuidanceValidation.requireLocale("   "))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale is required");
        // VARCHAR(5) column: 6 characters cannot match any stored row.
        assertThatThrownBy(() -> GuidanceValidation.requireLocale("et-EE-LV"))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale must be at most 5 characters");
    }

    @Test
    void resolveLocaleDefaultsNullToTheConfiguredLocale() {
        // the public-read rule: absent = default, present = required.
        assertThat(GuidanceValidation.resolveLocale(null, "et")).isEqualTo("et");
        assertThat(GuidanceValidation.resolveLocale("  de ", "et")).isEqualTo("de");
        assertThatThrownBy(() -> GuidanceValidation.resolveLocale("", "et"))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale must not be blank");
        assertThatThrownBy(() -> GuidanceValidation.resolveLocale("et-EE-LV", "et"))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale must be at most 5 characters");
    }

    @Test
    void localeOrDefaultDefaultsNullAndBlankToTheConfiguredLocale() {
        // the write rule: absent OR blank = the configured primary
        // language — a present value is trimmed but not defaulted.
        assertThat(GuidanceValidation.localeOrDefault(null, "et")).isEqualTo("et");
        assertThat(GuidanceValidation.localeOrDefault("  ", "et")).isEqualTo("et");
        assertThat(GuidanceValidation.localeOrDefault(" en ", "et")).isEqualTo("en");
    }

    @Test
    void optionalAdminLocalePassesNullThroughAndValidatesTheRest() {
        // An absent locale means the legacy locale-blind read.
        assertThat(GuidanceValidation.optionalAdminLocale(null)).isNull();
        assertThat(GuidanceValidation.optionalAdminLocale("ru")).isEqualTo("ru");
        assertThatThrownBy(() -> GuidanceValidation.optionalAdminLocale(" "))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale must not be blank");
        assertThatThrownBy(() -> GuidanceValidation.optionalAdminLocale("et-EE-LV"))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("locale must be at most 5 characters");
    }

    @Test
    void theLocaleBoundIsTheColumnWidth() {
        assertThat(GuidanceValidation.MAX_LOCALE_LENGTH).isEqualTo(5);
    }

    // --------------------------------------------------------------- slug

    private static final Predicate<String> TAKEN_FIRST_ONLY =
            slug -> "kelder-juhend".equals(slug);

    @Test
    void aBlankSuppliedSlugKeepsTheCurrentOne() {
        assertThat(GuidanceValidation.resolveSuppliedSlug(null, "current", s -> true))
                .isEqualTo("current");
        assertThat(GuidanceValidation.resolveSuppliedSlug("   ", "current", s -> true))
                .isEqualTo("current");
        // no current slug (a create) and nothing supplied: the caller
        // routes to generation, and a null result here would be a bug —
        // the blank case returns the CURRENT value, which is null on a
        // create, so the create path must not call it for blanks.
        assertThat(GuidanceValidation.resolveSuppliedSlug(null, null, s -> true)).isNull();
    }

    @Test
    void aSuppliedSlugMustMatchTheGeneratedShape() {
        Predicate<String> free = s -> false;
        assertThatThrownBy(() -> GuidanceValidation.resolveSuppliedSlug("Kelder", null, free))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most "
                        + SlugFactory.MAX_SLUG_LENGTH + " characters");
        assertThatThrownBy(() -> GuidanceValidation.resolveSuppliedSlug("ka_elder", null, free))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most "
                        + SlugFactory.MAX_SLUG_LENGTH + " characters");
        assertThatThrownBy(() -> GuidanceValidation.resolveSuppliedSlug("ka elder", null, free))
                .isInstanceOf(GuidanceValidationException.class)
                .hasMessage("slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most "
                        + SlugFactory.MAX_SLUG_LENGTH + " characters");
    }

    @Test
    void aSlugEqualToTheCurrentOneIsANoOpNotACollision() {
        // even when "taken" — the row owns it.
        assertThat(GuidanceValidation.resolveSuppliedSlug("current", "current", s -> true))
                .isEqualTo("current");
    }

    @Test
    void aCollisionIsA409NamingTheSlug() {
        assertThatThrownBy(() -> GuidanceValidation.resolveSuppliedSlug("taken", null, s -> true))
                .isInstanceOf(SlugAlreadyUsedException.class)
                .hasMessage("Slug 'taken' is already in use");
    }

    @Test
    void theGeneratedSlugWalksCollisionsWithASuffix() {
        assertThat(GuidanceValidation.nextGeneratedSlug("Kelder juhend", s -> false))
                .isEqualTo("kelder-juhend");
        // the base is taken: -2, then the first free value.
        assertThat(GuidanceValidation.nextGeneratedSlug("Kelder juhend", TAKEN_FIRST_ONLY))
                .isEqualTo("kelder-juhend-2");
        Predicate<String> takenUntilThree =
                slug -> "kelder-juhend".equals(slug) || "kelder-juhend-2".equals(slug);
        assertThat(GuidanceValidation.nextGeneratedSlug("Kelder juhend", takenUntilThree))
                .isEqualTo("kelder-juhend-3");
    }
}
