package ee.sheltermap.persistence;

import ee.sheltermap.domain.SiteText;
import ee.sheltermap.sitetexts.SiteTextRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link SiteTextRepository} (site_texts, V27).
 * The (key, locale) uniqueness is enforced by the V27 constraint; writes
 * flush so a follow-up read in the same transaction sees the row (the
 * house idiom).
 */
@Repository
public class JpaSiteTextRepository implements SiteTextRepository {

    private final SpringDataSiteTextRepository texts;

    public JpaSiteTextRepository(SpringDataSiteTextRepository texts) {
        this.texts = Objects.requireNonNull(texts, "texts");
    }

    @Override
    @Transactional(readOnly = true)
    public List<SiteText> findAll() {
        return texts.findAll().stream()
                .map(SiteTextMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SiteText> findByKeyAndLocale(String key, String locale) {
        return texts.findByKeyAndLocale(key, locale)
                .map(SiteTextMapper::toDomain);
    }

    @Override
    @Transactional
    public SiteText save(SiteText text) {
        SiteTextEntity entity;
        if (text.getId() != null) {
            // UPDATE path: mutate the MANAGED row in place (the house idiom).
            entity = texts.findById(text.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save site text with unknown id " + text.getId()));
            SiteTextMapper.toEntity(entity, text);
        } else {
            // INSERT path: the (key, locale) row is new (the service
            // pre-checked with findByKeyAndLocale for its upsert).
            entity = new SiteTextEntity();
            SiteTextMapper.toEntity(entity, text);
        }
        texts.save(entity);
        texts.flush();
        text.setId(entity.getId());
        return text;
    }

    @Override
    @Transactional
    public void delete(long id) {
        texts.deleteById(id);
        // Force the SQL DELETE to run NOW (the JpaGuidanceTranslationRepository
        // idiom): a follow-up read in the same transaction must see it gone.
        texts.flush();
    }
}
