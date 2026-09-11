package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

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
        ShelterReportEntity entity = new ShelterReportEntity();
        entity.setShelterId(report.getShelterId());
        entity.setUserId(report.getUserId());
        entity.setType(report.getType());
        entity.setDetail(report.getDetail());
        entity.setCreatedAt(report.getCreatedAt());
        ShelterReportEntity saved = reports.save(entity);
        report.setId(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByShelterIdAndUserIdAndType(long shelterId, long userId,
                                                     ShelterReportType type) {
        return reports.existsByShelterIdAndUserIdAndType(shelterId, userId, type);
    }

    @Override
    @Transactional(readOnly = true)
    public long countByShelterIdAndType(long shelterId, ShelterReportType type) {
        return reports.countByShelterIdAndType(shelterId, type);
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
}
