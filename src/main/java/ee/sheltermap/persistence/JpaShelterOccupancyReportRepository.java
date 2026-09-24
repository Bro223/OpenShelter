package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterOccupancyRepository;
import ee.sheltermap.domain.ShelterOccupancyReport;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterOccupancyRepository} (approach B).
 * The upsert (one live report per user per shelter) is a
 * find-then-save on the unique {@code (shelter_id, user_id)} constraint.
 */
@Repository
public class JpaShelterOccupancyReportRepository implements ShelterOccupancyRepository {

    private final SpringDataShelterOccupancyReportRepository occupancy;

    public JpaShelterOccupancyReportRepository(SpringDataShelterOccupancyReportRepository occupancy) {
        this.occupancy = Objects.requireNonNull(occupancy, "occupancy");
    }

    @Override
    @Transactional
    public void save(ShelterOccupancyReport report) {
        // Upsert: the row's identity is (shelterId, userId). An existing
        // row is mutated in place (same version discipline as shelter
        // saves); a first report is a fresh insert.
        if (report.getId() == null) {
            occupancy.findByShelterIdAndUserId(report.getShelterId(), report.getUserId())
                    .ifPresent(existing -> report.setId(existing.getId()));
        }
        if (report.getId() != null) {
            ShelterOccupancyReportEntity entity = occupancy.findById(report.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save occupancy report with unknown id " + report.getId()));
            applyFields(entity, report);
            occupancy.save(entity);
        } else {
            ShelterOccupancyReportEntity entity = new ShelterOccupancyReportEntity();
            applyFields(entity, report);
            ShelterOccupancyReportEntity saved = occupancy.save(entity);
            report.setId(saved.getId());
        }
    }

    private static void applyFields(ShelterOccupancyReportEntity entity,
                                    ShelterOccupancyReport report) {
        entity.setShelterId(report.getShelterId());
        entity.setUserId(report.getUserId());
        entity.setBand(report.getBand());
        entity.setUpdatedAt(report.getUpdatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ShelterOccupancyReport> findByShelterIdAndUserId(long shelterId, long userId) {
        return occupancy.findByShelterIdAndUserId(shelterId, userId)
                .map(JpaShelterOccupancyReportRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterOccupancyReport> findFreshByShelterIds(Collection<Long> shelterIds,
                                                              Instant freshSince) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return List.of();
        }
        return occupancy.findByShelterIdInAndUpdatedAtAfter(shelterIds, freshSince).stream()
                .map(JpaShelterOccupancyReportRepository::toDomain)
                .toList();
    }

    private static ShelterOccupancyReport toDomain(ShelterOccupancyReportEntity entity) {
        ShelterOccupancyReport report = new ShelterOccupancyReport(
                entity.getShelterId(), entity.getUserId(), entity.getBand(), entity.getUpdatedAt());
        report.setId(entity.getId());
        return report;
    }
}
