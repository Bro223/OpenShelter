package ee.sheltermap.api;

import ee.sheltermap.domain.ReviewReportReason;

import java.time.Instant;

/**
 * One row of the admin review-report queue (admin-moderation D3) — hidden
 * reviews included, carrying their hidden marker and the review excerpt
 * (rating + comment) so the moderation decision has context. The reporter's
 * identity (profile name + email) is admin-only data, never exposed outside
 * {@code /admin/*}.
 */
public record AdminReviewReportDto(
        Long id,
        Long shelterId,
        String shelterName,
        Long reviewId,
        Integer reviewRating,
        String reviewComment,
        boolean reviewHidden,
        ReviewReportReason reason,
        String detail,
        String reporterName,
        String reporterEmail,
        Instant createdAt) {
}
