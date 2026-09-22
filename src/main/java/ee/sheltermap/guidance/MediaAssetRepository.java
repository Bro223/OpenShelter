package ee.sheltermap.guidance;

import ee.sheltermap.domain.MediaAsset;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Persistence seam for {@link MediaAsset} (crisis-guidance D7/D8).
 * Implementations live in {@code ee.sheltermap.persistence}; tests use
 * the in-memory fake in the test tree.
 *
 * <p>Assets are immutable once stored (no update path); deleting a row
 * never touches the posts that reference it structurally — the FK's
 * {@code ON DELETE SET NULL} clears {@code hero_image_id}, and the
 * service clears the alt in the same transaction (D8).
 */
public interface MediaAssetRepository {

    /** Inserts the asset; returns it with its id assigned. */
    MediaAsset save(MediaAsset asset);

    Optional<MediaAsset> findById(long id);

    /** The stored filename (32 hex + extension) is the public serving URL name. */
    Optional<MediaAsset> findByStoredFilename(String storedFilename);

    /** The library listing: newest first ({@code createdAt} descending, {@code id} descending). */
    List<MediaAsset> findAll();

    /**
     * Batched read by id (W2-A): the hero lookup for the guidance lists —
     * ONE query over the page's hero ids, not a read of the whole library
     * (the pre-W2-A hero index loaded every asset for every list request).
     * Missing ids are simply absent from the result.
     */
    List<MediaAsset> findByIds(Collection<Long> ids);

    /**
     * A page of the library listing (W2-A — the owner's "every admin list
     * pages" rule): the SAME newest-first order as {@link #findAll()},
     * OFFSET/LIMIT in the store (the caller validates the bounds —
     * {@code ee.sheltermap.api.Pagination}).
     */
    List<MediaAsset> findPage(long offset, int limit);

    /**
     * The library's asset count WITHOUT paging (the W2-A
     * {@code X-Total-Count} header value for the media list).
     */
    long countAll();

    /**
     * The reused-by count per referenced asset in ONE batched query
     * (the media library listing and the in-use check, D8 — no N+1).
     * Assets no post references are ABSENT from the map (count 0).
     */
    Map<Long, Long> referencedCountsByAssetId();

    /** Deletes the row; the file removal is the storage layer's job (D7). */
    void delete(MediaAsset asset);
}
