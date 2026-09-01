package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;

import java.time.Instant;

/**
 * The versioned read contract with the frontend (05-shelter-api.puml).
 * {@code averageRating} is {@code null} when the shelter has no reviews yet.
 * Lean projection on purpose: the full registry record (county, municipality,
 * data-as-of, attribution) is stored locally but not dumped here — the UI
 * gets only what the map needs. {@code description}/{@code capacity} are
 * USER-submission details (stored since the V3 hardening pass).
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
        Integer capacity) {
}
