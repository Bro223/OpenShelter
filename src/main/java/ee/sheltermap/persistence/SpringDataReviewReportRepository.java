package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for {@link ReviewReportEntity} — internal to the persistence layer. */
public interface SpringDataReviewReportRepository extends JpaRepository<ReviewReportEntity, Long> {

    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    long countByReviewId(Long reviewId);
}
