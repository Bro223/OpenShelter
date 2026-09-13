package ee.sheltermap.api;

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
public record DataSourceDto(String sourceName, String officialUrl, LastImport lastImport) {

    public record LastImport(Instant at, String status, String sourceVersion,
                             int recordsAdded, int recordsUpdated, int recordsRemoved) {
    }
}
