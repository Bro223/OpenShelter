package ee.sheltermap.app;

import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * User-submitted shelters.
 *
 * <p>No moderator: a submission is published immediately — {@code addPlace}
 * checks {@code canWrite()} first, then persists the place as
 * {@code ACTIVE}/{@code USER}. Quality is governed by community ratings
 * ({@code ShelterReview}, Step 6), not by approval.
 */
@Service
public class ShelterService {

    private final ShelterRepository shelterRepository;

    public ShelterService(ShelterRepository shelterRepository) {
        this.shelterRepository = Objects.requireNonNull(shelterRepository, "shelterRepository");
    }

    /**
     * Publishes {@code place} if the user may write.
     *
     * @throws IllegalStateException    if {@code user.canWrite()} is false
     *                                  (guest or unverified registered user)
     * @throws IllegalArgumentException if the place is not already
     *                                  {@code ACTIVE}/{@code USER} — user submissions must be
     *                                  created ACTIVE immediately, never imported as USER
     */
    public void addPlace(User user, Shelter place) {
        Objects.requireNonNull(user, "user");
        Objects.requireNonNull(place, "place");
        if (!user.canWrite()) {
            throw new IllegalStateException("user is not allowed to submit shelters");
        }
        if (place.getStatus() != ShelterStatus.ACTIVE || place.getSource() != ShelterSource.USER) {
            throw new IllegalArgumentException(
                    "user-submitted shelters must be ACTIVE with source USER");
        }
        shelterRepository.save(place);
    }
}
