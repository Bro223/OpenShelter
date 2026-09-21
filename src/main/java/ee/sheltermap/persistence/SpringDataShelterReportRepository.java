package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Spring Data repository for {@link ShelterReportEntity} — internal to the persistence layer. */
public interface SpringDataShelterReportRepository extends JpaRepository<ShelterReportEntity, Long> {

    boolean existsByShelterIdAndUserIdAndType(Long shelterId, Long userId,
                                              ee.sheltermap.domain.ShelterReportType type);

    /** One row per (shelter, user): [userId, damped] of the given type;
     *  admin-dismissed rows are excluded (the dismissal is the admin's
     *  invalid verdict — the report stops influencing the tally). */
    @Query("select r.userId, r.damped from ShelterReportEntity r " +
            "where r.shelterId = :shelterId and r.type = :type and r.dismissedAt is null")
    List<Object[]> reportersByShelterAndType(@Param("shelterId") Long shelterId,
                                              @Param("type") ee.sheltermap.domain.ShelterReportType type);

    /** One row per (shelter, type): [shelterId, type, count] — the batched
     *  projection input; admin-dismissed rows count in none of them (the
     *  dismissed report stops influencing the displayed counts). */
    @Query("select r.shelterId, r.type, count(r) from ShelterReportEntity r " +
            "where r.shelterId in :ids and r.dismissedAt is null group by r.shelterId, r.type")
    List<Object[]> countByTypeForShelterIds(@Param("ids") Collection<Long> ids);

    /** One row per (shelter, user): [shelterId, userId, newest createdAt] of the given type.
     *  Admin-dismissed rows are excluded, like every other read of this table:
     *  the dismissal is the admin's invalid verdict, so the report stops
     *  influencing anything - the shelter's "Last verified" stamp included. */
    @Query("select r.shelterId, r.userId, max(r.createdAt) from ShelterReportEntity r " +
            "where r.shelterId in :ids and r.type = :type and r.dismissedAt is null " +
            "group by r.shelterId, r.userId")
    List<Object[]> latestByShelterAndUserForShelterIdsAndType(@Param("ids") Collection<Long> ids,
                                                              @Param("type") ee.sheltermap.domain.ShelterReportType type);

    /** One shelter's reports, newest first, capped at the {@code limit}
     *  most recent rows (the admin queue); created_at ties break by id
     *  desc. The cap is the LIMIT clause — the queue table is append-only,
     *  so the bound belongs in the SQL, not in an in-memory trim. */
    @Query("select r from ShelterReportEntity r "
            + "where r.shelterId = :shelterId "
            + "order by r.createdAt desc, r.id desc limit :limit")
    List<ShelterReportEntity> findLatestByShelterId(@Param("shelterId") Long shelterId,
                                                    @Param("limit") int limit);

    /** Every report, newest first, capped at the {@code limit} most recent
     *  rows (the admin queue without a shelter filter). Served by
     *  idx_shelter_reports_created (V30): the ORDER BY matches the
     *  composite, so the read is an index scan of the newest rows. */
    @Query("select r from ShelterReportEntity r "
            + "order by r.createdAt desc, r.id desc limit :limit")
    List<ShelterReportEntity> findLatest(@Param("limit") int limit);
}
