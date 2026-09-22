package ee.sheltermap.app;

import ee.sheltermap.domain.OpenStatusState;
import ee.sheltermap.domain.ShelterOpenStatusReport;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link ShelterOpenStatusReport} (live open/closed
 * state — same level as capacity). Implementations live in
 * {@code ee.sheltermap.persistence}; tests use in-memory fakes.
 */
public interface ShelterOpenStatusRepository {

    /**
     * Upserts by (shelterId, userId) — one live state per user per
     * shelter; a re-tap updates the existing row instead of inserting.
     */
    void save(ShelterOpenStatusReport report);

    Optional<ShelterOpenStatusReport> findByShelterIdAndUserId(long shelterId, long userId);

    /**
     * The distinct user ids whose CURRENT live state for one shelter is
     * the given state (one query) — the live-tap half of the
     * auto-confirm tally (one row per (shelter, user), so the state is
     * always the latest tap's).
     */
    List<Long> userIdsByShelterIdAndState(long shelterId, OpenStatusState state);

    /**
     * All open-status rows for the given shelters that are fresh
     * ({@code created_at} after {@code freshSince}) in ONE query — the
     * batched input of the read-time open-status derivation (no N+1).
     */
    List<ShelterOpenStatusReport> findFreshByShelterIds(Collection<Long> shelterIds, Instant freshSince);
}
