package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryReportActionLog;
import ee.sheltermap.app.InMemoryReviewReportRepository;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReviewRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.OwnReviewReportException;
import ee.sheltermap.app.DuplicateReportException;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewReport;
import ee.sheltermap.domain.ReviewReportReason;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the community-review service: verified-account gate,
 * one-review-per-user upsert, author-only update/delete, 404s, DTO mapping,
 * and review reports (shelter-trust-and-reports D2): own-review 403,
 * duplicate 409, the 5th-report hide, hidden exclusion from the public
 * list and the rating aggregate.
 */
class ShelterReviewServiceTest {

    private static final Clock FIXED = Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC);

    private InMemoryShelterRepository shelters;
    private InMemoryShelterReviewRepository reviews;
    private InMemoryUserRepository users;
    private InMemoryReviewReportRepository reviewReports;
    private InMemoryReportActionLog actionLog;
    private ShelterReviewService service;

    private RegisteredUser verified;
    private RegisteredUser otherUser;
    private Shelter shelter;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        reviews = new InMemoryShelterReviewRepository();
        users = new InMemoryUserRepository();
        reviewReports = new InMemoryReviewReportRepository();
        actionLog = new InMemoryReportActionLog(FIXED);
        service = new ShelterReviewService(reviews, shelters, users, reviewReports, actionLog, FIXED);

        verified = user("Mari Maasikas", "mari@example.ee");
        verified.addVerification(claim("smtp"));
        users.save(verified);

        otherUser = user("Jaan Jänes", "jaan@example.ee");
        otherUser.addVerification(claim("smtp"));
        users.save(otherUser);

        shelter = new Shelter("Kesklinna varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelters.save(shelter);
    }

    private RegisteredUser user(String name, String email) {
        return new RegisteredUser(name, email, "+37250000000", "49001010001");
    }

    private VerificationClaim claim(String provider) {
        return new VerificationClaim(VerificationLevel.EMAIL, provider, "x@example.ee", Instant.now());
    }

    @Test
    void verifiedUserCanAddReview() {
        ShelterReviewService.SaveResult result =
                service.addReview(verified, shelter.getId(), 5, "Suurepärane!");

        assertThat(result.created()).isTrue();
        assertThat(result.review().getShelterId()).isEqualTo(shelter.getId());
        assertThat(result.review().getUserId()).isEqualTo(verified.getId());
        assertThat(result.review().getRating()).isEqualTo(5);
        assertThat(reviews.findAll()).hasSize(1);
    }

    @Test
    void unverifiedUserIsRejectedWithNotVerified() {
        RegisteredUser unverified = user("Priit", "priit@example.ee");
        users.save(unverified);

        assertThatThrownBy(() -> service.addReview(unverified, shelter.getId(), 3, "ok"))
                .isInstanceOf(NotVerifiedException.class);
        assertThatThrownBy(() -> service.updateReview(unverified, shelter.getId(), 3, "ok"))
                .isInstanceOf(NotVerifiedException.class);
        assertThatThrownBy(() -> service.deleteReview(unverified, shelter.getId()))
                .isInstanceOf(NotVerifiedException.class);
        assertThat(reviews.findAll()).isEmpty();
    }

    @Test
    void duplicateReviewUpdatesInsteadOfInserting() {
        service.addReview(verified, shelter.getId(), 4, "esimene hinnang");
        ShelterReviewService.SaveResult second =
                service.addReview(verified, shelter.getId(), 2, "parandatud hinnang");

        assertThat(second.created()).isFalse();
        assertThat(reviews.findAll()).hasSize(1);
        ShelterReview stored = reviews.findAll().get(0);
        assertThat(stored.getRating()).isEqualTo(2);
        assertThat(stored.getComment()).isEqualTo("parandatud hinnang");
    }

    @Test
    void updateReviewByAuthorChangesRatingAndComment() {
        service.addReview(verified, shelter.getId(), 4, "vana");

        ShelterReview updated = service.updateReview(verified, shelter.getId(), 1, "uus");

        assertThat(updated.getRating()).isEqualTo(1);
        assertThat(updated.getComment()).isEqualTo("uus");
        assertThat(reviews.findAll()).hasSize(1);
    }

    @Test
    void updateReviewWithoutExistingReviewThrowsNotFound() {
        assertThatThrownBy(() -> service.updateReview(verified, shelter.getId(), 4, "x"))
                .isInstanceOf(ShelterReviewNotFoundException.class);
    }

    @Test
    void deleteReviewByAuthorRemovesIt() {
        service.addReview(verified, shelter.getId(), 5, "kustuta mind");

        service.deleteReview(verified, shelter.getId());

        assertThat(reviews.findAll()).isEmpty();
    }

    @Test
    void deleteReviewWithoutExistingReviewThrowsNotFound() {
        assertThatThrownBy(() -> service.deleteReview(verified, shelter.getId()))
                .isInstanceOf(ShelterReviewNotFoundException.class);
    }

    @Test
    void updateDeleteByNonAuthorThrowsNotAuthor() {
        // A repository that answers the (shelterId, userId) lookup with a review
        // owned by a DIFFERENT user — exercises the service's defensive
        // ownership check that maps to 403 (the /mine route makes this
        // unreachable through the real repository, but the guard must exist).
        ShelterReview otherOwnersReview = new ShelterReview(shelter.getId(), otherUser.getId(), 4, "teise kasutaja");
        reviews.save(otherOwnersReview);
        InMemoryShelterReviewRepository wrongOwner = new WrongOwnerReviewRepository(otherOwnersReview);
        ShelterReviewService guarded = new ShelterReviewService(wrongOwner, shelters, users, reviewReports, actionLog, FIXED);

        assertThatThrownBy(() -> guarded.updateReview(verified, shelter.getId(), 1, "x"))
                .isInstanceOf(NotAuthorException.class);
        assertThatThrownBy(() -> guarded.deleteReview(verified, shelter.getId()))
                .isInstanceOf(NotAuthorException.class);
    }

    @Test
    void reviewsRequireExistingShelter() {
        assertThatThrownBy(() -> service.addReview(verified, 999_999L, 4, "x"))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThatThrownBy(() -> service.getReviews(999_999L, null))
                .isInstanceOf(ShelterNotFoundException.class);
    }

    @Test
    void getReviewsMapsAuthorNames() {
        service.addReview(verified, shelter.getId(), 4, "hea");
        service.addReview(otherUser, shelter.getId(), 5, "väga hea");

        var dtos = service.getReviews(shelter.getId(), null);

        assertThat(dtos).hasSize(2);
        assertThat(dtos).extracting(ShelterReviewDto::authorName)
                .containsExactlyInAnyOrder("Mari Maasikas", "Jaan Jänes");
        assertThat(dtos).extracting(ShelterReviewDto::rating)
                .containsExactlyInAnyOrder(4, 5);
    }

    // ---------- review reports (shelter-trust-and-reports D2) ----------

    @Test
    void fiveReviewReportsHideTheReviewOnce() {
        service.addReview(verified, shelter.getId(), 4, "võlts info");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), verified.getId())
                .orElseThrow().getId();
        // Mari authored the review — five OTHER users report it
        service.reportReview(user("Arv1", "arv1@example.ee", true), shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null);
        service.reportReview(user("Arv2", "arv2@example.ee", true), shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null);
        service.reportReview(user("Arv3", "arv3@example.ee", true), shelter.getId(), reviewId,
                ReviewReportReason.FALSY_DATA, null);
        service.reportReview(user("Arv4", "arv4@example.ee", true), shelter.getId(), reviewId,
                ReviewReportReason.OTHER, "põhjendus");

        // 4 reports: still visible, hidden_at unset (the flag only at 5)
        assertThat(reviews.findById(reviewId).orElseThrow().isHidden()).isFalse();

        service.reportReview(user("Arv5", "arv5@example.ee", true), shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null);

        ShelterReview stored = reviews.findById(reviewId).orElseThrow();
        assertThat(stored.isHidden()).isTrue();
        assertThat(stored.getHiddenAt()).isEqualTo(FIXED.instant());
        // hiding never deletes the row
        assertThat(reviews.findAll()).hasSize(1);
        // a 6th report increments the count but does not re-stamp the hide
        service.reportReview(user("Arv6", "arv6@example.ee", true), shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null);
        assertThat(reviews.findById(reviewId).orElseThrow().getHiddenAt())
                .isEqualTo(FIXED.instant());
        assertThat(reviewReports.countByReviewId(reviewId)).isEqualTo(6);
    }

    @Test
    void hiddenReviewIsExcludedFromThePublicListButNotFromTheAuthor() {
        service.addReview(verified, shelter.getId(), 4, "peita mind");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), verified.getId())
                .orElseThrow().getId();
        reviews.findById(reviewId).orElseThrow().markHidden(FIXED.instant());
        reviews.save(reviews.findById(reviewId).orElseThrow());

        // the author still sees their hidden review, marked
        var authorView = service.getReviews(shelter.getId(), verified);
        assertThat(authorView).hasSize(1);
        assertThat(authorView.get(0).hidden()).isTrue();

        // everyone else (another user, a guest) never receives it
        assertThat(service.getReviews(shelter.getId(), otherUser)).isEmpty();
        assertThat(service.getReviews(shelter.getId(), null)).isEmpty();
    }

    @Test
    void hiddenReviewIsExcludedFromTheRatingAggregate() {
        service.addReview(verified, shelter.getId(), 1, "peita mind");
        service.addReview(otherUser, shelter.getId(), 5, "reaalne");
        long hiddenId = reviews.findByShelterIdAndUserId(shelter.getId(), verified.getId())
                .orElseThrow().getId();
        reviews.findById(hiddenId).orElseThrow().markHidden(FIXED.instant());
        reviews.save(reviews.findById(hiddenId).orElseThrow());

        List<ShelterReviewRepository.RatingAggregate> aggregates =
                reviews.findRatingAggregates(List.of(shelter.getId()));

        assertThat(aggregates).hasSize(1);
        assertThat(aggregates.get(0).average()).isEqualTo(5.0);
        assertThat(aggregates.get(0).count()).isEqualTo(1);
    }

    @Test
    void ownReviewCannotBeReported() {
        service.addReview(verified, shelter.getId(), 4, "oma arvustus");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), verified.getId())
                .orElseThrow().getId();

        assertThatThrownBy(() -> service.reportReview(verified, shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null))
                .isInstanceOf(OwnReviewReportException.class);
        assertThat(reviewReports.findAll()).isEmpty();
    }

    @Test
    void duplicateReviewReportIsRejected() {
        service.addReview(otherUser, shelter.getId(), 2, "süütu");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), otherUser.getId())
                .orElseThrow().getId();

        service.reportReview(verified, shelter.getId(), reviewId, ReviewReportReason.SPAM, null);

        assertThatThrownBy(() -> service.reportReview(verified, shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null))
                .isInstanceOf(DuplicateReportException.class);
        assertThat(reviewReports.countByReviewId(reviewId)).isEqualTo(1);
    }

    @Test
    void reviewReportRequiresExistingShelterAndReviewOfThatShelter() {
        assertThatThrownBy(() -> service.reportReview(verified, 999_999L, 1L,
                ReviewReportReason.SPAM, null))
                .isInstanceOf(ShelterNotFoundException.class);

        service.addReview(otherUser, shelter.getId(), 2, "siin");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), otherUser.getId())
                .orElseThrow().getId();
        // a real review id pointed at a DIFFERENT shelter → 404, not a leak
        assertThatThrownBy(() -> service.reportReview(verified, 424242L, reviewId,
                ReviewReportReason.SPAM, null))
                .isInstanceOf(ShelterNotFoundException.class);
        // a review id that does not exist at all → 404
        assertThatThrownBy(() -> service.reportReview(verified, shelter.getId(), 424242L,
                ReviewReportReason.SPAM, null))
                .isInstanceOf(ShelterReviewNotFoundException.class);
        assertThat(reviewReports.findAll()).isEmpty();
    }

    @Test
    void unverifiedCannotReportAReview() {
        service.addReview(otherUser, shelter.getId(), 2, "süütu");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), otherUser.getId())
                .orElseThrow().getId();
        RegisteredUser unverified = user("Priit", "priit@example.ee", false);

        assertThatThrownBy(() -> service.reportReview(unverified, shelter.getId(), reviewId,
                ReviewReportReason.SPAM, null))
                .isInstanceOf(NotVerifiedException.class);
        assertThat(reviewReports.findAll()).isEmpty();
    }

    @Test
    void otherReasonDetailIsStoredAndOtherReasonsDropIt() {
        service.addReview(otherUser, shelter.getId(), 2, "süütu");
        long reviewId = reviews.findByShelterIdAndUserId(shelter.getId(), otherUser.getId())
                .orElseThrow().getId();

        service.reportReview(verified, shelter.getId(), reviewId,
                ReviewReportReason.OTHER, "põhjendus siin");
        assertThat(reviewReports.findAll().get(0).getDetail()).isEqualTo("põhjendus siin");

        RegisteredUser second = user("Arv2", "arv2@example.ee", true);
        service.reportReview(second, shelter.getId(), reviewId,
                ReviewReportReason.SPAM, "peab unune ma");
        // findAll is newest-first (admin queue) — assert per report, not by index.
        List<ReviewReport> all = reviewReports.findAll();
        assertThat(all.stream().filter(r -> r.getReason() == ReviewReportReason.OTHER).findFirst())
                .map(ReviewReport::getDetail).contains("põhjendus siin");
        assertThat(all.stream().filter(r -> r.getReason() == ReviewReportReason.SPAM).findFirst()
                .map(ReviewReport::getDetail)).isEmpty(); // detail dropped for non-OTHER
    }

    /** The user factory with an explicit verification state (report-report tests). */
    private RegisteredUser user(String name, String email, boolean verified) {
        RegisteredUser u = new RegisteredUser(name, email, "+3725000" + (20 + users.findAll().size()), "49001010009");
        if (verified) {
            u.addVerification(claim("smtp"));
        }
        users.save(u);
        return u;
    }


    @Test
    void ratingBoundsAndCommentLengthAreEnforcedByTheDomain() {
        assertThatThrownBy(() -> service.addReview(verified, shelter.getId(), 0, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.addReview(verified, shelter.getId(), 6, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.addReview(verified, shelter.getId(), 4, "a".repeat(501)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void insertFkViolationOnDeletedShelterMapsToNotFound() {
        // W20b: the shelter is deleted between requireShelter() and the
        // insert → the DIVE is an FK violation, not a race → 404, never 500.
        InMemoryShelterReviewRepository fkFailing = new InMemoryShelterReviewRepository() {
            @Override
            public void save(ShelterReview review) {
                throw new DataIntegrityViolationException(
                        "insert into shelter_reviews failed (shelter_id FK violation)");
            }
        };
        AtomicInteger looks = new AtomicInteger();
        InMemoryShelterRepository deletedMidFlight = new InMemoryShelterRepository() {
            @Override
            public Optional<Shelter> findById(Long id) {
                // requireShelter still sees the row; by the post-DIVE re-read
                // the concurrent delete has committed.
                return looks.incrementAndGet() <= 1 ? shelters.findById(id) : Optional.empty();
            }
        };
        ShelterReviewService guarded = new ShelterReviewService(fkFailing, deletedMidFlight, users, reviewReports, actionLog, FIXED);

        assertThatThrownBy(() -> guarded.addReview(verified, shelter.getId(), 4, "x"))
                .isInstanceOf(ShelterNotFoundException.class);
    }

    @Test
    void uniqueConstraintRaceReReadsAndUpdatesInPlace() {
        // W20b: initial find empty (the race), insert hits the unique
        // (shelter_id, user_id) index, the re-read finds the winner's row →
        // update in place, created=false, no exception.
        ShelterReview winnerRow = new ShelterReview(shelter.getId(), verified.getId(), 5, "winner");
        AtomicBoolean firstFindDone = new AtomicBoolean(false);
        InMemoryShelterReviewRepository racing = new InMemoryShelterReviewRepository() {
            {
                // The competing thread's row is already committed (id
                // assigned) — our insert hits the unique index against it.
                super.save(winnerRow);
            }

            @Override
            public Optional<ShelterReview> findByShelterIdAndUserId(Long shelterId, Long userId) {
                if (!firstFindDone.compareAndSet(false, true)) {
                    return Optional.of(winnerRow); // re-read after the DIVE
                }
                return Optional.empty(); // the racing initial read
            }

            @Override
            public void save(ShelterReview review) {
                if (review.getId() == null) {
                    throw new DataIntegrityViolationException(
                            "duplicate key uq_shelter_reviews_shelter_user (concurrent insert)");
                }
                super.save(review);
            }
        };
        ShelterReviewService guarded = new ShelterReviewService(racing, shelters, users, reviewReports, actionLog, FIXED);

        ShelterReviewService.SaveResult result =
                guarded.addReview(verified, shelter.getId(), 2, "loser update");

        assertThat(result.created()).isFalse();
        assertThat(result.review()).isSameAs(winnerRow);
        assertThat(winnerRow.getRating()).isEqualTo(2);
        assertThat(winnerRow.getComment()).isEqualTo("loser update");
    }

    /** Returns the pre-seeded review for EVERY (shelterId, userId) lookup. */
    private static final class WrongOwnerReviewRepository extends InMemoryShelterReviewRepository {
        private final ShelterReview review;

        WrongOwnerReviewRepository(ShelterReview review) {
            this.review = review;
        }

        @Override
        public Optional<ShelterReview> findByShelterIdAndUserId(Long shelterId, Long userId) {
            return Optional.of(review);
        }
    }
}
