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

    long countByShelterIdAndType(Long shelterId, ee.sheltermap.domain.ShelterReportType type);

    /** One row per (shelter, type): [shelterId, type, count] — the batched projection input. */
    @Query("select r.shelterId, r.type, count(r) from ShelterReportEntity r " +
            "where r.shelterId in :ids group by r.shelterId, r.type")
    List<Object[]> countByTypeForShelterIds(@Param("ids") Collection<Long> ids);

    /** One row per (shelter, user): [shelterId, userId, newest createdAt] of the given type (M8). */
    @Query("select r.shelterId, r.userId, max(r.createdAt) from ShelterReportEntity r " +
            "where r.shelterId in :ids and r.type = :type group by r.shelterId, r.userId")
    List<Object[]> latestByShelterAndUserForShelterIdsAndType(@Param("ids") Collection<Long> ids,
                                                              @Param("type") ee.sheltermap.domain.ShelterReportType type);

    /** One shelter's reports, newest first (the admin queue); created_at ties break by id desc. */
    List<ShelterReportEntity> findByShelterIdOrderByCreatedAtDescIdDesc(Long shelterId);

    /** Every report, newest first (the admin queue without a shelter filter). */
    List<ShelterReportEntity> findAllByOrderByCreatedAtDescIdDesc();
}
