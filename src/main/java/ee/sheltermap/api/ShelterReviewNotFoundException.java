package ee.sheltermap.api;

/** Mapped to 404 by {@link ApiErrorHandler}. */
public class ShelterReviewNotFoundException extends RuntimeException {
    public ShelterReviewNotFoundException(long shelterId) {
        super("review not found for shelter: " + shelterId);
    }
}
