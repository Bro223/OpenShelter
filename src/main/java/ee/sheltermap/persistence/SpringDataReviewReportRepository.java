package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Spring Data repository for {@link ReviewReportEntity} — internal to the persistence layer. */
public interface SpringDataReviewReportRepository extends JpaRepository<ReviewReportEntity, Long> {

    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    long countByReviewId(Long reviewId);

    /** Every review report, newest first (the admin queue); created_at ties break by id desc. */
    List<ReviewReportEntity> findAllByOrderByCreatedAtDescIdDesc();
}
