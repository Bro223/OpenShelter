package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReviewRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the community-review service: verified-account gate,
 * one-review-per-user upsert, author-only update/delete, 404s, DTO mapping.
 */
class ShelterReviewServiceTest {

    private InMemoryShelterRepository shelters;
    private InMemoryShelterReviewRepository reviews;
    private InMemoryUserRepository users;
    private ShelterReviewService service;

    private RegisteredUser verified;
    private RegisteredUser otherUser;
    private Shelter shelter;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        reviews = new InMemoryShelterReviewRepository();
        users = new InMemoryUserRepository();
        service = new ShelterReviewService(reviews, shelters, users);

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
        ShelterReviewService guarded = new ShelterReviewService(wrongOwner, shelters, users);

        assertThatThrownBy(() -> guarded.updateReview(verified, shelter.getId(), 1, "x"))
                .isInstanceOf(NotAuthorException.class);
        assertThatThrownBy(() -> guarded.deleteReview(verified, shelter.getId()))
                .isInstanceOf(NotAuthorException.class);
    }

    @Test
    void reviewsRequireExistingShelter() {
        assertThatThrownBy(() -> service.addReview(verified, 999_999L, 4, "x"))
                .isInstanceOf(ShelterNotFoundException.class);
        assertThatThrownBy(() -> service.getReviews(999_999L))
                .isInstanceOf(ShelterNotFoundException.class);
    }

    @Test
    void getReviewsMapsAuthorNames() {
        service.addReview(verified, shelter.getId(), 4, "hea");
        service.addReview(otherUser, shelter.getId(), 5, "väga hea");

        var dtos = service.getReviews(shelter.getId());

        assertThat(dtos).hasSize(2);
        assertThat(dtos).extracting(ShelterReviewDto::authorName)
                .containsExactlyInAnyOrder("Mari Maasikas", "Jaan Jänes");
        assertThat(dtos).extracting(ShelterReviewDto::rating)
                .containsExactlyInAnyOrder(4, 5);
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
