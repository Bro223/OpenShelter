package ee.sheltermap.api;

/** Aggregate of the ratings of one shelter (computed per request in v1). */
public record RatingSummaryDto(double average, int count) {
}
