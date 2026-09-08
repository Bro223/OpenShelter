package ee.sheltermap.auth;

import java.time.Instant;

/**
 * One row of {@code GET /account/reviews/mine} (user-contributions): the
 * caller's review of a shelter, carrying the shelter's id + name for
 * navigation plus the review's own fields. Shelter names are resolved in
 * ONE batched query (no N+1, mirroring the review list's batched author
 * lookup). A review whose shelter was deleted cannot occur — shelter
 * deletion cascades to its reviews — so {@code shelterName} always resolves.
 */
public record MyReviewDto(
        long shelterId,
        String shelterName,
        int rating,
        String comment,
        Instant createdAt,
        Instant updatedAt) {
}
