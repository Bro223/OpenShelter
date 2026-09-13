package ee.sheltermap.app;

import java.time.Clock;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory fake of {@link ShelterInfoRequestLog} for unit tests: the same
 * one-exchange-per-shelter bound and the same guard vocabulary (409
 * duplicate request, 404 no request, 409 answered) as the JPA log, with an
 * injected clock for deterministic timestamps.
 */
public class InMemoryShelterInfoRequestLog implements ShelterInfoRequestLog {

    private final Clock clock;
    private long nextId = 1;
    /** Keyed by shelter id (the UNIQUE bound) — at most one row per shelter. */
    private final Map<Long, InfoRequest> rows = new LinkedHashMap<>();

    public InMemoryShelterInfoRequestLog(Clock clock) {
        this.clock = clock;
    }

    @Override
    public synchronized InfoRequest request(long shelterId, String message, Long requestedBy) {
        if (rows.containsKey(shelterId)) {
            throw new DuplicateInfoRequestException();
        }
        InfoRequest row = new InfoRequest(nextId++, shelterId, message, requestedBy,
                clock.instant(), null, null, null);
        rows.put(shelterId, row);
        return row;
    }

    @Override
    public synchronized Optional<InfoRequest> findByShelterId(long shelterId) {
        return Optional.ofNullable(rows.get(shelterId));
    }

    @Override
    public synchronized Map<Long, InfoRequest> findByShelterIds(Collection<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, InfoRequest> result = new HashMap<>();
        for (Long id : shelterIds) {
            InfoRequest row = rows.get(id);
            if (row != null) {
                result.put(id, row);
            }
        }
        return result;
    }

    @Override
    public synchronized InfoRequest reply(long shelterId, String replyMessage, Long repliedBy) {
        InfoRequest row = rows.get(shelterId);
        if (row == null) {
            throw new InfoRequestNotFoundException();
        }
        if (row.isAnswered()) {
            throw new InfoRequestAlreadyAnsweredException();
        }
        InfoRequest answered = new InfoRequest(row.id(), row.shelterId(), row.message(),
                row.requestedBy(), row.requestedAt(), replyMessage, repliedBy, clock.instant());
        rows.put(shelterId, answered);
        return answered;
    }

    /** Every stored row (for assertions), shelter-id insertion order. */
    public synchronized Map<Long, InfoRequest> rows() {
        return new LinkedHashMap<>(rows);
    }

    public synchronized void clear() {
        rows.clear();
    }
}
