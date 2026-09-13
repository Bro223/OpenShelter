package ee.sheltermap.api;

/**
 * The write outcome of {@code POST /api/shelters/{id}/reports}
 * (community-self-moderation M9, D4): whether the stored report was
 * DAMPENED — recorded and flagged in the admin queue, but contributing
 * 0 to the weighted auto-hide tally because the reporter holds their
 * own other USER listing of the same place (the self-interested rival
 * vote). A plain report answers {@code {"damped": false}}.
 */
public record ShelterReportResult(boolean damped) {
}
