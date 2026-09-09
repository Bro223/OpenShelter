package ee.sheltermap.app;

import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;

import java.util.List;
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
     * <p>The author link is recorded here (V7): {@code place.createdBy}
     * becomes {@code user.getId()} before the save, so every USER submission
     * is attributable to its submitting account afterwards.
     *
     * @throws NotVerifiedException   if {@code user.canWrite()} is false
     *                                (guest or unverified registered user)
     *                                — the 403-mapped exception, mirroring
     *                                the API layer (B7c; was a generic 500)
     * @throws IllegalArgumentException if the place is not already
     *                                  {@code ACTIVE}/{@code USER} — user submissions must be
     *                                  created ACTIVE immediately, never imported as USER
     */
    public void addPlace(User user, Shelter place) {
        Objects.requireNonNull(user, "user");
        Objects.requireNonNull(place, "place");
        if (!user.canWrite()) {
            throw new NotVerifiedException("a verified account is required to submit shelters");
        }
        if (place.getStatus() != ShelterStatus.ACTIVE || place.getSource() != ShelterSource.USER) {
            throw new IllegalArgumentException(
                    "user-submitted shelters must be ACTIVE with source USER");
        }
        place.setCreatedBy(user.getId());
        shelterRepository.save(place);
    }

    /** The user's own shelters (the author-scoped "my shelters" list). */
    public List<Shelter> findMine(long userId) {
        return shelterRepository.findByCreatedBy(userId);
    }

    /**
     * Replaces the editable fields of an existing shelter row — same id,
     * status/source/registry fields, {@code createdAt} and author untouched.
     * Callers own the authorization (author check) and validation (field
     * bounds + the Estonia bbox) before calling this.
     */
    public void updatePlace(Shelter place) {
        Objects.requireNonNull(place, "place");
        shelterRepository.save(place);
    }

    /** Deletes a shelter row; its reviews cascade via the DB constraint. */
    public void deletePlace(long shelterId) {
        shelterRepository.deleteById(shelterId);
    }
}
