package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data repository for {@link SiteTextEntity} — internal to the
 * persistence layer (site_texts, V27). The table is tiny (at most one
 * row per allowlist key per locale — a few dozen rows), so the public
 * read is a plain findAll; no pagination, no query DSL.
 */
public interface SpringDataSiteTextRepository extends JpaRepository<SiteTextEntity, Long> {

    /** The one stored override for (key, locale) — at most one (V27 uniqueness). */
    Optional<SiteTextEntity> findByKeyAndLocale(String key, String locale);
}
