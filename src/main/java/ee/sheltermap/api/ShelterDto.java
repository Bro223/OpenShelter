package ee.sheltermap.api;

import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * The versioned read contract with the frontend (05-shelter-api.puml;
 * machine-readable companion: the OpenAPI document, served at /v3/api-docs
 * in dev/test and committed as docs/api/openapi.json). Lean projection on
 * purpose: the full registry record (county, municipality, data-as-of,
 * attribution) is stored locally but not dumped here — the UI gets only
 * what the map needs. {@code description}/{@code capacity} are
 * USER-submission details (stored since the V3 migration).
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
 * <p>Provenance taxonomy (shelter-provenance-taxonomy): {@code provenance}
 * is the server-derived single answer to "where does this row come from"
 * (OFFICIAL / PARTNER_VERIFIED / COMMUNITY_REPORTED / UNDER_REVIEW /
 * REPORTED_INACTIVE / REJECTED — see {@link Provenance} for the derivation
 * precedence). Only the first four values are reachable in the ACTIVE-only
 * public list; the hidden two ride on the detail, {@code /mine} and admin
 * projections. The UI never re-derives it.
 *
 * <p>Last-verified meta (last-verified-meta): {@code reportCount} is the
 * TOTAL community shelter-report count (all types; {@code nonexistentReports}
 * stays the NON_EXISTENT subset that drives the orange "Reported" badge),
 * and {@code lastVerifiedAt} is the per-entry verification stamp — registry
 * rows: the newest non-failed import of their source (a NOT_MODIFIED 304
 * re-check verifies; FAILED/SKIPPED do not); community rows: the newest
 * non-submitter OPEN_CONFIRMED report or CONFIRM/AUTO_CONFIRM moderation
 * action. {@code null} = never verified (the UNDER_REVIEW "not yet verified"
 * signal on the UI).
 *
 * <p>Information request (moderation-dashboard-completion):
 * {@code infoRequest} is the moderator→submitter exchange for this row —
 * set on the {@code /mine} projection ONLY (the submitter's own surface);
 * {@code null} on the public list and detail reads (the exchange is
 * private between the admin and the author). The admin's own view carries
 * it on {@link AdminShelterDto} instead, with the requester's name.
 *
 * <p>Mark inaccurate (moderation-dashboard-completion):
 * {@code inaccurate} is the server-derived moderator flag (the V20 stamp on
 * the row is set — idempotent mark/clear behind the admin endpoints). A
 * marked row stays visible with status and provenance untouched; the UI
 * renders the single-sourced warning on the unverified-treatment surfaces.
 */
@Schema(description = "The versioned read contract with the frontend "
        + "(05-shelter-api.puml; machine-readable: docs/api/openapi.json). "
        + "Lean projection — the UI gets only what the map needs; every "
        + "derivation is computed server-side, never client-computed.")
public record ShelterDto(
        @Schema(description = "The shelter id — public (public GET), so "
                + "403-vs-404 on author mutations leaks nothing.")
        Long id,
        String name,
        String address,
        double latitude,
        double longitude,
        ShelterStatus status,
        ShelterSource source,
        Instant createdAt,
        @Schema(description = "USER-submission detail (stored since the V3 "
                + "hardening pass); null on registry rows.")
        String description,
        @Schema(description = "USER-submission detail (capacity); null on "
                + "registry rows without capacity data.")
        Integer capacity,
        @Schema(description = "true when the shelter's creator exists and has "
                + "a completed verification; false for registry shelters (no "
                + "author) and for creators whose account no longer exists.")
        boolean submitterVerified,
        @Schema(description = "The NON_EXISTENT subset of the community reports "
                + "(0 when none) — the UI's orange 'Reported' affordance fires "
                + "at > 0. Distinct from reportCount (the TOTAL).")
        int nonexistentReports,
        ShelterDto.OpenStatus openStatus,
        ShelterDto.Occupancy occupancy,
        @Schema(description = "CALLER-scoped: the caller's own live occupancy "
                + "band for this shelter. Detail endpoint only; null for "
                + "guests, anonymous callers and users without a report.")
        OccupancyBand yourOccupancyBand,
        @Schema(description = "CALLER-scoped: the caller's own live open/closed "
                + "state (detail endpoint only; same null rules as "
                + "yourOccupancyBand).")
        String yourOpenStatus,
        @Schema(description = "The row's trust state: NEW (unverified community "
                + "row — the amber 'newly added' treatment), CONFIRMED "
                + "(community-checked, or registry rows, which backfill "
                + "CONFIRMED), REJECTED (hidden — visible in /mine and the "
                + "admin list only).")
        ReviewStatus reviewStatus,
        @Schema(description = "The admin's REJECT reason; null while nothing "
                + "is said. Owner-scoped on the public surfaces.")
        String reviewNote,
        @Schema(description = "The submitter's private-home declaration; "
                + "PRIVATE rows are public results with the 'Private "
                + "location' badge.")
        LocationKind locationKind,
        @Schema(description = "Server-derived single answer to 'where does this "
                + "row come from' (OFFICIAL / PARTNER_VERIFIED / "
                + "COMMUNITY_REPORTED / UNDER_REVIEW / REPORTED_INACTIVE / "
                + "REJECTED — see the Provenance derivation precedence). Only "
                + "the first four are reachable in the ACTIVE-only public "
                + "list. The UI never re-derives it.")
        Provenance provenance,
        @Schema(description = "The TOTAL community shelter-report count (all "
                + "types). Distinct from nonexistentReports (the "
                + "NON_EXISTENT subset that drives the 'Reported' badge).")
        int reportCount,
        @Schema(description = "The per-entry verification stamp: registry rows "
                + "— the newest non-failed import of their source (a "
                + "NOT_MODIFIED 304 re-check verifies; FAILED/SKIPPED do "
                + "not); community rows — the newest non-submitter "
                + "OPEN_CONFIRMED report or CONFIRM/AUTO_CONFIRM moderation "
                + "action. null = never verified (the UNDER_REVIEW 'not yet "
                + "verified' signal).")
        Instant lastVerifiedAt,
        @Schema(description = "The server-derived moderator 'inaccurate' flag "
                + "(idempotent mark/clear behind the admin endpoints). A "
                + "marked row stays visible with status and provenance "
                + "untouched.")
        boolean inaccurate,
        @Schema(description = "CALLER-scoped: the moderator→submitter "
                + "information exchange for this row — set on the /mine "
                + "projection ONLY (the submitter's own surface); null on "
                + "the public list and detail reads (the exchange is "
                + "private between the admin and the author).")
        InfoRequest infoRequest) {

    /**
     * The live open/closed block (same level as capacity): the LATEST
     * fresh tap's state (the tie-break is exactly the occupancy D4
     * derivation), the number of fresh taps agreeing with that state, and
     * the newest fresh tap's time. Null when nothing is fresh (≤ 2 h).
     */
    @Schema(description = "The live open/closed block: the latest fresh tap's "
            + "state, the number of fresh taps agreeing with it, and the "
            + "newest fresh tap's time. null when nothing is fresh (≤ 2 h).")
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
    @Schema(description = "The fresh (≤ 2 h) occupancy block: the latest fresh "
            + "report's band, the number of fresh reports agreeing with it "
            + "(1 = hedged copy, 2+ = firm), and the newest fresh report's "
            + "time. null when nothing is fresh.")
    public record Occupancy(
            OccupancyBand band,
            int reportCount,
            Instant lastReportedAt) {
    }

    /**
     * The moderator→submitter information request of this row
     * — the {@code /mine} projection only (null on the public list and
     * detail reads). {@code replyMessage}/{@code repliedAt} are null until
     * the submitter has answered (one-time reply; the row is kept after).
     */
    @Schema(description = "The moderator→submitter information request of this "
            + "row — the /mine projection only (null on the public list and "
            + "detail reads). replyMessage/repliedAt are null until the "
            + "submitter has answered (one-time reply; the row is kept "
            + "after).")
    public record InfoRequest(
            String message,
            Instant requestedAt,
            String replyMessage,
            Instant repliedAt) {
    }
}
