package ee.sheltermap.retention;

import java.time.Instant;

/**
 * Durable audit log for retention runs — one row per
 * run of {@link RetentionService#prune}, the house pattern for background
 * mutations (the registry import's {@code data_imports} log,
 * {@code app.DataImportLog}): a successful run (OK) and an aborted one
 * (FAILED), with what the run pruned. The log line alone is not durable
 * (logs rotate); this row outlives the operator's session.
 */
public interface RetentionRunLog {

    /**
     * @param ranAt           when the run started
     * @param accountsPruned  inactive accounts erased by the run (a
     *                        PARTIAL count on a FAILED run — the failure
     *                        stops the account loop mid-way)
     * @param auditRowsPruned moderation-audit rows pruned (0 on a FAILED
     *                        run — the audit prune runs after the account
     *                        prune and a failure stops the run)
     * @param status          OK | FAILED
     * @param errorMessage    failure reason for FAILED runs (may be null)
     */
    record Row(Instant ranAt, int accountsPruned, int auditRowsPruned,
               String status, String errorMessage) {
    }

    /** Appends one audit row. */
    void record(Row row);
}
