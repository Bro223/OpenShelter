package ee.sheltermap.persistence;

import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterEntity} — internal to the persistence layer. */
public interface SpringDataShelterRepository extends JpaRepository<ShelterEntity, Long> {

    Optional<ShelterEntity> findByExternalId(String externalId);

    /** Public list (V9): the same stable order, ACTIVE rows only. */
    List<ShelterEntity> findAllBySourceInAndStatusOrderByIdAsc(Collection<ShelterSource> sources,
                                                               ShelterStatus status);

    /**
     * Public list with the viewport filter: inclusive
     * BETWEEN on both coordinates, the same stable id-ascending order. Backed
     * by the V23.1 composite index on (latitude, longitude) — no PostGIS
     * (a B-tree is enough at Estonia scale).
     */
    List<ShelterEntity> findAllBySourceInAndStatusAndLatitudeBetweenAndLongitudeBetweenOrderByIdAsc(
            Collection<ShelterSource> sources, ShelterStatus status, double minLat, double maxLat,
            double minLng, double maxLng);

    /** Per-user active-shelter cap count (V9). */
    long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source, ShelterStatus status);

    /** Per-user daily submission cap count. */
    long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                    Instant createdAtAfter);

    /** Derived reporter trust input. */
    long countByCreatedByAndSourceAndReviewStatus(Long createdBy, ShelterSource source,
                                                  ReviewStatus reviewStatus);

    /** Oldest USER submission since {@code createdAtAfter} — Retry-After for the daily cap. */
    Optional<ShelterEntity> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, Instant createdAtAfter);

    /** Stable order between requests: id-ascending, no arbitrary heap order. */
    List<ShelterEntity> findByCreatedByOrderByIdAsc(Long createdBy);

    List<ShelterEntity> findByIdIn(Collection<Long> ids);

    /**
     * Paged public list and admin list reads live in
     * {@link JpaShelterRepository} as DYNAMIC native queries: a static
     * "(:p IS NULL OR ...)" predicate shape is an unpredictable boolean
     * expression that the planner cannot constant-fold — it seq-scans the
     * whole table even for LIMIT 1 (measured), which would defeat the
     * paging cost model. Building the WHERE from the predicates that are
     * actually present lets a bounded page ride the PK index.
     */

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
