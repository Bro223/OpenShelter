package ee.sheltermap.app;

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
     * All open-status rows for the given shelters that are fresh
     * ({@code created_at} after {@code freshSince}) in ONE query — the
     * batched input of the read-time open-status derivation (no N+1).
     */
    List<ShelterOpenStatusReport> findFreshByShelterIds(Collection<Long> shelterIds, Instant freshSince);
}
