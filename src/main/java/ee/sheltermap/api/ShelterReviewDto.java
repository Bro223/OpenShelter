package ee.sheltermap.api;

import java.time.Instant;

/**
 * Read contract for one community review (05-shelter-api.puml).
 * {@code hidden} (shelter-trust-and-reports D2) marks a community-hidden
 * review: hidden reviews are NEVER returned to non-authors — only the
 * author receives their own hidden review, with this flag, to mark it.
 */
public record ShelterReviewDto(
        Long id,
        String authorName,
        int rating,
        String comment,
        Instant createdAt,
        boolean hidden) {
}
