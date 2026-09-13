package ee.sheltermap.app;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * In-memory fake of {@link ShelterHistoryLog} for tests: the same ascending
 * (created_at asc, id asc tie-break) read as the JPA log, with an injected
 * clock for deterministic ordering. Dangling shelter ids match
 * {@link #findByShelterId(long)} exactly like the JPA impl (no FK on either
 * side).
 */
public class InMemoryShelterHistoryLog implements ShelterHistoryLog {

    private final Clock clock;
    private long nextId = 1;
    private final List<Event> rows = new ArrayList<>();

    public InMemoryShelterHistoryLog(Clock clock) {
        this.clock = clock;
    }

    @Override
    public synchronized void record(Long shelterId, String shelterName, Long actorUserId, Action action,
                                    String changesJson) {
        rows.add(new Event(nextId++, shelterId, shelterName, actorUserId, action, changesJson,
                clock.instant()));
    }

    @Override
    public synchronized List<Event> findByShelterId(long shelterId) {
        return rows.stream()
                .filter(row -> Long.valueOf(shelterId).equals(row.shelterId()))
                .sorted(Comparator.comparing(Event::createdAt).thenComparing(Event::id))
                .toList();
    }

    /** Every recorded row, in recording order (for assertions). */
    public List<Event> rows() {
        return List.copyOf(rows);
    }

    public void clear() {
        rows.clear();
    }
}
