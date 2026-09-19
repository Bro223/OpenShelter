package ee.sheltermap.sitetexts;

import ee.sheltermap.domain.SiteText;

import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link SiteText} (site_texts, V27). Implementations
 * live in {@code ee.sheltermap.persistence}; tests use the in-memory fake
 * in the test tree.
 *
 * <p>Uniqueness is structural (the V27 {@code uq_site_texts_key_locale}):
 * at most one row per (key, locale). The service pre-checks with
 * {@link #findByKeyAndLocale} for its upsert; the JPA implementation
 * flushes after writes so a follow-up read in the same transaction sees
 * the row (the house idiom).
 */
public interface SiteTextRepository {

    /** Every stored override (the public read — the table is tiny). */
    List<SiteText> findAll();

    /** The one stored override for (key, locale), when it exists. */
    Optional<SiteText> findByKeyAndLocale(String key, String locale);

    /** Inserts or updates the (key, locale) row; returns it with its id. */
    SiteText save(SiteText text);

    /** Deletes the row (a cleared admin field = "use the shipped default"). */
    void delete(long id);
}
