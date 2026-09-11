package ee.sheltermap.api;

import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.ShelterStatusFlag;

import java.time.Instant;

/**
 * The versioned read contract with the frontend (05-shelter-api.puml).
 * {@code averageRating} is {@code null} when the shelter has no reviews yet.
 * Lean projection on purpose: the full registry record (county, municipality,
 * data-as-of, attribution) is stored locally but not dumped here — the UI
 * gets only what the map needs. {@code description}/{@code capacity} are
 * USER-submission details (stored since the V3 hardening pass).
 * {@code submitterVerified} is {@code true} when the shelter's creator exists
 * and has a completed verification, {@code false} for registry shelters (no
 * author) and for creators whose account no longer exists
 * (accessibility-and-provenance D3).
 *
 * <p>Trust layer (shelter-trust-and-reports D1/D4/D5):
 * {@code nonexistentReports} is 0 when none — the UI's orange "Reported"
 * affordance fires at {@code > 0}; {@code statusFlag} is the CLOSED vs
 * OPEN_CONFIRMED net (null = no flag); {@code occupancy} is the fresh
 * (≤ 2 h) block — null when nothing is fresh, and the UI hedges at
 * {@code reportCount == 1} and firms at 2+; {@code yourOccupancyBand}
 * is the CALLER's own live band (detail endpoint only; null for guests,
 * anonymous callers and users without a report). All derivations are
 * computed server-side in the batched projection — never client-computed.
 */
public record ShelterDto(
        Long id,
        String name,
        String address,
        double latitude,
        double longitude,
        ShelterStatus status,
        ShelterSource source,
        Double averageRating,
        int reviewCount,
        Instant createdAt,
        String description,
        Integer capacity,
        boolean submitterVerified,
        int nonexistentReports,
        ShelterStatusFlag statusFlag,
        Occupancy occupancy,
        OccupancyBand yourOccupancyBand) {

    /**
     * The fresh occupancy block (D4): the latest fresh report's band, the
     * number of fresh reports agreeing with that band (1 = hedged copy,
     * 2+ = firm), and the newest fresh report's time.
     */
    public record Occupancy(
            OccupancyBand band,
            int reportCount,
            Instant lastReportedAt) {
    }
}
