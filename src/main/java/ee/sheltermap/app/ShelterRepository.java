package ee.sheltermap.app;

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
 * {@code ee.sheltermap.persistence} (Step 3); tests use an in-memory fake.
 */
public interface ShelterRepository {

    void save(Shelter shelter);

    Optional<Shelter> findByExternalId(String externalId);

    /** Reads one shelter by id (contract from 05-shelter-api.puml). */
    Optional<Shelter> findById(Long id);

    void saveAll(List<Shelter> shelters);

    /** Deletes rows of {@code source} whose externalId is NOT in the keep-list; returns count. */
    int deleteBySourceAndExternalIdNotIn(ShelterSource source, List<String> externalIds);

    List<Shelter> findAll();

    List<Shelter> findAllBySourceIn(List<ShelterSource> sources);

    /**
     * The public list projection (shelter-trust-and-reports D5): only
     * {@code ACTIVE} rows — auto-hidden shelters disappear from the map
     * and list. Owner ({@link #findByCreatedBy}) and admin listings keep
     * all statuses.
     */
    List<Shelter> findAllActiveBySourceIn(List<ShelterSource> sources);

    /**
     * The caller's shelters with the given source/status — the input of
     * the per-user active-shelter cap (shelter-trust-and-reports D3).
     */
    long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source, ShelterStatus status);

    /**
     * The user's USER submissions created since {@code createdAtAfter}
     * (abuse-limits M3) — the input of the per-user DAILY submission cap.
     * Deletions free the count (rows are gone); the active cap and the
     * admin surface cover the churn vector.
     */
    long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                    Instant createdAtAfter);

    /**
     * The user's USER submissions in one review state — the first input of
     * the derived reporter trust weight (community-self-moderation M9, D1).
     */
    long countByCreatedByAndSourceAndReviewStatus(Long createdBy, ShelterSource source,
                                                  ReviewStatus reviewStatus);

    /** The oldest USER submission since {@code createdAtAfter} — Retry-After for the daily cap. */
    Optional<Shelter> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, Instant createdAtAfter);

    /** All shelters created by {@code userId} — the author-scoped "my shelters" query (V7). */
    List<Shelter> findByCreatedBy(Long userId);

    /**
     * The admin "Unconfirmed" queue (community-review-queue v2): the
     * ACTIVE shelters of one source in one review state, id-ordered
     * (same stable order as the other listings, B7a). The queue itself
     * is USER + NEW.
     */
    List<Shelter> findActiveBySourceAndReviewStatus(ShelterSource source, ReviewStatus reviewStatus);

    /** Batched read by id (one query — name resolution without N+1). */
    List<Shelter> findByIds(Collection<Long> ids);

    /** Deletes the row with {@code id} (a no-op when absent); reviews cascade via the DB. */
    void deleteById(Long id);
}
