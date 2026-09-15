package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterOpenStatusRepository;
import ee.sheltermap.domain.ShelterOpenStatusReport;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterOpenStatusRepository} (approach B).
 * The upsert (one live state per user per shelter) is a find-then-save on
 * the unique {@code (shelter_id, user_id)} constraint.
 */
@Repository
public class JpaShelterOpenStatusReportRepository implements ShelterOpenStatusRepository {

    private final SpringDataShelterOpenStatusReportRepository openStatus;

    public JpaShelterOpenStatusReportRepository(SpringDataShelterOpenStatusReportRepository openStatus) {
        this.openStatus = Objects.requireNonNull(openStatus, "openStatus");
    }

    @Override
    @Transactional
    public void save(ShelterOpenStatusReport report) {
        // Upsert: the row's identity is (shelterId, userId). An existing
        // row is mutated in place (same version discipline as shelter
        // saves); a first tap is a fresh insert.
        if (report.getId() == null) {
            openStatus.findByShelterIdAndUserId(report.getShelterId(), report.getUserId())
                    .ifPresent(existing -> report.setId(existing.getId()));
        }
        if (report.getId() != null) {
            ShelterOpenStatusReportEntity entity = openStatus.findById(report.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save open status report with unknown id " + report.getId()));
            applyFields(entity, report);
            openStatus.save(entity);
        } else {
            ShelterOpenStatusReportEntity entity = new ShelterOpenStatusReportEntity();
            applyFields(entity, report);
            ShelterOpenStatusReportEntity saved = openStatus.save(entity);
            report.setId(saved.getId());
        }
    }

    private static void applyFields(ShelterOpenStatusReportEntity entity,
                                    ShelterOpenStatusReport report) {
        entity.setShelterId(report.getShelterId());
        entity.setUserId(report.getUserId());
        entity.setState(report.getState());
        entity.setCreatedAt(report.getCreatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ShelterOpenStatusReport> findByShelterIdAndUserId(long shelterId, long userId) {
        return openStatus.findByShelterIdAndUserId(shelterId, userId)
                .map(JpaShelterOpenStatusReportRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterOpenStatusReport> findFreshByShelterIds(Collection<Long> shelterIds,
                                                               Instant freshSince) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return List.of();
        }
        return openStatus.findByShelterIdInAndCreatedAtAfter(shelterIds, freshSince).stream()
                .map(JpaShelterOpenStatusReportRepository::toDomain)
                .toList();
    }

    private static ShelterOpenStatusReport toDomain(ShelterOpenStatusReportEntity entity) {
        ShelterOpenStatusReport report = new ShelterOpenStatusReport(
                entity.getShelterId(), entity.getUserId(), entity.getState(), entity.getCreatedAt());
        report.setId(entity.getId());
        return report;
    }
}
