package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * One community review report (shelter-trust-and-reports D2).
 *
 * <p>At most one report per user per review (unique {@code reviewId +
 * userId}, enforced by the database); a user can never report their own
 * review (service-side 403). 5 reports hide the review.
 * {@code detail} is the optional free text of {@code OTHER} reports —
 * {@code null} for the other reasons.
 */
public class ReviewReport {

    public static final int MAX_DETAIL_LENGTH = 500;

    private Long id;
    private final Long reviewId;
    private final Long userId;
    private final ReviewReportReason reason;
    private final String detail;
    private final Instant createdAt;

    public ReviewReport(Long reviewId, Long userId, ReviewReportReason reason, String detail) {
        this(reviewId, userId, reason, detail, Instant.now());
    }

    ReviewReport(Long reviewId, Long userId, ReviewReportReason reason, String detail, Instant createdAt) {
        this.reviewId = Objects.requireNonNull(reviewId, "reviewId");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.reason = Objects.requireNonNull(reason, "reason");
        this.detail = normalizeDetail(detail);
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    private static String normalizeDetail(String detail) {
        if (detail == null) {
            return null;
        }
        if (detail.length() > MAX_DETAIL_LENGTH) {
            throw new IllegalArgumentException("detail must be at most " + MAX_DETAIL_LENGTH + " chars");
        }
        return detail;
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public Long getUserId() {
        return userId;
    }

    public ReviewReportReason getReason() {
        return reason;
    }

    /** Free text of {@code OTHER} reports; {@code null} otherwise. */
    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
