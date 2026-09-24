package ee.sheltermap.api;

import ee.sheltermap.domain.ReviewDecision;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Community review decision body (community-review-queue v2):
 * {@code {"action": "CONFIRM" | "REJECT", "reason"?}}. A missing action
 * is a 400 validation failure; an unknown action is a 400 malformed
 * body — both through the standard vocabulary. The reason (optional,
 * ≤ 500 chars — the column bound) is stored as the review note when
 * given (REJECT; CONFIRM clears the note).
 */
public record AdminShelterReviewRequest(
        @NotNull ReviewDecision action,
        @Size(max = 500) String reason) {
}
