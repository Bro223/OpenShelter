package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterOccupancyReport;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Persistence seam for {@link ShelterOccupancyReport} (shelter-trust-and-
 * reports D4). Implementations live in {@code ee.sheltermap.persistence};
 * tests use in-memory fakes.
 */
public interface ShelterOccupancyRepository {

    /**
     * Upserts by (shelterId, userId) — one live report per user per
     * shelter; a re-report updates the existing row instead of inserting.
     */
    void save(ShelterOccupancyReport report);

    Optional<ShelterOccupancyReport> findByShelterIdAndUserId(long shelterId, long userId);

    /**
     * All occupancy rows for the given shelters that are fresh
     * ({@code updated_at} after {@code freshSince}) in ONE query — the
     * batched input of the read-time occupancy derivation (no N+1).
     */
    List<ShelterOccupancyReport> findFreshByShelterIds(Collection<Long> shelterIds, Instant freshSince);
}
