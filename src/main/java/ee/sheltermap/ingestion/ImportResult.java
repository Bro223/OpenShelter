package ee.sheltermap.ingestion;

import java.time.Instant;

/**
 * Outcome of one {@link ShelterImportService#importFromRegistry()} run.
 *
 * @param created        shelters newly created
 * @param updated        shelters refreshed in place
 * @param removed        registry rows deleted because they vanished from the latest fetch
 * @param skipped        malformed rows (bad coordinates, outside Estonia,
 *                       blank name…) plus rows the client rejected as
 *                       unplaceable
 * @param failed         1 when the registry was unreachable and the import aborted, else 0
 * @param at             when the import finished
 * @param overlapSkipped true when the run was skipped because another import
 *                       was already running (indistinguishable-by-counts
 *                       otherwise: an overlap-skip and a legitimately empty
 *                       run would both be {@code (0,0,0,0,0)}), else false
 * @param sourceVersion  the upstream data version the run saw (HTTP
 *                       Last-Modified / ETag; null for version-less sources
 *                       and for runs that never reached the registry)
 */
public record ImportResult(int created, int updated, int removed, int skipped, int failed,
                           Instant at, boolean overlapSkipped, String sourceVersion) {

    /** Seven-arg form for version-less sources (WFS, dev fixture). */
    public ImportResult(int created, int updated, int removed, int skipped, int failed,
                        Instant at, boolean overlapSkipped) {
        this(created, updated, removed, skipped, failed, at, overlapSkipped, null);
    }

    /** Result of a run that never reached the registry. */
    public static ImportResult failure(Instant at) {
        return new ImportResult(0, 0, 0, 0, 1, at, false, null);
    }

    /** Result of a run skipped because another import was already running. */
    public static ImportResult skipped(Instant at) {
        return new ImportResult(0, 0, 0, 0, 0, at, true, null);
    }
}
