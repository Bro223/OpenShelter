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

    /** Every post, drafts included, in the stored manual order (the admin list). */
    List<GuidancePostEntity> findAllByOrderBySortOrderAscIdDesc();

    /**
     * Every post, drafts included, in the GLOBAL stored manual order
     * (admin-locale-scope): sort_order asc, published_at desc with
     * NULLS LAST (a draft's NULL stamp ranks after any stamped instant —
     * the V28 backfill's tie-break rule), id desc.
     */
    @Query(value = "SELECT * FROM guidance_posts "
            + "ORDER BY sort_order ASC, published_at DESC NULLS LAST, id DESC", nativeQuery = true)
    List<GuidancePostEntity> findAllInStoredGlobalOrder();

    /** The posts using one asset as their hero; the id tie-break keeps the 409 list stable. */
    List<GuidancePostEntity> findByHeroImageIdOrderByUpdatedAtDescIdDesc(Long heroImageId);

    /** One row per referenced asset: [heroImageId, post count] — the batched
     * reused-by count / in-use check (no N+1); unreferenced assets are absent. */
    @Query("select p.heroImageId, count(p) from GuidancePostEntity p "
            + "where p.heroImageId is not null group by p.heroImageId")
    List<Object[]> countsByHeroImageId();

    /** The highest stored manual position, or null when there are no posts
     * (guidance-manual-order: create appends max + 1). */
    @Query("select max(p.sortOrder) from GuidancePostEntity p")
    Integer maxSortOrder();
}
