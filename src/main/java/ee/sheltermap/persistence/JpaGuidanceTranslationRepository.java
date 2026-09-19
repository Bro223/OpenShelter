package ee.sheltermap.persistence;

import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.guidance.GuidanceTranslationRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link GuidanceTranslationRepository} (bilingual-
 * guidance, V26). The (post_id, locale) and (locale, slug) uniquenesses are
 * enforced by the database constraints — a duplicate surfaces as a
 * {@code DataIntegrityViolationException} (the service pre-checks with
 * {@code existsBy*} and maps the expected duplicate to 409).
 *
 * <p>{@code updated_at} moves on every write (the {@code GuidancePost} rule):
 * the domain's write methods carry their own instants, so the update path
 * stamps from the injected Clock and syncs the stamp back onto the domain
 * object — one rule for every write.
 */
@Repository
public class JpaGuidanceTranslationRepository implements GuidanceTranslationRepository {

    private final SpringDataGuidanceTranslationRepository translations;
    private final Clock clock;

    public JpaGuidanceTranslationRepository(SpringDataGuidanceTranslationRepository translations, Clock clock) {
        this.translations = Objects.requireNonNull(translations, "translations");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    @Transactional
    public GuidanceTranslation save(GuidanceTranslation translation) {
        GuidanceTranslationEntity entity;
        if (translation.getId() != null) {
            // UPDATE path: mutate the MANAGED row in place (the house idiom),
            // then stamp updated_at from the Clock (it moves on every write).
            entity = translations.findById(translation.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save guidance translation with unknown id " + translation.getId()));
            GuidanceTranslationMapper.toEntity(entity, translation);
            entity.setUpdatedAt(clock.instant());
        } else {
            // INSERT path: fresh entity; the domain owns the creation stamps
            // (forPost(...) sets createdAt = updatedAt = now) — the columns
            // are NOT NULL, so the values are written, not defaulted.
            entity = new GuidanceTranslationEntity();
            GuidanceTranslationMapper.toEntity(entity, translation);
            entity.setUpdatedAt(translation.getUpdatedAt());
        }
        translations.save(entity);
        translation.setId(entity.getId());
        translation.setUpdatedAt(entity.getUpdatedAt());
        return translation;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<GuidanceTranslation> findById(long id) {
        return translations.findById(id).map(GuidanceTranslationMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<GuidanceTranslation> findByPostIdAndLocale(long postId, String locale) {
        return Optional.ofNullable(translations.findByPostIdAndLocale(postId, locale))
                .map(GuidanceTranslationMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidanceTranslation> findAllByPostId(long postId) {
        return translations.findAllByPostIdOrderByLocaleAsc(postId).stream()
                .map(GuidanceTranslationMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidanceTranslation> findAllByLocale(String locale) {
        return translations.findAllByLocaleOrderByPostIdAscIdAsc(locale).stream()
                .map(GuidanceTranslationMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidanceTranslation> findBySlug(String slug) {
        return translations.findBySlugOrderByLocaleAscIdAsc(slug).stream()
                .map(GuidanceTranslationMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByPostIdAndLocale(long postId, String locale) {
        return translations.existsByPostIdAndLocale(postId, locale);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByLocaleAndSlug(String locale, String slug) {
        return translations.existsByLocaleAndSlug(locale, slug);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidanceTranslation> findPublishedInLocale(String locale) {
        return translations.findPublishedInLocale(locale).stream()
                .map(GuidanceTranslationMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public void delete(GuidanceTranslation translation) {
        translations.deleteById(translation.getId());
        // Force the SQL DELETE to run NOW (the JpaGuidancePostRepository idiom):
        // a follow-up read in the same transaction must already see the row gone.
        translations.flush();
    }

    @Override
    @Transactional
    public void deleteAllByPostId(long postId) {
        translations.deleteAllByPostId(postId);
        translations.flush();
    }
}
