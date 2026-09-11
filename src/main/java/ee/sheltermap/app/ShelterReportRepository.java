package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link ShelterReport} (shelter-trust-and-reports D1).
 * Implementations live in {@code ee.sheltermap.persistence}; tests use
 * in-memory fakes.
 */
public interface ShelterReportRepository {

    /** One row per (shelter, type): the batched projection input (no N+1). */
    record ReportTypeCount(long shelterId, ShelterReportType type, long count) {
    }

    void save(ShelterReport report);

    boolean existsByShelterIdAndUserIdAndType(long shelterId, long userId, ShelterReportType type);

    long countByShelterIdAndType(long shelterId, ShelterReportType type);

    /**
     * Report counts by type for all given shelter ids in ONE query.
     * (shelter, type) pairs without reports are absent from the result
     * (caller treats "missing" as count 0).
     */
    List<ReportTypeCount> countByTypeForShelterIds(Collection<Long> shelterIds);

    /** Reads one report by id (admin queue dismissal); empty when unknown (admin-moderation D3). */
    Optional<ShelterReport> findById(Long id);

    /** One shelter's reports, newest first (the admin queue, admin-moderation D3). */
    List<ShelterReport> findByShelterId(long shelterId);

    /** Every report, newest first (the admin queue without a shelter filter). */
    List<ShelterReport> findAll();
}
