package ee.sheltermap.api;

import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.ShelterStatusFlag;

/**
 * One row of the admin shelter list (admin-moderation D3) — every shelter,
 * ALL statuses (auto-hidden rows included), id-ordered, with the same
 * batched trust derivations as the public list (shelter-trust-and-reports
 * D1/D4 — no N+1) plus the submitter's profile name.
 *
 * <p>{@code rating} is the visible-review average ({@code null} when the
 * shelter has no visible reviews — hidden reviews don't count, same as the
 * public projection); {@code nonexistentReports} is 0 when none;
 * {@code statusFlag} is the CLOSED vs OPEN_CONFIRMED net (null = no flag);
 * {@code occupancy} is the fresh (≤ 2 h) block, null when nothing is
 * fresh; {@code submitter} is the creator's profile name, {@code null} for
 * registry rows (no author) and for creators whose account no longer
 * exists.
 *
 * <p>Community trust (community-review-queue v2): {@code reviewStatus}
 * is the row's trust state — the "Unconfirmed" tab filters USER + NEW —
 * {@code reviewNote} is the admin's REJECT reason, and
 * {@code locationKind} is the private-home declaration (the "Private
 * location" badge renders on this surface too).
 *
 * <p>Provenance taxonomy (shelter-provenance-taxonomy M6): {@code provenance}
 * is the same server-derived value as on {@link ShelterDto} — this is the
 * one surface where all six values are reachable (the list keeps hidden
 * rows), so the admin badge renders REPORTED_INACTIVE / REJECTED tones
 * here.
 */
public record AdminShelterDto(
        Long id,
        String name,
        String address,
        ShelterSource source,
        ShelterStatus status,
        Double rating,
        int reviewCount,
        int nonexistentReports,
        ShelterStatusFlag statusFlag,
        ShelterDto.Occupancy occupancy,
        Integer capacity,
        String submitter,
        ReviewStatus reviewStatus,
        String reviewNote,
        LocationKind locationKind,
        Provenance provenance) {
}
