package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewReport;

/**
 * Persistence seam for {@link ReviewReport} (shelter-trust-and-reports D2).
 * Implementations live in {@code ee.sheltermap.persistence}; tests use
 * in-memory fakes.
 */
public interface ReviewReportRepository {

    void save(ReviewReport report);

    boolean existsByReviewIdAndUserId(long reviewId, long userId);

    long countByReviewId(long reviewId);
}
