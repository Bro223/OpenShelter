package ee.sheltermap.auth;

import ee.sheltermap.domain.ContactChangeType;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/** In-memory fake of {@link PendingContactChangeRepository} for tests. */
public class InMemoryPendingContactChangeRepository implements PendingContactChangeRepository {

    private final Map<String, PendingContactChange> store = new LinkedHashMap<>();
    private long nextId = 1;

    private static String key(Long userId, ContactChangeType type) {
        return userId + ":" + type;
    }

    @Override
    public Optional<PendingContactChange> findByUserIdAndType(Long userId, ContactChangeType type) {
        return Optional.ofNullable(store.get(key(userId, type)));
    }

    @Override
    public PendingContactChange save(PendingContactChange change) {
        if (change.getId() == null) {
            change.setId(nextId++);
        }
        store.put(key(change.getUserId(), change.getType()), change);
        return change;
    }

    @Override
    public synchronized int incrementAttempts(Long id, int maxAttempts) {
        // Same semantics as the JPA conditional UPDATE: increment only below
        // the cap, 0 when at/over the cap or the row is gone. The monitor is
        // the stand-in for the row lock (S2, 2026-09-11 review).
        for (PendingContactChange change : store.values()) {
            if (change.getId().equals(id)) {
                if (change.getAttempts() >= maxAttempts) {
                    return 0;
                }
                change.registerFailedAttempt();
                return 1;
            }
        }
        return 0;
    }

    @Override
    public void delete(PendingContactChange change) {
        store.remove(key(change.getUserId(), change.getType()));
    }
}
