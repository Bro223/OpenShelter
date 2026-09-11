package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.domain.ShelterReview;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterReviewRepository} (approach B).
 *
 * <p>Uniqueness of {@code (shelterId, userId)} is enforced by the database
 * constraint {@code uq_shelter_reviews_shelter_user} — a duplicate insert
 * surfaces as a {@code DataIntegrityViolationException}. Re-rating (update)
 * is a Step 6 service concern: find-then-save.
 */
@Repository
public class JpaShelterReviewRepository implements ShelterReviewRepository {

    private final SpringDataShelterReviewRepository reviews;

    public JpaShelterReviewRepository(SpringDataShelterReviewRepository reviews) {
        this.reviews = Objects.requireNonNull(reviews, "reviews");
    }

    @Override
    @Transactional
    public void save(ShelterReview review) {
        ShelterReviewEntity entity = toEntity(review);
        ShelterReviewEntity saved = reviews.save(entity);
        review.setId(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ShelterReview> findById(Long id) {
        return reviews.findById(id).map(JpaShelterReviewRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterReview> findByShelterId(Long shelterId) {
        return reviews.findByShelterId(shelterId).stream().map(JpaShelterReviewRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ShelterReview> findByShelterIdAndUserId(Long shelterId, Long userId) {
        return reviews.findByShelterIdAndUserId(shelterId, userId).map(JpaShelterReviewRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterReview> findByUserId(Long userId) {
        return reviews.findByUserId(userId).stream().map(JpaShelterReviewRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShelterReview> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return reviews.findByIdIn(ids).stream().map(JpaShelterReviewRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RatingAggregate> findRatingAggregates(List<Long> shelterIds) {
        if (shelterIds == null || shelterIds.isEmpty()) {
            return List.of();
        }
        return reviews.findRatingAggregates(shelterIds).stream()
                .map(row -> new RatingAggregate(
                        ((Number) row[0]).longValue(),
                        ((Number) row[1]).doubleValue(),
                        ((Number) row[2]).longValue()))
                .toList();
    }

    @Override
    @Transactional
    public void delete(ShelterReview review) {
        if (review.getId() != null) {
            reviews.deleteById(review.getId());
        }
    }

    private static ShelterReviewEntity toEntity(ShelterReview review) {
        ShelterReviewEntity entity = new ShelterReviewEntity();
        entity.setId(review.getId());
        entity.setShelterId(review.getShelterId());
        entity.setUserId(review.getUserId());
        entity.setRating(review.getRating());
        entity.setComment(review.getComment());
        entity.setCreatedAt(review.getCreatedAt());
        entity.setUpdatedAt(review.getUpdatedAt());
        entity.setHiddenAt(review.getHiddenAt());
        return entity;
    }

    private static ShelterReview toDomain(ShelterReviewEntity entity) {
        ShelterReview review = new ShelterReview(
                entity.getShelterId(), entity.getUserId(), entity.getRating(), entity.getComment(),
                entity.getCreatedAt(), entity.getUpdatedAt());
        review.setId(entity.getId());
        if (entity.getHiddenAt() != null) {
            review.markHidden(entity.getHiddenAt());
        }
        return review;
    }
}
