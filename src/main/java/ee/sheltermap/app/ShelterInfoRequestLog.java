package ee.sheltermap.app;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * The moderator→submitter information request (moderation-dashboard-
 * completion) — ONE row per shelter (the UNIQUE shelter_id
 * bound): the admin asks, the submitter answers ONCE on their own row,
 * and the row is KEPT after the reply (audit posture — never deleted).
 *
 * <p>Guard vocabulary (the seam is the single source — both the admin
 * write and the author reply go through it):
 * <ul>
 *   <li>{@link #request} throws {@link DuplicateInfoRequestException}
 *       (→ 409) when the shelter already has a request — replied or not;</li>
 *   <li>{@link #reply} throws {@link InfoRequestNotFoundException} (→ 404)
 *       when the shelter has no request and
 *       {@link InfoRequestAlreadyAnsweredException} (→ 409) when it was
 *       already answered.</li>
 * </ul>
 *
 * <p>{@code requested_by} (the moderating admin) and {@code replied_by}
 * (the submitter) carry no read-time guarantee — an account erasure
 * orphans them (no FK, rendered "Unknown" at read time, the V14
 * convention).
 */
public interface ShelterInfoRequestLog {

    /** One information-request row as read by the projections. */
    record InfoRequest(Long id, Long shelterId, String message, Long requestedBy,
                       Instant requestedAt, String replyMessage, Long repliedBy,
                       Instant repliedAt) {
        /** {@code true} once the submitter has answered (the one-time reply). */
        public boolean isAnswered() {
            return repliedAt != null;
        }
    }

    /**
     * Stores the moderator's request for a shelter.
     *
     * @throws DuplicateInfoRequestException the shelter already has a
     *                                       request (→ 409)
     */
    InfoRequest request(long shelterId, String message, Long requestedBy);

    /** The shelter's single request row, if any (replied rows included). */
    Optional<InfoRequest> findByShelterId(long shelterId);

    /**
     * The request rows for a batch of shelters in ONE lookup (no N+1) —
     * at most one per shelter (the UNIQUE bound). Shelters without a
     * request are simply absent from the map.
     */
    Map<Long, InfoRequest> findByShelterIds(Collection<Long> shelterIds);

    /**
     * The submitter's ONE-TIME reply.
     *
     * @throws InfoRequestNotFoundException      the shelter has no request
     *                                           (→ 404)
     * @throws InfoRequestAlreadyAnsweredException the request was already
     *                                             answered (→ 409)
     */
    InfoRequest reply(long shelterId, String replyMessage, Long repliedBy);
}
