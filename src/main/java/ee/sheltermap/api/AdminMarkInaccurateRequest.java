package ee.sheltermap.api;

import jakarta.validation.constraints.Size;

/**
 * The mark-inaccurate body (M10 slice 4): {@code {"reason": "..."}} —
 * OPTIONAL, at most 500 characters (the moderation_actions.reason column
 * bound). A blank reason stores NULL on the audit row; an absent body
 * field is fine (the mark stands on its own).
 */
public record AdminMarkInaccurateRequest(
        @Size(max = 500) String reason) {
}
