package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** In-memory fake of {@link PendingVerificationRepository} for tests. */
public class InMemoryPendingVerificationRepository implements PendingVerificationRepository {

    private final Map<Long, PendingVerification> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(PendingVerification pending) {
        if (pending.getId() == null) {
            pending.setId(nextId++);
        }
        store.put(pending.getId(), pending);
    }

    @Override
    public Optional<PendingVerification> findActiveByUserAndLevel(Long userId, VerificationLevel level) {
        return store.values().stream()
                .filter(p -> p.getUserId().equals(userId))
                .filter(p -> p.getLevel() == level)
                .filter(p -> !p.isExpired(Instant.now()))
                .reduce((first, second) -> second); // most recently saved
    }

    @Override
    public void delete(PendingVerification pending) {
        store.remove(pending.getId());
    }

    public List<PendingVerification> findAll() {
        return List.copyOf(store.values());
    }
}
