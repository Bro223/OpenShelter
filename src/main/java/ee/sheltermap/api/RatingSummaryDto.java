package ee.sheltermap.api;

/**
 * Aggregate of the ratings of one shelter (computed per request in v1).
 * {@code average} is {@code null} when there are no reviews — consistent with
 * {@link ShelterDto#averageRating()} (hardening pass; previously 0.0 vs null).
 */
public record RatingSummaryDto(Double average, int count) {

    /** Empty summary — no reviews yet. */
    public static RatingSummaryDto empty() {
        return new RatingSummaryDto(null, 0);
    }
}
