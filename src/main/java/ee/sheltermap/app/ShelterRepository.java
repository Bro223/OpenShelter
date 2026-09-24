package ee.sheltermap.app;

import ee.sheltermap.domain.BoundingBox;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link Shelter}. Real implementation in
 * {@code ee.sheltermap.persistence}; tests use an in-memory fake.
 */
public interface ShelterRepository {

    void save(Shelter shelter);

    Optional<Shelter> findByExternalId(String externalId);

    /** Reads one shelter by id (contract from 05-shelter-api.puml). */
    Optional<Shelter> findById(Long id);

    /** Deletes rows of {@code source} whose externalId is NOT in the keep-list; returns count. */
    int deleteBySourceAndExternalIdNotIn(ShelterSource source, List<String> externalIds);

    List<Shelter> findAll();

    /**
     * The public list projection (shelter-trust-and-reports): only
     * {@code ACTIVE} rows — auto-hidden shelters disappear from the map
     * and list. Owner ({@link #findByCreatedBy}) and admin listings keep
     * all statuses.
     */
    List<Shelter> findAllActiveBySourceIn(List<ShelterSource> sources);

    /**
     * The public list projection restricted to a viewport
     * (shelter-bbox-paging): {@code ACTIVE} rows of the given sources
     * whose coordinates fall inside the inclusive {@code bbox} — the same
     * stable id-ascending order as {@link #findAllActiveBySourceIn}.
     */
    List<Shelter> findAllActiveBySourceInWithin(List<ShelterSource> sources, BoundingBox bbox);

    /**
     * Paged public list read (real paging, not a slice over the
     * whole corpus): the rows of ONE page of the public projection —
     * {@code ACTIVE} rows of {@code sources} inside the optional
     * {@code bbox} (null = everywhere), with the trust filters pushed
     * into the SQL so the DB work scales with the page: {@code
     * hasCapacity} (null = either, else capacity data present/absent) and
     * the provenance column pair ({@code provenanceSource},
     * {@code provenanceReviewStatus}; null = either) — the exact
     * (source, reviewStatus) pair of the derived provenance the caller
     * filtered on. Stable id-ascending order, LIMIT/OFFSET; the caller
     * validates the bounds ({@code ee.sheltermap.api.Pagination}).
     */
    List<Shelter> findActivePage(List<ShelterSource> sources, BoundingBox bbox, Boolean hasCapacity,
                                 ShelterSource provenanceSource, ReviewStatus provenanceReviewStatus,
                                 long offset, int limit);

    /**
     * Paged admin list read: EVERY status (the admin view, unlike
     * the public projection), the optional exact {@code status} and
     * {@code sources} filters and the case-insensitive name/address
     * substring {@code qPattern} (the caller lowercases and LIKE-escapes;
     * null = no search), stable id-ascending, LIMIT/OFFSET.
     */
    List<Shelter> findAdminPage(ShelterStatus status, List<ShelterSource> sources, String qPattern,
                                long offset, int limit);

    /**
     * The count twin of {@link #findAdminPage}: the filtered length
     * WITHOUT paging — the {@code X-Total-Count} header value (always
     * present on the admin list endpoints, filtered length, not page size).
     */
    long countAdminPage(ShelterStatus status, List<ShelterSource> sources, String qPattern);

    /**
     * The caller's shelters with the given source/status — the input of
     * the per-user active-shelter cap (shelter-trust-and-reports).
     */
    long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source, ShelterStatus status);

    /**
     * The user's USER submissions created since {@code createdAtAfter}
     * (abuse-limits) — the input of the per-user DAILY submission cap.
     * Deletions free the count (rows are gone); the active cap and the
     * admin surface cover the churn vector.
     */
    long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                    Instant createdAtAfter);

    /**
     * The user's USER submissions in one review state — the first input of
     * the derived reporter trust weight (community-self-moderation).
     */
    long countByCreatedByAndSourceAndReviewStatus(Long createdBy, ShelterSource source,
                                                  ReviewStatus reviewStatus);

    /** The oldest USER submission since {@code createdAtAfter} — Retry-After for the daily cap. */
    Optional<Shelter> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, Instant createdAtAfter);

    /** All shelters created by {@code userId} — the author-scoped "my shelters" query (V7). */
    List<Shelter> findByCreatedBy(Long userId);

    /** Batched read by id (one query — name resolution without N+1). */
    List<Shelter> findByIds(Collection<Long> ids);

    /** Deletes the row with {@code id} (a no-op when absent); reports and occupancy cascade via the DB. */
    void deleteById(Long id);
}
