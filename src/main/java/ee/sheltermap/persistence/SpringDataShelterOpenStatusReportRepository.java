package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

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
}
