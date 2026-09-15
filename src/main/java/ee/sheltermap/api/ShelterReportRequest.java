package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterReportType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Shelter report body (shelter-trust-and-reports D1).
 * {@code detail} is the factual substance of the report — accepted for any
 * type, stored for {@code CLOSED} / {@code WRONG_LOCATION} / {@code OTHER}
 * (ignored for the binary types), max 500 chars.
 */
public record ShelterReportRequest(
        @NotNull ShelterReportType type,
        @Size(max = 500) String detail) {
}
