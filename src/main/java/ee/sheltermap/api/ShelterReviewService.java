package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.UserData;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Community reviews — the rating system IS the moderation (no moderator).
 *
 * <p>One review per user per shelter (unique shelterId + userId, enforced
 * by the DB constraint from Step 3): adding again re-rates instead of
 * inserting. Reviews require an authenticated, verified account
 * (any {@code VerificationClaim}); update/delete are author-only.
 */
@Service
public class ShelterReviewService {

    /** Result of an add: the persisted review and whether it was a create (vs an update). */
    public record SaveResult(ShelterReview review, boolean created) {
    }

    private final ShelterReviewRepository reviewRepository;
    private final ShelterRepository shelterRepository;
    private final UserRepository userRepository;

    public ShelterReviewService(ShelterReviewRepository reviewRepository,
                                ShelterRepository shelterRepository,
                                UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.shelterRepository = shelterRepository;
        this.userRepository = userRepository;
    }

    /** Creates the user's review, or updates it if one already exists. */
    public SaveResult addReview(RegisteredUser user, long shelterId, int rating, String comment) {
        requireVerified(user);
        requireShelter(shelterId);
        ShelterReview existing = reviewRepository
                .findByShelterIdAndUserId(shelterId, user.getId())
                .orElse(null);
        if (existing != null) {
            existing.update(rating, comment);
            reviewRepository.save(existing);
            return new SaveResult(existing, false);
        }
        try {
            ShelterReview created = new ShelterReview(shelterId, user.getId(), rating, comment);
            reviewRepository.save(created);
            return new SaveResult(created, true);
        } catch (DataIntegrityViolationException race) {
            // Two concurrent adds raced: the other request's insert won the
            // unique (shelter_id, user_id) constraint. Re-read and update
            // instead of failing with a 500 (hardening pass).
            ShelterReview loser = reviewRepository
                    .findByShelterIdAndUserId(shelterId, user.getId())
                    .orElseThrow(() -> new IllegalStateException("concurrent review insert vanished", race));
            loser.update(rating, comment);
            reviewRepository.save(loser);
            return new SaveResult(loser, false);
        }
    }

    /** Updates the authenticated user's review of {@code shelterId} (author-only). */
    public ShelterReview updateReview(RegisteredUser user, long shelterId, int rating, String comment) {
        requireVerified(user);
        ShelterReview review = reviewRepository
                .findByShelterIdAndUserId(shelterId, user.getId())
                .orElseThrow(() -> new ShelterReviewNotFoundException(shelterId));
        if (!review.getUserId().equals(user.getId())) {
            throw new NotAuthorException("only the author may update this review");
        }
        review.update(rating, comment);
        reviewRepository.save(review);
        return review;
    }

    /** Deletes the authenticated user's review of {@code shelterId} (author-only). */
    public void deleteReview(RegisteredUser user, long shelterId) {
        requireVerified(user);
        ShelterReview review = reviewRepository
                .findByShelterIdAndUserId(shelterId, user.getId())
                .orElseThrow(() -> new ShelterReviewNotFoundException(shelterId));
        if (!review.getUserId().equals(user.getId())) {
            throw new NotAuthorException("only the author may delete this review");
        }
        reviewRepository.delete(review);
    }

    public List<ShelterReviewDto> getReviews(long shelterId) {
        requireShelter(shelterId);
        return reviewRepository.findByShelterId(shelterId).stream()
                .map(this::toDto)
                .toList();
    }

    public RatingSummaryDto getRatingSummary(long shelterId) {
        requireShelter(shelterId);
        List<ShelterReview> reviews = reviewRepository.findByShelterId(shelterId);
        if (reviews.isEmpty()) {
            return RatingSummaryDto.empty();
        }
        double average = reviews.stream().mapToInt(ShelterReview::getRating).average().orElse(0);
        return new RatingSummaryDto(average, reviews.size());
    }

    /** Maps a review to its DTO, resolving the author's display name. */
    public ShelterReviewDto toDto(ShelterReview review) {
        String authorName = Optional.ofNullable(userRepository.findById(review.getUserId()))
                .map(User::getData)
                .map(UserData::name)
                .orElse("Unknown");
        return new ShelterReviewDto(
                review.getId(),
                authorName,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt());
    }

    private void requireVerified(RegisteredUser user) {
        if (!user.canWrite()) {
            throw new NotVerifiedException("reviews require a verified account");
        }
    }

    private void requireShelter(long shelterId) {
        if (shelterRepository.findById(shelterId).isEmpty()) {
            throw new ShelterNotFoundException(shelterId);
        }
    }
}
