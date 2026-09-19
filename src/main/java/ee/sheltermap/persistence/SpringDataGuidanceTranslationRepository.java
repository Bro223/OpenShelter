package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Spring Data repository for {@link GuidanceTranslationEntity} — internal to
 * the persistence layer (bilingual-guidance, V26).
 */
public interface SpringDataGuidanceTranslationRepository
        extends JpaRepository<GuidanceTranslationEntity, Long> {

    /** The post's one translation in a locale — at most one (V26 uniqueness). */
    GuidanceTranslationEntity findByPostIdAndLocale(Long postId, String locale);

    /** Every translation of a post, in locale order (the admin detail / alternates). */
    List<GuidanceTranslationEntity> findAllByPostIdOrderByLocaleAsc(Long postId);

    /**
     * Every translation row holding a slug, in ANY locale, deterministic
     * (locale, id) order. The public detail resolves a URL slug through this.
     */
    List<GuidanceTranslationEntity> findBySlugOrderByLocaleAscIdAsc(String slug);

    boolean existsByPostIdAndLocale(Long postId, String locale);

    /** The (locale, slug) uniqueness pre-check (a collision answers 409). */
    boolean existsByLocaleAndSlug(String locale, String slug);

    /**
     * The public index read: the translation rows of PUBLISHED posts that have
     * a translation in {@code locale}, in the public index order (pinned first,
     * the post's published_at desc, the post id desc tie-break). Native, because
     * the order keys sit on the joined post row, not the translation row.
     */
    @Query(value = "SELECT t.* FROM guidance_post_translations t "
            + "JOIN guidance_posts p ON p.id = t.post_id "
            + "WHERE t.locale = :locale AND p.status = 'PUBLISHED' "
            + "ORDER BY p.pinned DESC, p.published_at DESC, p.id DESC",
            nativeQuery = true)
    List<GuidanceTranslationEntity> findPublishedInLocale(@Param("locale") String locale);

    /** The hard-delete cascade of a post onto its translations (D8). */
    @Modifying
    @Query("delete from GuidanceTranslationEntity t where t.postId = :postId")
    void deleteAllByPostId(@Param("postId") Long postId);
}
