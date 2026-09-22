package ee.sheltermap.app;

import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.ShelterOpenStatusReport;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory fake of {@link ShelterOpenStatusRepository} for tests
 * (mirrors the JPA upsert: one row per (shelter, user), id stable across
 * saves).
 */
public class InMemoryShelterOpenStatusRepository implements ShelterOpenStatusRepository {

    private final Map<Long, ShelterOpenStatusReport> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(ShelterOpenStatusReport report) {
        if (report.getId() == null) {
            // upsert: an existing (shelter, user) row is updated in place
            report.setId(findByShelterIdAndUserId(report.getShelterId(), report.getUserId())
                    .map(existing -> {
                        store.remove(existing.getId());
                        return existing.getId();
                    })
                    .orElseGet(() -> nextId++));
        }
        store.put(report.getId(), report);
    }

    @Override
    public Optional<ShelterOpenStatusReport> findByShelterIdAndUserId(long shelterId, long userId) {
        return store.values().stream()
                .filter(r -> r.getShelterId() == shelterId && r.getUserId() == userId)
                .findFirst();
    }

    @Override
    public List<Long> userIdsByShelterIdAndState(long shelterId, OpenStatusState state) {
        return store.values().stream()
                .filter(r -> r.getShelterId() == shelterId && r.getState() == state)
                .map(ShelterOpenStatusReport::getUserId)
                .distinct()
                .toList();
    }

    @Override
    public List<ShelterOpenStatusReport> findFreshByShelterIds(Collection<Long> shelterIds,
                                                               Instant freshSince) {
        return store.values().stream()
                .filter(r -> shelterIds.contains(r.getShelterId()))
                .filter(r -> r.getCreatedAt().isAfter(freshSince))
                .toList();
    }

    public List<ShelterOpenStatusReport> findAll() {
        return new ArrayList<>(store.values());
    }
}
