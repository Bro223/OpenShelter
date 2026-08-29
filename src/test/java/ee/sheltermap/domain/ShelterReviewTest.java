package ee.sheltermap.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Review invariants from the context testing notes: rating bounds, comment length, update semantics. */
class ShelterReviewTest {

    @Test
    void ratingMustBeBetweenOneAndFive() {
        assertThatThrownBy(() -> new ShelterReview(1L, 1L, 0, "ok"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ShelterReview(1L, 1L, 6, "ok"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(new ShelterReview(1L, 1L, 1, "ok").getRating()).isEqualTo(1);
        assertThat(new ShelterReview(1L, 1L, 5, "ok").getRating()).isEqualTo(5);
    }

    @Test
    void commentMustNotExceed500Chars() {
        assertThatThrownBy(() -> new ShelterReview(1L, 1L, 5, "x".repeat(ShelterReview.MAX_COMMENT_LENGTH + 1)))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(new ShelterReview(1L, 1L, 5, "x".repeat(ShelterReview.MAX_COMMENT_LENGTH)).getComment())
                .hasSize(ShelterReview.MAX_COMMENT_LENGTH);
    }

    @Test
    void nullCommentBecomesEmpty() {
        assertThat(new ShelterReview(1L, 1L, 5, null).getComment()).isEmpty();
    }

    @Test
    void updateIsAMutationNotANewReview() {
        ShelterReview review = new ShelterReview(1L, 1L, 3, "meh");

        review.update(5, "great now");

        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("great now");
        assertThat(review.getUpdatedAt()).isAfterOrEqualTo(review.getCreatedAt());
        assertThat(review.getShelterId()).isEqualTo(1L);
        assertThat(review.getUserId()).isEqualTo(1L);
        assertThat(review.getId()).isNull(); // not persisted yet
    }
}
