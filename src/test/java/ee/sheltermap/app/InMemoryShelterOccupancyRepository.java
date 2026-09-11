package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterOccupancyReport;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * In-memory fake of {@link ShelterOccupancyRepository} for tests (mirrors
 * the JPA upsert: one row per (shelter, user), id stable across saves).
 */
public class InMemoryShelterOccupancyRepository implements ShelterOccupancyRepository {

    private final Map<Long, ShelterOccupancyReport> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(ShelterOccupancyReport report) {
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
    public Optional<ShelterOccupancyReport> findByShelterIdAndUserId(long shelterId, long userId) {
        return store.values().stream()
                .filter(r -> r.getShelterId() == shelterId && r.getUserId() == userId)
                .findFirst();
    }

    @Override
    public List<ShelterOccupancyReport> findFreshByShelterIds(Collection<Long> shelterIds,
                                                              Instant freshSince) {
        return store.values().stream()
                .filter(r -> shelterIds.contains(r.getShelterId()))
                .filter(r -> r.getUpdatedAt().isAfter(freshSince))
                .toList();
    }

    public List<ShelterOccupancyReport> findAll() {
        return new ArrayList<>(store.values());
    }
}
