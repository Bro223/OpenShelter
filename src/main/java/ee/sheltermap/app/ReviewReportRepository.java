package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewReport;

import java.util.List;

/**
 * Persistence seam for {@link ReviewReport} (shelter-trust-and-reports D2).
 * Implementations live in {@code ee.sheltermap.persistence}; tests use
 * in-memory fakes.
 */
public interface ReviewReportRepository {

    void save(ReviewReport report);

    boolean existsByReviewIdAndUserId(long reviewId, long userId);

    long countByReviewId(long reviewId);

    /** Every review report, newest first (the admin queue, admin-moderation D3). */
    List<ReviewReport> findAll();
}
