package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Comparator;

/** In-memory fake of {@link ShelterRepository} for tests. */
public class InMemoryShelterRepository implements ShelterRepository {

    private final Map<Long, Shelter> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(Shelter shelter) {
        if (shelter.getId() == null) {
            shelter.setId(nextId++);
        }
        store.put(shelter.getId(), shelter);
    }

    @Override
    public Optional<Shelter> findByExternalId(String externalId) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getExternalId(), externalId))
                .findFirst();
    }

    @Override
    public Optional<Shelter> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public int deleteBySourceAndExternalIdNotIn(ShelterSource source, List<String> externalIds) {
        if (externalIds == null || externalIds.isEmpty()) {
            // mirror the JPA impl: refuse a blind wipe of an entire source
            return 0;
        }
        List<Shelter> toDelete = store.values().stream()
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getExternalId() != null && !externalIds.contains(s.getExternalId()))
                .toList();
        toDelete.forEach(s -> store.remove(s.getId()));
        return toDelete.size();
    }

    @Override
    public List<Shelter> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public List<Shelter> findAllActiveBySourceIn(List<ShelterSource> sources) {
        return store.values().stream()
                .filter(s -> sources.contains(s.getSource()))
                .filter(s -> s.getStatus() == ShelterStatus.ACTIVE)
                .toList();
    }

    @Override
    public long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source, ShelterStatus status) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getStatus() == status)
                .count();
    }

    @Override
    public long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                            Instant createdAtAfter) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(createdAtAfter))
                .count();
    }

    @Override
    public long countByCreatedByAndSourceAndReviewStatus(Long createdBy, ShelterSource source,
                                                         ReviewStatus reviewStatus) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getReviewStatus() == reviewStatus)
                .count();
    }

    @Override
    public Optional<Shelter> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, Instant createdAtAfter) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(createdAtAfter))
                .min(Comparator.comparing(Shelter::getCreatedAt));
    }

    @Override
    public List<Shelter> findByCreatedBy(Long userId) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), userId))
                .toList();
    }

    @Override
    public List<Shelter> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return ids.stream()
                .map(store::get)
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public void deleteById(Long id) {
        store.remove(id);
    }
}
