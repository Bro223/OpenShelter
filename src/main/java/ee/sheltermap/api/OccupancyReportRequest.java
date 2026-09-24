package ee.sheltermap.api;

import ee.sheltermap.domain.OccupancyBand;
import jakarta.validation.constraints.NotNull;

/**
 * Occupancy body (shelter-trust-and-reports): one live report per user
 * per shelter — re-sending updates the existing report (latest band wins).
 */
public record OccupancyReportRequest(
        @NotNull OccupancyBand band) {
}
