package ee.sheltermap.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * GET /api/data-source — where the map's official shelter data comes from.
 * The FE footer line renders the publisher, the
 * link to the official open-data page, and the last import's date.
 *
 * @param sourceName   the publisher (e.g. "Päästeamet")
 * @param officialUrl  the publisher's open-data page
 * @param lastImport   the newest data_imports audit row, or null when no
 *                     import has run yet
 */
@Schema(description = "Where the map's official shelter data comes from: the "
        + "publisher, the link to the official open-data page, and when the "
        + "last import ran.")
public record DataSourceDto(
        @Schema(description = "The publisher (e.g. 'Päästeamet').")
        String sourceName,
        @Schema(description = "The publisher's open-data page.")
        String officialUrl,
        @Schema(description = "The newest data_imports audit row, or null "
                + "when no import has run yet.")
        LastImport lastImport) {

    /**
     * One data_imports audit row. {@code at} is when the run FINISHED;
     * {@code status} is the run outcome — OK (data applied), FAILED
     * (registry-down abort), NOT_MODIFIED (a 304 no-change run) or SKIPPED
     * (overlap skip): only OK and NOT_MODIFIED VERIFY the source's rows as
     * current, a FAILED or SKIPPED run verifies nothing. {@code
     * sourceVersion} is the upstream data version the run saw (HTTP
     * Last-Modified / ETag) — the feed for the next run's
     * If-Modified-Since — or null when the upstream sent none. The record
     * delta is the run's applied changes.
     */
    @Schema(description = "One data_imports audit row: when the import ran, "
            + "its outcome, the source version it saw, and the record "
            + "delta.")
    public record LastImport(Instant at, String status, String sourceVersion,
                             int recordsAdded, int recordsUpdated, int recordsRemoved) {
    }
}
