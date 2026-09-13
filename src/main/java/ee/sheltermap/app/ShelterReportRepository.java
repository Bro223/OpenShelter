package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;

import java.time.Instant;
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

    /**
     * The newest {@code OPEN_CONFIRMED} report per (shelter, reporter) for
     * the given shelter ids in ONE query (last-verified-meta M8). The
     * reporter id rides along so the projection can drop the submitter's
     * own report — a self-confirm is never a verification. (shelter,
     * reporter) pairs without an OPEN_CONFIRMED report are absent from the
     * result.
     */
    record ConfirmedAt(long shelterId, long userId, Instant latestAt) {
    }

    /**
     * One distinct reporter of a given type for one shelter, with the
     * stored damp flag (community-self-moderation M9, D3) — the input of
     * the weighted auto-hide tally. The (shelter, user, type) uniqueness
     * makes one row per reporter.
     */
    record DampedReporter(long userId, boolean damped) {
    }

    void save(ShelterReport report);

    boolean existsByShelterIdAndUserIdAndType(long shelterId, long userId, ShelterReportType type);

    long countByShelterIdAndType(long shelterId, ShelterReportType type);

    /**
     * The distinct reporters of one type for one shelter with their damp
     * flag (M9, D3) — the weighted auto-hide tally input (one query).
     * Admin-dismissed reports are excluded — the dismissal is the admin's
     * invalid verdict, so the report stops influencing the tally.
     */
    List<DampedReporter> reportersByShelterIdAndType(long shelterId, ShelterReportType type);

    /**
     * Report counts by type for all given shelter ids in ONE query.
     * Admin-dismissed reports are excluded from every count (the dismissed
     * report stops influencing the displayed counts). (shelter, type) pairs
     * without reports are absent from the result (caller treats "missing"
     * as count 0).
     */
    List<ReportTypeCount> countByTypeForShelterIds(Collection<Long> shelterIds);

    /** Batched newest OPEN_CONFIRMED per (shelter, reporter) — the "last verified" input (M8). */
    List<ConfirmedAt> latestOpenConfirmedByShelterIds(Collection<Long> shelterIds);

    /** Reads one report by id (admin queue dismissal); empty when unknown (admin-moderation D3). */
    Optional<ShelterReport> findById(Long id);

    /** One shelter's reports, newest first (the admin queue, admin-moderation D3). */
    List<ShelterReport> findByShelterId(long shelterId);

    /** Every report, newest first (the admin queue without a shelter filter). */
    List<ShelterReport> findAll();
}
