package ee.sheltermap.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * GET /api/data-source — where the map's official shelter data comes from
 * (official-dataset-csv M5). The FE footer line renders the publisher, the
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

    @Schema(description = "One data_imports audit row: when the import ran, "
            + "its outcome, the source version it saw, and the record "
            + "delta.")
    public record LastImport(Instant at, String status, String sourceVersion,
                             int recordsAdded, int recordsUpdated, int recordsRemoved) {
    }
}
