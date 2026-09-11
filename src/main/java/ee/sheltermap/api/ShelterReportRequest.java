package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterReportType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Shelter report body (shelter-trust-and-reports D1). {@code detail} is
 * the free text of {@code OTHER} reports — accepted for any type, stored
 * only for {@code OTHER} (otherwise ignored), max 500 chars.
 */
public record ShelterReportRequest(
        @NotNull ShelterReportType type,
        @Size(max = 500) String detail) {
}
