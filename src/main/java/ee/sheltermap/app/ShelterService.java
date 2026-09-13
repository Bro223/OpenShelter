package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * User-submitted shelters.
 *
 * <p>Community trust lifecycle without a blocking queue
 * (community-review-queue v2 D2): {@code addPlace} checks
 * {@code canWrite()} first, then persists the place as
 * {@code ACTIVE}/{@code USER}/{@code NEW} — the row is public
 * IMMEDIATELY (the owner does not actively moderate); NEW simply carries
 * the unverified treatment in the UI. Trust moves forward automatically
 * in the report service (an {@code OPEN_CONFIRMED} report from a user
 * other than the submitter promotes NEW→CONFIRMED, audited
 * AUTO_CONFIRM) or via the rare admin CONFIRM; REJECT (admin) hides the
 * row via status INACTIVE.
 */
@Service
public class ShelterService {

    /**
     * 403 message for unverified shelter submissions — one public constant
     * shared with {@code api.ShelterController} (de-slop K5, 2026-09-10
     * review): the API layer pre-checks the same {@code canWrite()} rule.
     */
    public static final String SUBMIT_SHELTERS_MESSAGE =
            "A verified account is required to submit shelters";

    /**
     * Per-user spam floor (shelter-trust-and-reports D3): the max shelters
     * one user may have with {@code source = USER} and {@code status =
     * ACTIVE}; the 11th submission is a 409. Deletions and auto-hidden
     * shelters free the cap; ADMIN-kind users are exempt.
     */
    public static final int MAX_ACTIVE_SHELTERS_PER_USER = 10;

    /** The daily submission window (abuse-limits M3): a rolling 24 h. */
    static final Duration DAILY_SUBMISSION_WINDOW = Duration.ofHours(24);

    private final ShelterRepository shelterRepository;
    private final UserRepository userRepository;
    private final int dailySubmissionsPerUser;

    public ShelterService(ShelterRepository shelterRepository,
                          UserRepository userRepository,
                          @Value("${app.limits.daily-submissions-per-user:5}") int dailySubmissionsPerUser) {
        this.shelterRepository = Objects.requireNonNull(shelterRepository, "shelterRepository");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.dailySubmissionsPerUser = dailySubmissionsPerUser;
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
     * @throws ShelterLimitExceededException when the user already has
     *                                  {@link #MAX_ACTIVE_SHELTERS_PER_USER}
     *                                  active USER shelters (→ 409; ADMIN
     *                                  kind is exempt — D3)
     * @throws ShelterSubmissionThrottledException when the user has already
     *                                  submitted {@code app.limits.daily-submissions-per-user}
     *                                  USER shelters in the last 24 h (→ 429 + Retry-After;
     *                                  ADMIN kind is exempt, like the active cap)
     * @throws IllegalArgumentException if the place is not already
     *                                  {@code ACTIVE}/{@code USER} — user submissions must be
     *                                  created ACTIVE immediately, never imported as USER
     */
    public void addPlace(User user, Shelter place) {
        Objects.requireNonNull(user, "user");
        Objects.requireNonNull(place, "place");
        if (!user.canWrite()) {
            throw new NotVerifiedException(SUBMIT_SHELTERS_MESSAGE);
        }
        if (place.getStatus() != ShelterStatus.ACTIVE || place.getSource() != ShelterSource.USER) {
            throw new IllegalArgumentException(
                    "user-submitted shelters must be ACTIVE with source USER");
        }
        if (!userRepository.isAdmin(user.getId())
                && shelterRepository.countByCreatedByAndSourceAndStatus(
                        user.getId(), ShelterSource.USER, ShelterStatus.ACTIVE)
                >= MAX_ACTIVE_SHELTERS_PER_USER) {
            throw new ShelterLimitExceededException();
        }
        // Daily rate cap (abuse-limits M3): sliding 24 h window on the
        // SUBMITTING act, independent of the active count. Deleting a row
        // frees its slot (the row is gone) — the churn vector stays bounded
        // by the active cap + the admin surface.
        if (!userRepository.isAdmin(user.getId())) {
            Instant windowStart = Instant.now().minus(DAILY_SUBMISSION_WINDOW);
            long submitted = shelterRepository.countByCreatedByAndSourceAndCreatedAtAfter(
                    user.getId(), ShelterSource.USER, windowStart);
            if (submitted >= dailySubmissionsPerUser) {
                throw new ShelterSubmissionThrottledException(retryAfterSeconds(windowStart, user.getId()));
            }
        }
        place.setCreatedBy(user.getId());
        // community-review-queue v2 D2: new community rows publish
        // immediately with the unverified trust state — the public list
        // is unchanged, the UI shows the "newly added" treatment.
        place.setReviewStatus(ReviewStatus.NEW);
        shelterRepository.save(place);
    }

    /** The user's own shelters (the author-scoped "my shelters" list). */
    public List<Shelter> findMine(long userId) {
        return shelterRepository.findByCreatedBy(userId);
    }

    /**
     * Seconds until the oldest in-window submission leaves the 24 h window
     * (the exact Retry-After for the daily cap); {@code null} when the
     * window is somehow empty (the handler then omits the header).
     */
    private Integer retryAfterSeconds(Instant windowStart, long userId) {
        return shelterRepository
                .findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
                        userId, ShelterSource.USER, windowStart)
                .map(Shelter::getCreatedAt)
                .filter(Objects::nonNull)
                .map(oldest -> Duration.between(Instant.now(),
                        oldest.plus(DAILY_SUBMISSION_WINDOW)).getSeconds())
                .filter(seconds -> seconds > 0)
                .map(seconds -> (int) Math.min(seconds, Integer.MAX_VALUE))
                .orElse(null);
    }

    /**
     * Replaces the editable fields of an existing shelter row — same id,
     * status/source/registry fields, {@code createdAt} and author untouched.
     * Callers own the authorization (author check) and validation (field
     * bounds + the Estonia bbox) before calling this.
     *
     * <p>Concurrent-DELETE race (2026-09-10 review n12): if the row was
     * deleted between the caller's read and this save, the repository's
     * unknown-id guard surfaces as {@link IllegalStateException} — mapped
     * HERE (the service boundary) to the same 404 as a plain not-found,
     * never a 500. Mapped by re-reading the row (observable state, not
     * message parsing); the repository keeps its internal guard.
     */
    public void updatePlace(Shelter place) {
        Objects.requireNonNull(place, "place");
        try {
            shelterRepository.save(place);
        } catch (IllegalStateException unknownId) {
            if (place.getId() != null && shelterRepository.findById(place.getId()).isEmpty()) {
                throw new ShelterNotFoundException(place.getId());
            }
            throw unknownId;
        }
    }

    /** Deletes a shelter row; its reviews cascade via the DB constraint. */
    public void deletePlace(long shelterId) {
        shelterRepository.deleteById(shelterId);
    }
}
