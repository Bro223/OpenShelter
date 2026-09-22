package ee.sheltermap.persistence;

import ee.sheltermap.domain.OpenStatusState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterOpenStatusReportEntity} — internal to the persistence layer. */
public interface SpringDataShelterOpenStatusReportRepository
        extends JpaRepository<ShelterOpenStatusReportEntity, Long> {

    Optional<ShelterOpenStatusReportEntity> findByShelterIdAndUserId(Long shelterId, Long userId);

    /** Fresh rows only (the 2 h read-time window) — the batched projection input. */
    List<ShelterOpenStatusReportEntity> findByShelterIdInAndCreatedAtAfter(Collection<Long> shelterIds,
                                                                           Instant freshSince);

    /** Distinct users whose current live state matches (the auto-confirm
     *  tally input) — one row per (shelter, user) by the unique constraint. */
    @Query("select distinct r.userId from ShelterOpenStatusReportEntity r " +
            "where r.shelterId = :shelterId and r.state = :state")
    List<Long> userIdsByShelterIdAndState(@Param("shelterId") Long shelterId,
                                          @Param("state") OpenStatusState state);
}
