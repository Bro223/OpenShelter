package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Spring Data repository for {@link ShelterOccupancyReportEntity} — internal to the persistence layer. */
public interface SpringDataShelterOccupancyReportRepository
        extends JpaRepository<ShelterOccupancyReportEntity, Long> {

    Optional<ShelterOccupancyReportEntity> findByShelterIdAndUserId(Long shelterId, Long userId);

    /** Fresh rows only (the 2 h read-time window, D4) — the batched projection input. */
    List<ShelterOccupancyReportEntity> findByShelterIdInAndUpdatedAtAfter(Collection<Long> shelterIds,
                                                                          Instant freshSince);
}
