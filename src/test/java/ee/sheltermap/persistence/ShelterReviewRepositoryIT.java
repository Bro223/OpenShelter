package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class ShelterReviewRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    ShelterReviewRepository reviews;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    UserRepository users;

    private Long newShelterId() {
        Shelter s = new Shelter("Viru Keskus", new GeoPoint(59.437, 24.7536),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelters.save(s);
        return s.getId();
    }

    private Long newUserId() {
        RegisteredUser user = saveUser(users);
        return user.getId();
    }

    @Test
    void saveFindDeleteRoundTrip() {
        Long shelterId = newShelterId();
        Long userId = newUserId();

        ShelterReview review = new ShelterReview(shelterId, userId, 5, "great shelter");
        reviews.save(review);
        assertThat(review.getId()).isNotNull();

        ShelterReview loaded = reviews.findById(review.getId()).orElseThrow();
        assertThat(loaded.getShelterId()).isEqualTo(shelterId);
        assertThat(loaded.getUserId()).isEqualTo(userId);
        assertThat(loaded.getRating()).isEqualTo(5);
        assertThat(loaded.getComment()).isEqualTo("great shelter");
        assertThat(loaded.getCreatedAt()).isNotNull();
        assertThat(loaded.getUpdatedAt()).isNotNull();

        assertThat(reviews.findByShelterId(shelterId)).hasSize(1);
        assertThat(reviews.findByShelterIdAndUserId(shelterId, userId)).isPresent();

        reviews.delete(review);
        assertThat(reviews.findById(review.getId())).isEmpty();
        assertThat(reviews.findByShelterIdAndUserId(shelterId, userId)).isEmpty();
    }

    @Test
    void uniquenessIsEnforcedByDatabase() {
        Long shelterId = newShelterId();
        Long userId = newUserId();

        reviews.save(new ShelterReview(shelterId, userId, 4, "first"));

        assertThatThrownBy(() -> reviews.save(new ShelterReview(shelterId, userId, 2, "second")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void findByShelterIdAndUserIdAbsentForOtherUser() {
        Long shelterId = newShelterId();
        Long userA = newUserId();
        Long userB = newUserId();

        reviews.save(new ShelterReview(shelterId, userA, 3, "ok"));

        assertThat(reviews.findByShelterIdAndUserId(shelterId, userA)).isPresent();
        assertThat(reviews.findByShelterIdAndUserId(shelterId, userB)).isEmpty();
    }
}
