package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidanceTranslation;

import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link GuidanceTranslation} (bilingual-guidance, V26).
 * Implementations live in {@code ee.sheltermap.persistence}; tests use the
 * in-memory fake in the test tree.
 *
 * <p>Uniqueness is structural (the V26 constraints): {@code (post_id, locale)}
 * and {@code (locale, slug)}. The JPA implementation surfaces a duplicate as a
 * {@code DataIntegrityViolationException}; the service pre-checks with the
 * {@code existsBy*} methods and maps the expected duplicate to a readable 409.
 *
 * <p>Ordering is part of the contract for {@link #findPublishedInLocale}: the
 * public index order (pinned first, then the post's {@code publishedAt}
 * descending, the post id descending as the stable tie-break) — the locale
 * filter and the PUBLISHED filter both ride in the query, exactly as the
 * post-level public read did before this seam existed.
 */
public interface GuidanceTranslationRepository {

    /** Inserts or updates the translation row; returns it with its id assigned. */
    GuidanceTranslation save(GuidanceTranslation translation);

    Optional<GuidanceTranslation> findById(long id);

    /** The post's one translation in a locale — at most one (V26 uniqueness). */
    Optional<GuidanceTranslation> findByPostIdAndLocale(long postId, String locale);

    /** Every translation of a post, in locale order (the admin detail / alternates). */
    List<GuidanceTranslation> findAllByPostId(long postId);

    /**
     * Every translation row in ONE locale (the admin locale-scope read:
     * which posts have content in the locale, and the content itself —
     * one query, no per-post loop). Deterministic (post_id, id) order.
     */
    List<GuidanceTranslation> findAllByLocale(String locale);

    /**
     * Every translation row holding a slug, in ANY locale, deterministic
     * (locale, id) order. The public detail resolves a URL slug through this —
     * a slug is unique within a locale, so a well-formed slug names exactly one
     * row; a multi-row answer is a data anomaly the service refuses (404).
     */
    List<GuidanceTranslation> findBySlug(String slug);

    boolean existsByPostIdAndLocale(long postId, String locale);

    /** The (locale, slug) uniqueness pre-check (a collision answers 409). */
    boolean existsByLocaleAndSlug(String locale, String slug);

    /**
     * The public index read: the translation rows of PUBLISHED posts that have
     * a translation in {@code locale}, in the public index order (pinned first,
     * publishedAt desc, id desc). Each row carries the owning post id; the
     * service batch-loads the posts for the hero image, pinned and published
     * stamp (one extra read, no per-row N+1).
     */
    List<GuidanceTranslation> findPublishedInLocale(String locale);

    /** Deletes one row. */
    void delete(GuidanceTranslation translation);

    /** Deletes every translation of a post (the hard-delete cascade, D8). */
    void deleteAllByPostId(long postId);
}
