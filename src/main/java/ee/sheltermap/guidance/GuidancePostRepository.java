package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;

import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link GuidancePost} (crisis-guidance D1/D4/D6).
 * Implementations live in {@code ee.sheltermap.persistence}; tests use
 * the in-memory fake in the test tree.
 *
 * <p>Ordering is part of the contract (the stable-order discipline —
 * same-timestamp rows must not reorder between calls):
 * <ul>
 *   <li>{@link #findAllForAdmin()} — {@code updatedAt} descending,
 *       {@code id} descending;</li>
 *   <li>{@link #findPublished(String)} — pinned first, then
 *       {@code publishedAt} descending, {@code id} descending (backed by
 *       the V23 partial index).</li>
 * </ul>
 *
 * <p>The PUBLISHED filter lives in the query itself (D4): no code path
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

    /** A draft holds a slug too — the slug is unique across all posts (the V23 constraint). */
    Optional<GuidancePost> findBySlug(String slug);

    boolean existsBySlug(String slug);

    /** Every post, drafts included, newest-updated first (the admin list). */
    List<GuidancePost> findAllForAdmin();

    /**
     * The public index order in ONE locale: pinned first, then
     * publishedAt descending, id descending. The locale is an exact
     * column match — the value is validated upstream (the column is
     * VARCHAR(5)).
     */
    List<GuidancePost> findPublished(String locale);

    /**
     * The public detail read in ONE locale — a DRAFT slug, a slug whose
     * post is in ANOTHER locale, and an unknown slug all answer empty.
     */
    Optional<GuidancePost> findPublishedBySlugAndLocale(String slug, String locale);

    /** The posts currently using the media asset as their hero image (D8: the reused-by count and the in-use check). */
    List<GuidancePost> findByHeroImageId(long mediaAssetId);

    /**
     * Hard delete (D4): the media assets stay in the library (uploads
     * are inventory, not garbage), and the post's audit rows keep their
     * label snapshot.
     */
    void delete(GuidancePost post);
}
