package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link GuidancePost}. Implementations live in {@code ee.sheltermap.persistence}; tests use
 * the in-memory fake in the test tree.
 *
 * <p>Ordering is part of the contract (the stable-order discipline —
 * same-value rows must not reorder between calls):
 * <ul>
 *   <li>{@link #findAllForAdmin()} — {@code sortOrder} ascending,
 *       {@code id} descending (the admin list is the live preview of
 *       the public order — the stored manual order, not the
 *       newest-updated order);</li>
 *   <li>{@link #findAllInStoredGlobalOrder()} — the GLOBAL manual order
 *       across every locale: {@code sortOrder} ascending, then
 *       {@code publishedAt} descending (nulls last — a draft's NULL
 *       stamp ranks after any stamped instant), {@code id} descending.
 *       The locale-scoped admin list and the locale-scoped reorder walk
 *       this order: the visible posts' SLOTS are their positions here;
 * </ul>
 *
 * <p>The PUBLISHED filter lives in the query itself: no code path
 * can leak a draft by forgetting a check in the mapping layer — a draft
 * slug and an unknown slug answer the same 404 because both read through
 * {@link #findPublishedBySlugAndLocale(String, String)}. The public reads
 * are locale-scoped the same way: a reader in one language only sees the
 * posts of that language (the locale rides in the query, never in memory),
 * while {@link #findAllForAdmin()} stays locale-blind — the admin sees
 * every language.
 */
public interface GuidancePostRepository {

    /** Inserts or updates the post; returns it with its id assigned. */
    GuidancePost save(GuidancePost post);

    Optional<GuidancePost> findById(long id);

    /**
     * Batched read by id: the public index's post load — ONE query over
     * the rows' post ids instead of one detail fetch per row (no
     * guidance-index N+1). Missing ids are simply absent from the result.
     */
    List<GuidancePost> findByIds(Collection<Long> ids);

    /** A draft holds a slug too — the slug is unique across all posts (the UNIQUE constraint). */
    Optional<GuidancePost> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Every post, drafts included, in the stored manual order (sortOrder asc, id desc tie-break). */
    List<GuidancePost> findAllForAdmin();

    /**
     * Every post, drafts included, in the GLOBAL stored manual order:
     * {@code sortOrder} ascending, {@code publishedAt} descending
     * (nulls last — drafts after stamped rows), {@code id} descending.
     * The locale-scoped admin list and the locale-scoped reorder both
     * walk this order, so the visible posts' slots are stable and the
     * two agree.
     */
    List<GuidancePost> findAllInStoredGlobalOrder();

    /**
     * The highest stored {@code sortOrder}, or 0 when there are no posts
     * (create appends {@code max + 1} — a new draft sits at the bottom of
     * the admin list, a created-and-published post at the end of the
     * non-pinned block).
     */
    int maxSortOrder();

    /**
     * The public detail read in ONE locale — a DRAFT slug, a slug whose
     * post is in ANOTHER locale, and an unknown slug all answer empty.
     */
    Optional<GuidancePost> findPublishedBySlugAndLocale(String slug, String locale);

    /** The posts currently using the media asset as their hero image (the reused-by count and the in-use check). */
    List<GuidancePost> findByHeroImageId(long mediaAssetId);

    /**
     * Hard delete: the media assets stay in the library (uploads are
     * are inventory, not garbage), and the post's audit rows keep their
     * label snapshot.
     */
    void delete(GuidancePost post);
}
