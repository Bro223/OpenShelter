package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReview;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link ShelterReview}. Implementations live in
 * {@code ee.sheltermap.persistence} (Step 3); tests use in-memory fakes.
 */
public interface ShelterReviewRepository {

    /** One shelter's rating aggregate — used to batch rating summaries (no N+1). */
    record RatingAggregate(Long shelterId, double average, long count) {
    }

    void save(ShelterReview review);

    Optional<ShelterReview> findById(Long id);

    List<ShelterReview> findByShelterId(Long shelterId);

    Optional<ShelterReview> findByShelterIdAndUserId(Long shelterId, Long userId);

    /** All reviews written by {@code userId}, across all shelters (V7 "my reviews"). */
    List<ShelterReview> findByUserId(Long userId);

    /** Batched read by id (one query — the admin review-report queue, no N+1). */
    List<ShelterReview> findByIds(Collection<Long> ids);

    /**
     * Rating aggregates for all given shelter ids in ONE query.
     * Shelters without reviews are absent from the result (caller treats
     * "missing" as count 0 / no average).
     */
    List<RatingAggregate> findRatingAggregates(List<Long> shelterIds);

    void delete(ShelterReview review);
}
