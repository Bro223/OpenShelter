package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterReportRepository} (approach B).
 * Uniqueness of {@code (shelterId, userId, type)} is enforced by the
 * database constraint {@code uq_shelter_reports_shelter_user_type} — a
 * duplicate insert surfaces as a {@code DataIntegrityViolationException}
 * (the service pre-checks and maps the expected duplicate to 409).
 */
@Repository
public class JpaShelterReportRepository implements ShelterReportRepository {

    private final SpringDataShelterReportRepository reports;

    public JpaShelterReportRepository(SpringDataShelterReportRepository reports) {
        this.reports = Objects.requireNonNull(reports, "reports");
    }

    @Override
    @Transactional
    public void save(ShelterReport report) {
        if (report.getId() != null) {
            // UPDATE path (the admin dismissal stamp, V10): mutate the
            // managed row in place — a fresh-entity merge would re-insert
            // against the primary key. The (shelter, user, type) identity
            // fields never change after insert; only the stamp is mutable.
            ShelterReportEntity entity = reports.findById(report.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save report with unknown id " + report.getId()));
            applyFields(entity, report);
            reports.save(entity);
            return;
        }
        ShelterReportEntity entity = new ShelterReportEntity();
        applyFields(entity, report);
        ShelterReportEntity saved = reports.save(entity);
        report.setId(saved.getId());
    }

    /** Copies every domain field onto the entity (insert or update). */
    private static void applyFields(ShelterReportEntity entity, ShelterReport report) {
        entity.setShelterId(report.getShelterId());
        entity.setUserId(report.getUserId());
        entity.setType(report.getType());
        entity.setDetail(report.getDetail());
        entity.setCreatedAt(report.getCreatedAt());
        entity.setDismissedAt(report.getDismissedAt());
        entity.setDamped(report.isDamped());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByShelterIdAndUserIdAndType(long shelterId, long userId,
                                                     ShelterReportType type) {
        return reports.existsByShelterIdAndUserIdAndType(shelterId, userId, type);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DampedReporter> reportersByShelterIdAndType(long shelterId, ShelterReportType type) {
        return reports.reportersByShelterAndType(shelterId, type).stream()
                .map(row -> new DampedReporter(
                        ((Number) row[0]).longValue(),
                        (Boolean) row[1]))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportTypeCount> countByTypeForShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return List.of();
        }
        return reports.countByTypeForShelterIds(shelterIds).stream()
                .map(row -> new ReportTypeCount(
                        ((Number) row[0]).longValue(),
                        (ShelterReportType) row[1],
                        ((Number) row[2]).longValue()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConfirmedAt> latestOpenConfirmedByShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return List.of();
        }
        return reports.latestByShelterAndUserForShelterIdsAndType(
                        shelterIds, ShelterReportType.OPEN_CONFIRMED).stream()
                .map(row -> new ConfirmedAt(
                        ((Number) row[0]).longValue(),
                        ((Number) row[1]).longValue(),
                        (Instant) row[2]))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ShelterReport> findById(Long id) {
        return reports.findById(id).map(JpaShelterReportRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterReport> findLatestByShelterId(long shelterId, long offset, int limit) {
        return reports.findLatestByShelterId(shelterId, offset, limit).stream()
                .map(JpaShelterReportRepository::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countByShelterId(long shelterId) {
        return reports.countByShelterId(shelterId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterReport> findLatest(long offset, int limit) {
        return reports.findLatest(offset, limit).stream()
                .map(JpaShelterReportRepository::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countAll() {
        return reports.count();
    }

    private static ShelterReport toDomain(ShelterReportEntity entity) {
        ShelterReport report = new ShelterReport(entity.getShelterId(), entity.getUserId(),
                entity.getType(), entity.getDetail(), entity.getCreatedAt());
        report.setId(entity.getId());
        if (entity.getDismissedAt() != null) {
            report.markDismissed(entity.getDismissedAt());
        }
        if (entity.isDamped()) {
            report.markDamped();
        }
        return report;
    }
}
