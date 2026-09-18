package ee.sheltermap.persistence;

import ee.sheltermap.domain.GuidanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link GuidancePostEntity} — internal to the persistence layer. */
public interface SpringDataGuidancePostRepository extends JpaRepository<GuidancePostEntity, Long> {

    /** A draft holds a slug too — the V23 unique constraint spans every post. */
    Optional<GuidancePostEntity> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** The public detail read in ONE locale — a draft slug and a slug whose
     *  post lives in another locale both answer empty, like an unknown slug. */
    Optional<GuidancePostEntity> findBySlugAndStatusAndLocale(String slug, GuidanceStatus status, String locale);

    /** Every post, drafts included, newest-updated first (the admin list, D4). */
    List<GuidancePostEntity> findAllByOrderByUpdatedAtDescIdDesc();

    /** The public index order (D6) in ONE locale — the locale filter rides
     *  in the same query as the status and ordering (no in-memory filter):
     *  pinned first, then published_at desc, id desc. */
    List<GuidancePostEntity> findByStatusAndLocaleOrderByPinnedDescPublishedAtDescIdDesc(GuidanceStatus status, String locale);

    /** The posts using one asset as their hero (D8); the id tie-break keeps the 409 list stable. */
    List<GuidancePostEntity> findByHeroImageIdOrderByUpdatedAtDescIdDesc(Long heroImageId);

    /** One row per referenced asset: [heroImageId, post count] — the batched
     *  reused-by count / in-use check (D8, no N+1); unreferenced assets are absent. */
    @Query("select p.heroImageId, count(p) from GuidancePostEntity p "
            + "where p.heroImageId is not null group by p.heroImageId")
    List<Object[]> countsByHeroImageId();
}
