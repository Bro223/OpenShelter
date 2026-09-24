package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

/** Spring Data repository for {@link ReportActionEntity} — internal to the persistence layer. */
public interface SpringDataReportActionRepository extends JpaRepository<ReportActionEntity, Long> {

    /** Actions of one user since {@code since} — the trailing-hour throttle count. */
    long countByUserIdAndCreatedAtAfter(Long userId, Instant since);

    /**
     * The oldest of one user's in-window actions — anchors the report
     * throttle's {@code Retry-After}. Explicit {@code @Query} (not a
     * derived name): the derived form {@code minCreatedAtByUserIdAndCreatedAtAfter}
     * mis-parses (the parser reads {@code minCreatedAtByUserId} as a
     * property), and the JPQL is unambiguous.
     */
    @Query("select min(a.createdAt) from ReportActionEntity a where a.userId = :userId and a.createdAt > :since")
    Instant minCreatedAtByUserIdAndCreatedAtAfter(@Param("userId") Long userId, @Param("since") Instant since);
}
