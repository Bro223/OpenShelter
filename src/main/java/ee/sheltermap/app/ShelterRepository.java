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
     * The public list projection (shelter-trust-and-reports D5): only
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
     * The caller's shelters with the given source/status — the input of
     * the per-user active-shelter cap (shelter-trust-and-reports D3).
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
     * the derived reporter trust weight (community-self-moderation, D1).
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
