package ee.sheltermap.api;

import ee.sheltermap.domain.ReviewReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Review report body (shelter-trust-and-reports D2). {@code detail} is
 * the free text of {@code OTHER} reports — accepted for any reason, stored
 * only for {@code OTHER} (otherwise ignored), max 500 chars.
 */
public record ReviewReportRequest(
        @NotNull ReviewReportReason reason,
        @Size(max = 500) String detail) {
}
