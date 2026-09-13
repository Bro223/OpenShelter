package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewStatus;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * In-memory fake of {@link ModerationAuditLog} for tests: the same
 * newest-first (created_at desc, id desc tie-break) read as the JPA log,
 * with an injected clock for deterministic ordering.
 */
public class InMemoryModerationAuditLog implements ModerationAuditLog {

    private final Clock clock;
    private long nextId = 1;
    private final List<Row> rows = new ArrayList<>();

    public InMemoryModerationAuditLog(Clock clock) {
        this.clock = clock;
    }

    @Override
    public synchronized void record(long shelterId, long moderatorId, Action action, String reason,
                                    ReviewStatus previousStatus, ReviewStatus newStatus) {
        rows.add(new Row(nextId++, shelterId, moderatorId, action, reason, previousStatus, newStatus,
                clock.instant()));
    }

    @Override
    public synchronized List<Row> findLatest(int limit) {
        return rows.stream()
                .sorted(Comparator.comparing(Row::createdAt).reversed()
                        .thenComparing(Row::id, Comparator.reverseOrder()))
                .limit(limit)
                .toList();
    }

    /** Every recorded row, in recording order (for assertions). */
    public List<Row> rows() {
        return List.copyOf(rows);
    }

    public void clear() {
        rows.clear();
    }
}
