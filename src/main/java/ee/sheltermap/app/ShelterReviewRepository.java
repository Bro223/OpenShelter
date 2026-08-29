package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReview;

import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link ShelterReview}. Implementations live in
 * {@code ee.sheltermap.persistence} (Step 3); tests use in-memory fakes.
 */
public interface ShelterReviewRepository {

    void save(ShelterReview review);

    Optional<ShelterReview> findById(Long id);

    List<ShelterReview> findByShelterId(Long shelterId);

    Optional<ShelterReview> findByShelterIdAndUserId(Long shelterId, Long userId);

    void delete(ShelterReview review);
}
