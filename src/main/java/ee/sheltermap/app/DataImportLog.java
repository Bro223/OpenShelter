package ee.sheltermap.app;

import java.time.Instant;
import java.util.Optional;

/**
 * Audit log for registry import runs (official-dataset-csv, M5).
 *
 * <p>One row per run of {@code ShelterImportService.importFromRegistry()} —
 * a successful apply ({@code OK}), a registry-down abort ({@code FAILED}),
 * a 304 no-change run ({@code NOT_MODIFIED}), and an overlap-skip
 * ({@code SKIPPED}). Consumers: the public "last import" provenance read
 * (GET /api/data-source) and the CSV client's {@code If-Modified-Since}
 * (the latest row's {@code sourceVersion} is the upstream
 * Last-Modified/ETag the previous run saw).
 */
public interface DataImportLog {

    /**
     * @param sourceName      the imported {@code ShelterSource} name
     * @param sourceVersion   upstream data version (HTTP Last-Modified / ETag), or null
     * @param importedAt      when the run finished
     * @param recordsAdded    shelters created by the run
     * @param recordsUpdated  shelters refreshed in place
     * @param recordsRemoved  registry rows delisted
     * @param status          OK | FAILED | NOT_MODIFIED | SKIPPED
     * @param errorMessage    failure reason for FAILED runs (may be null)
     */
    record Row(String sourceName, String sourceVersion, Instant importedAt,
               int recordsAdded, int recordsUpdated, int recordsRemoved,
               String status, String errorMessage) {
    }

    /** Appends one audit row. */
    void record(Row row);

    /** The newest row for one source (its {@code sourceVersion} feeds If-Modified-Since). */
    Optional<Row> findLatestBySource(String sourceName);

    /** The newest row of any source (the UI's "last import" line). */
    Optional<Row> findLatest();
}
