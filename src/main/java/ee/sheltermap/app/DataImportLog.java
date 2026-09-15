package ee.sheltermap.app;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Audit log for registry import runs (official-dataset-csv).
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
     * The run statuses that VERIFY a source's rows (last-verified-meta):
     * {@code OK} (data applied) and {@code NOT_MODIFIED} (a 304
     * re-check — the rows are confirmed current as of that run). A
     * {@code FAILED} or {@code SKIPPED} run verifies nothing.
     */
    List<String> VERIFIED_STATUSES = List.of("OK", "NOT_MODIFIED");

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

    /**
     * The newest row for one source with a verifying status
     * ({@link #VERIFIED_STATUSES}) — the "last verified" stamp for that
     * source's rows; empty when the source has no verified run yet.
     */
    Optional<Row> findLatestVerifiedBySource(String sourceName);
}
