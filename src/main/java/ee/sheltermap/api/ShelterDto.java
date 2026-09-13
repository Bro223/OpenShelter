package ee.sheltermap.api;

import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;

import java.time.Instant;

/**
 * The versioned read contract with the frontend (05-shelter-api.puml).
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
 * affordance fires at {@code > 0}; {@code openStatus} is the live
 * open/closed block (same level as capacity) — the fresh (≤ 2 h) latest
 * tap's state, the number of fresh reporters agreeing with it, and the
 * newest fresh tap's time, null when nothing is fresh; {@code occupancy}
 * is the fresh (≤ 2 h) block — null when nothing is fresh, and the UI
 * hedges at {@code reportCount == 1} and firms at 2+; {@code
 * yourOccupancyBand} is the CALLER's own live band (detail endpoint
 * only; null for guests, anonymous callers and users without a report);
 * {@code yourOpenStatus} is the CALLER's own live open/closed state
 * (detail endpoint only; same null rules). The CLOSED/OPEN_CONFIRMED
 * report TYPES remain (historical rows, the auto-confirm path) — the
 * retired display flag (statusFlag) is gone with them. All derivations
 * are computed server-side in the batched projection — never
 * client-computed.
 *
 * <p>Community trust (community-review-queue v2 D2/D5/D7): every row
 * carries {@code reviewStatus} — NEW (unverified community row, the
 * amber "newly added" treatment), CONFIRMED (community-checked, or
 * registry rows, which backfill CONFIRMED), REJECTED (hidden; only
 * visible in /mine and the admin list) — and {@code locationKind}, the
 * submitter's private-home declaration (PRIVATE rows are public results
 * with the "Private location" badge). {@code reviewNote} is the admin's
 * REJECT reason, {@code null} while nothing is said.
 *
 * <p>Provenance taxonomy (shelter-provenance-taxonomy M6): {@code provenance}
 * is the server-derived single answer to "where does this row come from"
 * (OFFICIAL / PARTNER_VERIFIED / COMMUNITY_REPORTED / UNDER_REVIEW /
 * REPORTED_INACTIVE / REJECTED — see {@link Provenance} for the derivation
 * precedence). Only the first four values are reachable in the ACTIVE-only
 * public list; the hidden two ride on the detail, {@code /mine} and admin
 * projections. The UI never re-derives it.
 *
 * <p>Last-verified meta (last-verified-meta M8): {@code reportCount} is the
 * TOTAL community shelter-report count (all types; {@code nonexistentReports}
 * stays the NON_EXISTENT subset that drives the orange "Reported" badge),
 * and {@code lastVerifiedAt} is the per-entry verification stamp — registry
 * rows: the newest non-failed import of their source (a NOT_MODIFIED 304
 * re-check verifies; FAILED/SKIPPED do not); community rows: the newest
 * non-submitter OPEN_CONFIRMED report or CONFIRM/AUTO_CONFIRM moderation
 * action. {@code null} = never verified (the UNDER_REVIEW "not yet verified"
 * signal on the UI).
 *
 * <p>Information request (moderation-dashboard-completion M10 slice 3):
 * {@code infoRequest} is the moderator→submitter exchange for this row —
 * set on the {@code /mine} projection ONLY (the submitter's own surface);
 * {@code null} on the public list and detail reads (the exchange is
 * private between the admin and the author). The admin's own view carries
 * it on {@link AdminShelterDto} instead, with the requester's name.
 *
 * <p>Mark inaccurate (moderation-dashboard-completion M10 slice 4):
 * {@code inaccurate} is the server-derived moderator flag (the V20 stamp on
 * the row is set — idempotent mark/clear behind the admin endpoints). A
 * marked row stays visible with status and provenance untouched; the UI
 * renders the single-sourced warning on the unverified-treatment surfaces.
 */
public record ShelterDto(
        Long id,
        String name,
        String address,
        double latitude,
        double longitude,
        ShelterStatus status,
        ShelterSource source,
        Instant createdAt,
        String description,
        Integer capacity,
        boolean submitterVerified,
        int nonexistentReports,
        OpenStatus openStatus,
        Occupancy occupancy,
        OccupancyBand yourOccupancyBand,
        String yourOpenStatus,
        ReviewStatus reviewStatus,
        String reviewNote,
        LocationKind locationKind,
        Provenance provenance,
        int reportCount,
        Instant lastVerifiedAt,
        boolean inaccurate,
        InfoRequest infoRequest) {

    /**
     * The live open/closed block (same level as capacity): the LATEST
     * fresh tap's state (the tie-break is exactly the occupancy D4
     * derivation), the number of fresh taps agreeing with that state, and
     * the newest fresh tap's time. Null when nothing is fresh (≤ 2 h).
     */
    public record OpenStatus(
            String state,
            Instant reportedAt,
            int reportCount) {
    }

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

    /**
     * The moderator→submitter information request of this row (M10 slice 3)
     * — the {@code /mine} projection only (null on the public list and
     * detail reads). {@code replyMessage}/{@code repliedAt} are null until
     * the submitter has answered (one-time reply; the row is kept after).
     */
    public record InfoRequest(
            String message,
            Instant requestedAt,
            String replyMessage,
            Instant repliedAt) {
    }
}
