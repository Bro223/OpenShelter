package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;

import java.util.Collection;
import java.util.List;

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
}
