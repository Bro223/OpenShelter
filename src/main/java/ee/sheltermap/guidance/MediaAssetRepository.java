package ee.sheltermap.guidance;

import ee.sheltermap.domain.MediaAsset;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Persistence seam for {@link MediaAsset}. Implementations live in {@code ee.sheltermap.persistence}; tests use
 * the in-memory fake in the test tree.
 *
 * <p>Assets are immutable once stored (no update path); deleting a row
 * never touches the posts that reference it structurally — the FK's
 * {@code ON DELETE SET NULL} clears {@code hero_image_id}, and the
 * service clears the alt in the same transaction.
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
     * Batched read by id: the hero lookup for the guidance lists — ONE
     * query over the rows' hero ids, not a read of the whole library.
     * Missing ids are simply absent from the result.
     */
    List<MediaAsset> findByIds(Collection<Long> ids);

    /**
     * A page of the library listing: the SAME newest-first order as
     * {@link #findAll()}, OFFSET/LIMIT in the store (the caller validates
     * the bounds — {@code ee.sheltermap.api.Pagination}).
     */
    List<MediaAsset> findPage(long offset, int limit);

    /**
     * The library's asset count WITHOUT paging (the
     * {@code X-Total-Count} header value for the media list).
     */
    long countAll();

    /**
     * The reused-by count per referenced asset in ONE batched query
     * (the media library listing and the in-use check — no N+1).
     * Assets no post references are ABSENT from the map (count 0).
     */
    Map<Long, Long> referencedCountsByAssetId();

    /** Deletes the row; the file removal is the storage layer's job. */
    void delete(MediaAsset asset);
}
