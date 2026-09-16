package ee.sheltermap.retention;

import java.util.ArrayList;
import java.util.List;

/** In-memory fake of {@link RetentionRunLog} for tests. */
public class InMemoryRetentionRunLog implements RetentionRunLog {

    private final List<Row> rows = new ArrayList<>();

    @Override
    public synchronized void record(Row row) {
        rows.add(row);
    }

    /** Every recorded row, in recording order (for assertions). */
    public List<Row> rows() {
        return List.copyOf(rows);
    }
}
