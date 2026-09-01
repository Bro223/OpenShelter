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
    public void delete(PendingContactChange change) {
        store.remove(key(change.getUserId(), change.getType()));
    }
}
