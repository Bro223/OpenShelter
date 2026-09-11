package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReview;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * In-memory fake of {@link ShelterReviewRepository} for tests (mirrors the
 * JPA implementation's find-then-save semantics; uniqueness of
 * (shelterId, userId) is the caller's concern, as in the real DB).
 */
public class InMemoryShelterReviewRepository implements ShelterReviewRepository {

    private final Map<Long, ShelterReview> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(ShelterReview review) {
        if (review.getId() == null) {
            review.setId(nextId++);
        }
        store.put(review.getId(), review);
    }

    @Override
    public Optional<ShelterReview> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<ShelterReview> findByShelterId(Long shelterId) {
        return store.values().stream()
                .filter(r -> Objects.equals(r.getShelterId(), shelterId))
                .toList();
    }

    @Override
    public Optional<ShelterReview> findByShelterIdAndUserId(Long shelterId, Long userId) {
        return store.values().stream()
                .filter(r -> Objects.equals(r.getShelterId(), shelterId))
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .findFirst();
    }

    @Override
    public List<ShelterReview> findByUserId(Long userId) {
        return store.values().stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .toList();
    }

    @Override
    public List<RatingAggregate> findRatingAggregates(List<Long> shelterIds) {
        // Mirrors the JPA query: hidden reviews (V9, D2) are excluded from
        // the average and the (visible) count.
        return store.values().stream()
                .filter(r -> !r.isHidden())
                .filter(r -> shelterIds.contains(r.getShelterId()))
                .collect(java.util.stream.Collectors.groupingBy(ShelterReview::getShelterId))
                .entrySet().stream()
                .map(e -> new RatingAggregate(
                        e.getKey(),
                        e.getValue().stream().mapToInt(ShelterReview::getRating).average().orElse(0),
                        e.getValue().size()))
                .toList();
    }

    @Override
    public void delete(ShelterReview review) {
        if (review.getId() != null) {
            store.remove(review.getId());
        }
    }

    public List<ShelterReview> findAll() {
        return new ArrayList<>(store.values());
    }
}
