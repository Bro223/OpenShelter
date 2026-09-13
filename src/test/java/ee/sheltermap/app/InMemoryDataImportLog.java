package ee.sheltermap.app;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * In-memory fake of {@link DataImportLog} for tests (mirrors the JPA
 * implementation's newest-first reads; same-timestamp ties are left to the
 * caller — tests use distinct timestamps).
 */
public class InMemoryDataImportLog implements DataImportLog {

    private final List<Row> rows = new ArrayList<>();

    @Override
    public synchronized void record(Row row) {
        rows.add(row);
    }

    @Override
    public synchronized Optional<Row> findLatestBySource(String sourceName) {
        return rows.stream()
                .filter(r -> r.sourceName().equals(sourceName))
                .max(Comparator.comparing(Row::importedAt));
    }

    @Override
    public synchronized Optional<Row> findLatest() {
        return rows.stream().max(Comparator.comparing(Row::importedAt));
    }

    @Override
    public synchronized Optional<Row> findLatestVerifiedBySource(String sourceName) {
        return rows.stream()
                .filter(r -> r.sourceName().equals(sourceName)
                        && VERIFIED_STATUSES.contains(r.status()))
                .max(Comparator.comparing(Row::importedAt));
    }

    /** Every recorded row, in recording order (for assertions). */
    public synchronized List<Row> rows() {
        return List.copyOf(rows);
    }

    /** Test helper: a row at an explicit instant (the Row has no id of its own). */
    public static Row row(String sourceName, Instant importedAt, String status) {
        return new Row(sourceName, "v-" + importedAt, importedAt, 0, 0, 0, status, null);
    }

    /** Convenience overload with an explicit source version. */
    public static Row row(String sourceName, String sourceVersion, Instant importedAt, String status) {
        return new Row(sourceName, sourceVersion, importedAt, 0, 0, 0, status, null);
    }
}
