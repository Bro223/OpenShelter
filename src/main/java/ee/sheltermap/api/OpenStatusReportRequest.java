package ee.sheltermap.api;

import ee.sheltermap.domain.OpenStatusState;
import jakarta.validation.constraints.NotNull;

/**
 * Open-status body (live open/closed state — same level as capacity):
 * one live state per user per shelter — re-sending updates the existing
 * report (latest state wins, created_at refreshed).
 */
public record OpenStatusReportRequest(
        @NotNull OpenStatusState state) {
}
