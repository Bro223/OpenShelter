package ee.sheltermap.api;

import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * One row of the admin shelter list (admin-moderation) — every shelter,
 * ALL statuses (auto-hidden rows included), id-ordered, with the same
 * batched trust derivations as the public list (shelter-trust-and-reports
 * no N+1) plus the submitter's profile name.
 *
 * <p>{@code nonexistentReports} is 0 when none;
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
 * <p>Provenance taxonomy (shelter-provenance-taxonomy): {@code provenance}
 * is the same server-derived value as on {@link ShelterDto} — this is the
 * one surface where all six values are reachable (the list keeps hidden
 * rows), so the admin badge renders REPORTED_INACTIVE / REJECTED tones
 * here.
 *
 * <p>Information request (moderation-dashboard-completion):
 * {@code infoRequest} is the moderator→submitter exchange for this row —
 * null when none exists. The admin sees the request together with the
 * submitter's reply here (audit posture: the row is kept after the reply),
 * with the requesting admin's profile name ("Unknown" after erasure —
 * no FK on requested_by).
 *
 * <p>Mark inaccurate (moderation-dashboard-completion):
 * {@code inaccurate} is the same server-derived flag as on
 * {@link ShelterDto} — the admin list is where the mark is managed, so the
 * row carries the state its Mark/Inaccurate actions toggle.
 */
@Schema(description = "One row of the admin shelter list — every shelter, ALL "
        + "statuses (auto-hidden rows included), id-ordered, with the same "
        + "batched trust derivations as the public list plus the submitter's "
        + "profile name. This is the one surface where all six provenance "
        + "values are reachable (the list keeps hidden rows).")
public record AdminShelterDto(
        Long id,
        String name,
        String address,
        ShelterSource source,
        ShelterStatus status,
        @Schema(description = "The NON_EXISTENT subset of the community "
                + "reports; 0 when none.")
        int nonexistentReports,
        @Schema(description = "The open 'inaccurate information' subset of the "
                + "community reports (WRONG_LOCATION + OTHER; 0 when none) — "
                + "EITHER report kind drives the reported state. Open "
                + "means not dismissed (a dismissed report stops counting).")
        int inaccurateReports,
        ShelterDto.Occupancy occupancy,
        Integer capacity,
        @Schema(description = "The creator's profile name; null for registry "
                + "rows (no author) and for creators whose account no longer "
                + "exists.")
        String submitter,
        @Schema(description = "The row's trust state — the 'Unconfirmed' tab "
                + "filters USER + NEW.")
        ReviewStatus reviewStatus,
        @Schema(description = "The admin's REJECT reason; null while nothing "
                + "is said.")
        String reviewNote,
        @Schema(description = "The private-home declaration (the 'Private "
                + "location' badge renders on this surface too).")
        LocationKind locationKind,
        @Schema(description = "The same server-derived value as on ShelterDto "
                + "— all six values are reachable here (the list keeps "
                + "hidden rows).")
        Provenance provenance,
        @Schema(description = "The same server-derived moderator flag as on "
                + "ShelterDto — the admin list is where the mark is managed.")
        boolean inaccurate,
        @Schema(description = "The moderator→submitter information exchange "
                + "for this row; null when none exists. The admin sees the "
                + "request together with the submitter's reply here (the row "
                + "is kept after the reply — audit posture), with the "
                + "requesting admin's profile name ('Unknown' after "
                + "erasure — no FK on requested_by).")
        InfoRequest infoRequest) {

    /**
     * The moderator→submitter information request of this row;
     * null when none exists. {@code replyMessage}/{@code repliedAt} are null
     * until the submitter has answered (one-time reply; the row is kept
     * after). {@code requestedByName} is the asking admin's profile name —
     * "Unknown" after the account's erasure.
     */
    public record InfoRequest(
            String message,
            Instant requestedAt,
            String requestedByName,
            String replyMessage,
            Instant repliedAt) {
    }
}
