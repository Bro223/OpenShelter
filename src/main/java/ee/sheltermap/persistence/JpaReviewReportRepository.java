package ee.sheltermap.persistence;

import ee.sheltermap.app.ReviewReportRepository;
import ee.sheltermap.domain.ReviewReport;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * JPA implementation of {@link ReviewReportRepository} (approach B).
 * Uniqueness of {@code (reviewId, userId)} is enforced by the database
 * constraint {@code uq_review_reports_review_user} — a duplicate insert
 * surfaces as a {@code DataIntegrityViolationException} (the service
 * pre-checks and maps the expected duplicate to 409).
 */
@Repository
public class JpaReviewReportRepository implements ReviewReportRepository {

    private final SpringDataReviewReportRepository reviewReports;

    public JpaReviewReportRepository(SpringDataReviewReportRepository reviewReports) {
        this.reviewReports = Objects.requireNonNull(reviewReports, "reviewReports");
    }

    @Override
    @Transactional
    public void save(ReviewReport report) {
        ReviewReportEntity entity = new ReviewReportEntity();
        entity.setReviewId(report.getReviewId());
        entity.setUserId(report.getUserId());
        entity.setReason(report.getReason());
        entity.setDetail(report.getDetail());
        entity.setCreatedAt(report.getCreatedAt());
        ReviewReportEntity saved = reviewReports.save(entity);
        report.setId(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByReviewIdAndUserId(long reviewId, long userId) {
        return reviewReports.existsByReviewIdAndUserId(reviewId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public long countByReviewId(long reviewId) {
        return reviewReports.countByReviewId(reviewId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewReport> findAll() {
        return reviewReports.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(JpaReviewReportRepository::toDomain)
                .toList();
    }

    private static ReviewReport toDomain(ReviewReportEntity entity) {
        ReviewReport report = new ReviewReport(entity.getReviewId(), entity.getUserId(),
                entity.getReason(), entity.getDetail(), entity.getCreatedAt());
        report.setId(entity.getId());
        return report;
    }
}
