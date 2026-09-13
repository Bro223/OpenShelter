package ee.sheltermap.api;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.ReviewStatus;

import java.time.Instant;

/**
 * One row of the moderation audit trail (community-review-queue D4) —
 * newest first.
 *
 * <p>{@code shelterName} is resolved at read time and renders "Deleted
 * shelter" once the row is gone (a shelter delete records its audit row
 * before the cascade, so the audit row outlives the shelter);
 * {@code previousStatus}/{@code newStatus} are the review_status values
 * around the action (equal when the action does not move the review
 * state; {@code newStatus} null for DELETE); {@code reason} is the
 * REJECT/NEEDS_INFO note when given; {@code moderatorName} is the acting
 * admin's profile name ("Unknown" if the account no longer exists).
 */
public record AdminAuditDto(
        Long id,
        Long shelterId,
        String shelterName,
        ModerationAuditLog.Action action,
        String reason,
        ReviewStatus previousStatus,
        ReviewStatus newStatus,
        String moderatorName,
        Instant createdAt) {
}
