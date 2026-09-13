package ee.sheltermap.persistence;

import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterEntity} — internal to the persistence layer. */
public interface SpringDataShelterRepository extends JpaRepository<ShelterEntity, Long> {

    Optional<ShelterEntity> findByExternalId(String externalId);

    /** Stable order between requests (B7a): id-ascending, no arbitrary heap order. */
    List<ShelterEntity> findAllBySourceInOrderByIdAsc(Collection<ShelterSource> sources);

    /** Public list (V9, D5): the same stable order, ACTIVE rows only. */
    List<ShelterEntity> findAllBySourceInAndStatusOrderByIdAsc(Collection<ShelterSource> sources,
                                                               ShelterStatus status);

    /** Per-user active-shelter cap count (V9, D3). */
    long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source, ShelterStatus status);

    /** Per-user daily submission cap count (abuse-limits M3). */
    long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                    java.time.Instant createdAtAfter);

    /** Oldest USER submission since {@code createdAtAfter} — Retry-After for the daily cap. */
    java.util.Optional<ShelterEntity> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, java.time.Instant createdAtAfter);

    /** Stable order between requests (B7a): id-ascending, no arbitrary heap order. */
    List<ShelterEntity> findByCreatedByOrderByIdAsc(Long createdBy);

    /**
     * Admin "Unconfirmed" queue (V11, community-review-queue v2): one
     * source in one review state, ACTIVE rows only, stable id order.
     */
    List<ShelterEntity> findAllBySourceAndReviewStatusAndStatusOrderByIdAsc(
            ShelterSource source, ReviewStatus reviewStatus, ShelterStatus status);

    List<ShelterEntity> findByIdIn(Collection<Long> ids);

    /**
     * Bulk-deletes rows of {@code source} whose {@code externalId} is NOT in
     * the keep-list. Rows with NULL {@code externalId} never match (SQL NULL
     * semantics), so USER submissions are safe by construction.
     */
    @Modifying
    @Query("delete from ShelterEntity s where s.source = :source and s.externalId not in :externalIds")
    int deleteBySourceAndExternalIdNotIn(@Param("source") ShelterSource source,
                                         @Param("externalIds") Collection<String> externalIds);
}
