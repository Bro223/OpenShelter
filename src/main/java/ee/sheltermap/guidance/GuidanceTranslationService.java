package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceTranslation;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * The per-locale translation rows of a guidance post — the translation
 * seam extracted from {@link GuidanceService}: the create / update /
 * delete / list of a post's translation rows, the "attach an existing
 * post as a translation" move, and the home-row sync every post write
 * runs (every post owns at least one translation row — its own — so the
 * public reads, which key off translations, see the post in its own
 * locale).
 *
 * <p>This class is deliberately NOT a Spring bean: {@code GuidanceService}
 * (whose constructor the unit suite freezes at its seven collaborators)
 * constructs it from its own translation repository and clock, and its
 * public {@code createTranslation} / {@code updateTranslation} /
 * {@code deleteTranslation} / {@code listTranslations} /
 * {@code attachExistingPostAsTranslation} methods remain the
 * {@code @Transactional} entry points — the post's 404 (the service's
 * {@code requirePost}) runs BEFORE any call here, so a missing post still
 * answers 404 and a missing translation still answers the post's 404.
 *
 * <p>The (locale, slug) uniqueness is the locale's own namespace — the
 * same shape rules the post slugs use, via {@link GuidanceValidation} —
 * and the stored body is the sanitizer's OUTPUT, as for every write.
 */
public class GuidanceTranslationService {

    private final GuidanceTranslationRepository translations;
    private final Clock clock;

    public GuidanceTranslationService(GuidanceTranslationRepository translations, Clock clock) {
        this.translations = Objects.requireNonNull(translations, "translations");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * Creates a translation for a post in a locale it does not already
     * have. The slug is generated from the title when omitted (the same
     * shape rules); an explicit slug is validated and must be free WITHIN
     * the locale (409 naming it). The stored body is the sanitizer
     * output.
     */
    public GuidanceTranslation createTranslation(long postId, String locale, String slug,
                                                 String title, String body, String heroImageAlt) {
        Instant now = clock.instant();
        String cleanLocale = GuidanceValidation.requireLocale(locale);
        GuidanceValidation.CleanedContent content = GuidanceValidation.cleanedContent(title, body, heroImageAlt);
        if (translations.existsByPostIdAndLocale(postId, cleanLocale)) {
            throw new GuidanceValidationException(
                    "post already has a " + cleanLocale + " translation — update or delete it first");
        }
        String finalSlug = slug == null || slug.isBlank()
                ? GuidanceValidation.nextGeneratedSlug(content.title(),
                        candidate -> translations.existsByLocaleAndSlug(cleanLocale, candidate))
                : GuidanceValidation.resolveSuppliedSlug(slug, null,
                        candidate -> translations.existsByLocaleAndSlug(cleanLocale, candidate));
        return translations.save(GuidanceTranslation.forPost(postId, cleanLocale, finalSlug,
                content.title(), content.bodyHtml(), content.heroAlt(), now));
    }

    /**
     * Full replace of a translation's content (the locale is the KEY — it
     * never moves here). The slug is kept when omitted; the body is
     * re-sanitized.
     */
    public GuidanceTranslation updateTranslation(long postId, String locale, String slug,
                                                 String title, String body, String heroImageAlt) {
        String cleanLocale = GuidanceValidation.requireLocale(locale);
        GuidanceTranslation translation = translations.findByPostIdAndLocale(postId, cleanLocale)
                .orElseThrow(() -> new GuidanceNotFoundException(GuidanceService.POST_NOT_FOUND_MESSAGE));
        Instant now = clock.instant();
        GuidanceValidation.CleanedContent content = GuidanceValidation.cleanedContent(title, body, heroImageAlt);
        String finalSlug = GuidanceValidation.resolveSuppliedSlug(slug, translation.getSlug(),
                candidate -> translations.existsByLocaleAndSlug(cleanLocale, candidate));
        translation.update(finalSlug, content.title(), content.bodyHtml(), content.heroAlt(), now);
        return translations.save(translation);
    }

    /**
     * Deletes a post's translation in a locale. A post's HOME-locale
     * translation cannot be deleted — it is the post's own content
     * (unpublish or delete the post instead). Deleting a linked locale's
     * translation simply unlinks it.
     */
    public void deleteTranslation(long postId, String locale, String homeLocale) {
        String cleanLocale = GuidanceValidation.requireLocale(locale);
        GuidanceTranslation translation = translations.findByPostIdAndLocale(postId, cleanLocale)
                .orElseThrow(() -> new GuidanceNotFoundException(GuidanceService.POST_NOT_FOUND_MESSAGE));
        if (cleanLocale.equals(homeLocale)) {
            throw new GuidanceValidationException(
                    "the post's own-locale (" + cleanLocale + ") translation cannot be deleted — "
                            + "unpublish or delete the post instead");
        }
        translations.delete(translation);
    }

    /** A post's translations, in locale order (the admin detail / alternates editor). */
    public List<GuidanceTranslation> listTranslations(long postId) {
        return translations.findAllByPostId(postId);
    }

    /**
     * The "attach an existing post as a translation" convenience:
     * re-parents the source post's home-locale translation onto the
     * target post. It is a MOVE, not a copy — the (locale, slug) pair
     * travels with the row, so the locale-slug uniqueness holds and the
     * source stops claiming the slug publicly (the source is left a shell
     * with no translations, which the admin may hard-delete). The target
     * must not already have a translation in that locale (409).
     */
    public GuidanceTranslation attachExistingPostAsTranslation(long targetPostId, GuidancePost source) {
        String locale = source.getLocale();
        if (translations.existsByPostIdAndLocale(targetPostId, locale)) {
            throw new GuidanceValidationException(
                    "target already has a " + locale + " translation — update or delete it first");
        }
        Instant now = clock.instant();
        return translations.findByPostIdAndLocale(source.getId(), locale)
                .map(t -> {
                    t.reparentTo(targetPostId, now);
                    return translations.save(t);
                })
                .orElseGet(() -> translations.save(GuidanceTranslation.forPost(
                        targetPostId, locale, source.getSlug(), source.getTitle(),
                        source.getBodyHtml(), source.getHeroImageAlt(), now)));
    }

    /**
     * Keeps the post's own-locale translation in sync with its home
     * content columns: every post owns at least one translation row, in
     * its own locale, and the public reads key off translations. An
     * existing row is upserted, not duplicated.
     */
    public void saveOwnTranslation(GuidancePost post, Instant now) {
        translations.findByPostIdAndLocale(post.getId(), post.getLocale())
                .ifPresentOrElse(
                        existing -> {
                            existing.update(post.getSlug(), post.getTitle(), post.getBodyHtml(),
                                    post.getHeroImageAlt(), now);
                            translations.save(existing);
                        },
                        () -> translations.save(GuidanceTranslation.forPost(post.getId(),
                                post.getLocale(), post.getSlug(), post.getTitle(),
                                post.getBodyHtml(), post.getHeroImageAlt(), now)));
    }
}
