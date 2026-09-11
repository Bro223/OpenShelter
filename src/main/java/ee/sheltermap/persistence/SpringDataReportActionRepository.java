package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

/** Spring Data repository for {@link ReportActionEntity} — internal to the persistence layer. */
public interface SpringDataReportActionRepository extends JpaRepository<ReportActionEntity, Long> {

    /** Actions of one user since {@code since} — the trailing-hour throttle count (D3). */
    long countByUserIdAndCreatedAtAfter(Long userId, Instant since);
}
