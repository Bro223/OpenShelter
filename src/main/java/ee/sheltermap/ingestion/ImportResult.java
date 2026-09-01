package ee.sheltermap.ingestion;

/**
 * Outcome of one {@link ShelterImportService#importFromRegistry()} run.
 *
 * @param created shelters newly created
 * @param updated shelters refreshed in place
 * @param removed registry rows deleted because they vanished from the latest fetch
 * @param skipped malformed rows (bad coordinates, outside Estonia, blank name…)
 * @param failed 1 when the registry was unreachable and the import aborted, else 0
 * @param at      when the import finished
 */
public record ImportResult(int created, int updated, int removed, int skipped, int failed, java.time.Instant at) {

    /** Result of a run that never reached the registry. */
    public static ImportResult failure(java.time.Instant at) {
        return new ImportResult(0, 0, 0, 0, 1, at);
    }

    /** Result of a run skipped because another import was already running. */
    public static ImportResult skipped(java.time.Instant at) {
        return new ImportResult(0, 0, 0, 0, 0, at);
    }
}
