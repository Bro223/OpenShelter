package ee.sheltermap.api;

import ee.sheltermap.app.NotVerifiedException;
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
import java.util.Map;
import java.util.stream.Collectors;

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
            // Two different DIVEs can reach here (W20b):
            //  (1) the unique (shelter_id, user_id) index — a concurrent add
            //      raced; re-read and update in place instead of failing 500.
            //  (2) the shelters foreign key — the shelter was deleted between
            //      requireShelter() and the insert; that is a 404, not a race.
            // Distinguished by observable state, not by parsing the SQL error.
            if (shelterRepository.findById(shelterId).isEmpty()) {
                throw new ShelterNotFoundException(shelterId);
            }
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
            throw new NotAuthorException("Only the author may update this review");
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
            throw new NotAuthorException("Only the author may delete this review");
        }
        reviewRepository.delete(review);
    }

    public List<ShelterReviewDto> getReviews(long shelterId) {
        requireShelter(shelterId);
        List<ShelterReview> reviews = reviewRepository.findByShelterId(shelterId);
        // Batched author lookup — one query for all authors, not one per review
        // (P2 fix; previously this was an N+1 via toDto's findById).
        Map<Long, User> authors = userRepository.findByIds(
                reviews.stream().map(ShelterReview::getUserId).collect(Collectors.toSet()));
        return reviews.stream()
                .map(review -> toDto(review, authors))
                .toList();
    }


    /** Maps a review to its DTO, resolving the author's display name. */
    public ShelterReviewDto toDto(ShelterReview review) {
        User author = userRepository.findById(review.getUserId());
        return toDto(review, author == null ? Map.of() : Map.of(review.getUserId(), author));
    }

    private ShelterReviewDto toDto(ShelterReview review, Map<Long, User> authors) {
        User author = authors.get(review.getUserId());
        String authorName = author == null ? "Unknown" : author.getData().name();
        return new ShelterReviewDto(
                review.getId(),
                authorName,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt());
    }

    private void requireVerified(RegisteredUser user) {
        if (!user.canWrite()) {
            throw new NotVerifiedException("Reviews require a verified account");
        }
    }

    private void requireShelter(long shelterId) {
        if (shelterRepository.findById(shelterId).isEmpty()) {
            throw new ShelterNotFoundException(shelterId);
        }
    }
}
