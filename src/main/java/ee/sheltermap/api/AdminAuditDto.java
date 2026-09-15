package ee.sheltermap.api;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.ReviewStatus;
import io.swagger.v3.oas.annotations.media.Schema;

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
@Schema(description = "One row of the moderation audit trail — newest first. "
        + "Every moderation-relevant action (admin AND automatic "
        + "AUTO_CONFIRM).")
public record AdminAuditDto(
        Long id,
        Long shelterId,
        @Schema(description = "Resolved at read time; renders 'Deleted "
                + "shelter' once the row is gone (the audit row outlives the "
                + "shelter).")
        String shelterName,
        ModerationAuditLog.Action action,
        @Schema(description = "The REJECT/NEEDS_INFO note when given; null "
                + "otherwise.")
        String reason,
        @Schema(description = "The review_status value before the action; "
                + "equal to newStatus when the action does not move the "
                + "review state.")
        ReviewStatus previousStatus,
        @Schema(description = "The review_status value after the action; "
                + "null for DELETE.")
        ReviewStatus newStatus,
        @Schema(description = "The acting admin's profile name; 'Unknown' "
                + "if the account no longer exists.")
        String moderatorName,
        Instant createdAt) {
}
