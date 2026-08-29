package ee.sheltermap.api;

import java.time.Instant;

/** Read contract for one community review (05-shelter-api.puml). */
public record ShelterReviewDto(
        Long id,
        String authorName,
        int rating,
        String comment,
        Instant createdAt) {
}
