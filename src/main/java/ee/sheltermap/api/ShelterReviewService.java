package ee.sheltermap.api;

import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.DuplicateReportException;
import ee.sheltermap.app.OwnReviewReportException;
import ee.sheltermap.app.ReportActionLog;
import ee.sheltermap.app.ReviewReportRepository;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewReport;
import ee.sheltermap.domain.ReviewReportReason;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.User;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
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
 *
 * <p>Review reports (shelter-trust-and-reports D2): verified users can
 * report any review that is not their own (403 own, 409 duplicate);
 * the 5th report hides the review ({@code hidden_at}, set once, never
 * cleared automatically). Hidden reviews are excluded from the public
 * list, the rating aggregate and the {@code reviewed} filter — the
 * author still sees their own, marked hidden.
 */
@Service
public class ShelterReviewService {

    /**
     * 403 message for unverified review mutations — one public constant
     * shared with {@code ReviewController} (de-slop K5, 2026-09-10 review):
     * the controller pre-checks the same {@code canWrite()} rule on the same
     * user it passes down.
     */
    public static final String VERIFIED_ACCOUNT_MESSAGE = "Reviews require a verified account";

    /** Review reports that hide a review (D2). */
    public static final int REVIEW_HIDE_THRESHOLD = 5;

    /** Result of an add: the persisted review and whether it was a create (vs an update). */
    public record SaveResult(ShelterReview review, boolean created) {
    }

    private final ShelterReviewRepository reviewRepository;
    private final ShelterRepository shelterRepository;
    private final UserRepository userRepository;
    private final ReviewReportRepository reviewReports;
    private final ReportActionLog actionLog;
    private final Clock clock;

    public ShelterReviewService(ShelterReviewRepository reviewRepository,
                                ShelterRepository shelterRepository,
                                UserRepository userRepository,
                                ReviewReportRepository reviewReports,
                                ReportActionLog actionLog,
                                Clock clock) {
        this.reviewRepository = reviewRepository;
        this.shelterRepository = shelterRepository;
        this.userRepository = userRepository;
        this.reviewReports = reviewReports;
        this.actionLog = actionLog;
        this.clock = clock;
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

    /**
     * The public review list for a shelter (D2): hidden reviews are
     * excluded for everyone EXCEPT the author, who receives their own
     * hidden review marked {@code hidden} (the DTO flag). Guests and
     * anonymous callers pass a {@code null} caller and see no hidden rows.
     */
    public List<ShelterReviewDto> getReviews(long shelterId, User caller) {
        requireShelter(shelterId);
        List<ShelterReview> reviews = reviewRepository.findByShelterId(shelterId);
        // Batched author lookup — one query for all authors, not one per review
        // (P2 fix; previously this was an N+1 via toDto's findById).
        Map<Long, User> authors = userRepository.findByIds(
                reviews.stream().map(ShelterReview::getUserId).collect(Collectors.toSet()));
        Long callerId = caller == null ? null : caller.getId();
        return reviews.stream()
                .filter(review -> !review.isHidden() || review.getUserId().equals(callerId))
                .map(review -> toDto(review, authors))
                .toList();
    }

    /**
     * Stores the user's report on a review (D2): verified users only, one
     * report per user per review (409), own reviews cannot be reported
     * (403 — own content is edited or deleted, not reported), and the
     * 5th report hides the review ({@code hidden_at} set once, never
     * cleared automatically; hiding never deletes the row).
     *
     * @throws NotVerifiedException         guest or unverified registered user (→ 403)
     * @throws ShelterNotFoundException     unknown shelter id (→ 404)
     * @throws ShelterReviewNotFoundException unknown review id, or a review
     *                                      that does not belong to this
     *                                      shelter (→ 404)
     * @throws OwnReviewReportException     the caller authored the review (→ 403)
     * @throws DuplicateReportException     the user already reported this
     *                                      review (→ 409)
     * @throws ReportThrottledException     the per-hour report budget is
     *                                      exhausted (→ 429)
     */
    @Transactional
    public void reportReview(User caller, long shelterId, long reviewId,
                             ReviewReportReason reason, String detail) {
        RegisteredUser user = requireVerified(caller);
        requireShelter(shelterId);
        ShelterReview review = reviewRepository.findById(reviewId)
                .filter(candidate -> candidate.getShelterId().equals(shelterId))
                .orElseThrow(() -> new ShelterReviewNotFoundException(shelterId));
        if (review.getUserId().equals(user.getId())) {
            throw new OwnReviewReportException();
        }
        if (reviewReports.existsByReviewIdAndUserId(reviewId, user.getId())) {
            throw new DuplicateReportException();
        }
        actionLog.record(user.getId(), ReportActionLog.Action.REVIEW_REPORT);
        boolean reachesHideThreshold = reviewReports.countByReviewId(reviewId) == REVIEW_HIDE_THRESHOLD - 1;
        try {
            reviewReports.save(new ReviewReport(
                    reviewId, user.getId(), reason, reason == ReviewReportReason.OTHER ? detail : null));
        } catch (DataIntegrityViolationException e) {
            // Lost a race with an identical concurrent report — the unique
            // constraint is the authority; same semantics as the pre-check.
            throw new DuplicateReportException();
        }
        if (reachesHideThreshold && !review.isHidden()) {
            Instant now = clock.instant();
            review.markHidden(now);
            reviewRepository.save(review);
        }
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
                review.getCreatedAt(),
                review.isHidden());
    }

    private RegisteredUser requireVerified(User user) {
        if (!(user instanceof RegisteredUser registered) || !registered.canWrite()) {
            throw new NotVerifiedException(VERIFIED_ACCOUNT_MESSAGE);
        }
        return registered;
    }

    private void requireShelter(long shelterId) {
        if (shelterRepository.findById(shelterId).isEmpty()) {
            throw new ShelterNotFoundException(shelterId);
        }
    }
}
