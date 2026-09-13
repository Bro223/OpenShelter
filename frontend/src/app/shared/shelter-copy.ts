import type {
  LocationKind,
  OccupancyBand,
  Provenance,
  ShelterOccupancy,
  ShelterStatusFlag,
} from '../core/models';

/**
 * The shared shelter copy (W24): provenance labels + the rating-summary
 * phrasing, single-sourced for the consumers that used to carry divergent
 * inline copies — the map sidebar, the shelter detail header, the admin
 * list, and the contributions panel.
 */

/** "No ratings yet" — the null-average phrasing (never an invented zero). */
export const NO_RATINGS_YET = 'No ratings yet';

/**
 * The provenance label (shelter-provenance-taxonomy M6, superseding
 * accessibility-and-provenance D4 and the community-review-queue
 * trust-label split; proposed-community-wording M7 renamed the two
 * community states): the text for each taxonomy value. The four values
 * reachable in the public list — "Paasteamet registry" / "Municipal
 * registry" / "Community-reported" / "Proposed"; the two hidden values
 * (visible only on /mine, the detail read and the admin list) get their
 * own: "Reported inactive" / "Rejected". Single-sourced: map rows,
 * detail header, /mine badges, the admin list and the legend all call
 * this. The input is the server-derived `Provenance` — the FE never
 * re-derives it from source/reviewStatus.
 */
export function provenanceText(provenance: Provenance): string {
  switch (provenance) {
    case 'OFFICIAL':
      return 'Paasteamet registry';
    case 'PARTNER_VERIFIED':
      return 'Municipal registry';
    case 'COMMUNITY_REPORTED':
      return 'Community-reported';
    case 'UNDER_REVIEW':
      return 'Proposed';
    case 'REPORTED_INACTIVE':
      return 'Reported inactive';
    case 'REJECTED':
      return 'Rejected';
  }
}

/**
 * The provenance badge tone (M6): the badge follows the marker palette —
 * UNDER_REVIEW gets the amber "proposed" tone, COMMUNITY_REPORTED the
 * green one, REJECTED the danger one, REPORTED_INACTIVE the muted grey;
 * OFFICIAL / PARTNER_VERIFIED rows get no modifier (their base badge fill
 * already says registry). Applied on every surface that renders the
 * provenance badge (map row, detail header, admin list, /mine).
 */
export function provenanceBadgeClass(provenance: Provenance): string {
  switch (provenance) {
    case 'OFFICIAL':
    case 'PARTNER_VERIFIED':
      return '';
    case 'UNDER_REVIEW':
      return 'badge--new';
    case 'COMMUNITY_REPORTED':
      return 'badge--user';
    case 'REPORTED_INACTIVE':
      return 'badge--inactive';
    case 'REJECTED':
      return 'badge--rejected';
  }
}

/**
 * The private-home declaration badge (community-review-queue D7): shown
 * on list rows, the detail page and the admin list for rows whose
 * submitter declared the location a private home/shelter. Muted styling
 * at the point of use — a description, not a caveat.
 */
export const PRIVATE_LOCATION_BADGE = 'Private location';

/**
 * The detail-page note for PRIVATE rows (community-review-queue D7):
 * resident-offered, not an official facility. Exact copy is spec-pinned —
 * a copy change is a spec change.
 */
export const PRIVATE_LOCATION_NOTE =
  'This is a resident-offered location, not an official facility.';

/**
 * The unverified warning for community rows (community-review-queue, map-
 * browse delta; surfaces re-pinned by proposed-community-wording M7):
 * shown as a block on the detail page of community rows in the NEW state
 * (CONFIRMED rows keep the "Community-reported" badge and no warning),
 * and as a line under the around-you result when the highlighted row is
 * community (any review status). Exact copy is spec-pinned — a copy
 * change is a spec change. Muted styling at the point of use: this is a
 * caveat, not the crisis orange.
 */
export const COMMUNITY_UNVERIFIED_WARNING =
  'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.';

/**
 * The "reported inaccurate" warning (moderation-dashboard-completion M10
 * slice 4): the single-sourced sentence for a moderator-marked row. A
 * marked row stays visible with status and provenance untouched — the
 * warning is the treatment. Rendered on every surface that renders the
 * unverified treatment: the map's around-you line, the detail header,
 * the /mine rows and the admin list. Exact copy is spec-pinned — a copy
 * change is a spec change. Muted styling at the point of use: a caveat,
 * not the crisis orange.
 */
export const INACCURATE_WARNING = 'Reported inaccurate — details may be wrong';

/** The admin-list badge for a moderator-marked row (M10 slice 4). */
export const INACCURATE_BADGE = 'Inaccurate';

/** True for rows carrying the private-home declaration. */
export function isPrivateLocation(shelter: { locationKind: LocationKind }): boolean {
  return shelter.locationKind === 'PRIVATE';
}

/** The review count in singular/plural ("1 review" / "2 reviews"). */
export function reviewCountText(reviewCount: number): string {
  return `${reviewCount} review${reviewCount === 1 ? '' : 's'}`;
}

/**
 * The rating summary for a list row: "★ 4.5 · 2 reviews". A null average
 * renders {@link NO_RATINGS_YET} — never an invented zero (M4 spec).
 */
export function ratingText(averageRating: number | null, reviewCount: number): string {
  if (averageRating === null) {
    return NO_RATINGS_YET;
  }
  return `★ ${averageRating.toFixed(1)} · ${reviewCountText(reviewCount)}`;
}

// ---------------------------------------------------------------------------
// Trust layer copy (shelter-trust-and-reports D6): the map rows and the
// detail header render the SAME badge text — single-sourced here, the same
// W24 way provenanceLabel is. Copy changes are spec changes; the pins live
// in shelter-copy.spec.ts.
// ---------------------------------------------------------------------------

/**
 * The statusFlag badge text (D1 netting): amber "Reported closed" /
 * green "Confirmed open"; null = no flag (render nothing).
 */
export function statusFlagText(flag: ShelterStatusFlag | null): string | null {
  if (flag === 'REPORTED_CLOSED') {
    return 'Reported closed';
  }
  if (flag === 'CONFIRMED_OPEN') {
    return 'Confirmed open';
  }
  return null;
}

/** True when the DTO is in the reported state (D1: nonexistentReports > 0). */
export function hasReports(shelter: { nonexistentReports: number }): boolean {
  return shelter.nonexistentReports > 0;
}

/** True when the DTO carries at least one trust badge to render (D6). */
export function hasTrustBadges(shelter: {
  nonexistentReports: number;
  statusFlag: ShelterStatusFlag | null;
  occupancy: ShelterOccupancy | null;
}): boolean {
  return (
    shelter.nonexistentReports > 0 || shelter.statusFlag !== null || shelter.occupancy !== null
  );
}

// Report-submitted notices (shelter-trust-and-reports D6; the dampened
// variant is community-self-moderation M9): the detail page banner picks
// its text from the report's write outcome — single-sourced here, pinned
// in shelter-copy.spec.ts.

/** Plain success notice after a stored shelter report. */
export const REPORT_SUBMITTED = 'Your report was submitted.';

/**
 * Dampened report notice (M9, D3/D4): the report was recorded with reduced
 * weight because the reporter has their own other listing of a similar
 * location — a self-interested vote that counts zero toward the hide.
 */
export const REPORT_SUBMITTED_DAMPED =
  'Your report was recorded with reduced weight — you have your own listing of a similar location.';

/** Firm band copy (D4) — >= 2 fresh reports agreeing with the latest band. */
export const OCCUPANCY_FIRM_COPY: Record<OccupancyBand, string> = {
  SPACE: 'Space available',
  GETTING_FULL: 'Getting full',
  FULL: 'Full',
};

/** Hedged band copy (D4) — exactly one fresh report (a lone claim). */
export const OCCUPANCY_HEDGED_COPY: Record<OccupancyBand, string> = {
  SPACE: 'Reported space available',
  GETTING_FULL: 'Reported getting full',
  FULL: 'Reported full',
};

/**
 * The recency suffix of the occupancy badge ("12 min ago"). The freshness
 * WINDOW itself is server-side (2 h, read-time); this only formats the
 * server's lastReportedAt relative to now. `now` is injectable so specs are
 * deterministic.
 */
export function recencyText(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (Number.isNaN(minutes) || minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  return `${Math.round(minutes / 60)} h ago`;
}

/**
 * The occupancy badge line (D4/D6): firm head at reportCount >= 2
 * ("Full · 12 min ago"), hedged at exactly 1 ("Reported full · 12 min
 * ago"). Occupancy is display-only — the copy deliberately never reads
 * as success or crisis; the styling is the neutral badge class.
 */
export function occupancyText(occupancy: ShelterOccupancy, now: number = Date.now()): string {
  const head =
    occupancy.reportCount >= 2
      ? OCCUPANCY_FIRM_COPY[occupancy.band]
      : OCCUPANCY_HEDGED_COPY[occupancy.band];
  return `${head} · ${recencyText(occupancy.lastReportedAt, now)}`;
}

// ---------------------------------------------------------------------------
// Last-verified meta (last-verified-meta M8): the per-entry verification
// stamp + the report counts, single-sourced like the rest of the trust
// copy. The DATUM is server-derived (ShelterDto.lastVerifiedAt / reportCount);
// these helpers only format. Copy changes are spec changes — pins live in
// shelter-copy.spec.ts.
// ---------------------------------------------------------------------------

/**
 * The reported badge with its count (M8): "Reported (2)" — the count is the
 * `nonexistentReports` subset that drives the badge (not the total report
 * count). Rendered on the map row and the detail header wherever the
 * orange "Reported" badge appears.
 */
export function reportedBadgeText(nonexistentReports: number): string {
  return `Reported (${nonexistentReports})`;
}

/**
 * Relative text for a verification stamp (M8): coarser than
 * {@link recencyText} — occupancy freshness lives in minutes/hours, but a
 * verification stamp can be days or weeks old (an import from last week).
 * Under 7 days it stays relative; older stamps fall back to a concrete
 * date (en-GB style — "12 Sep 2026" — formatted by hand so the output is
 * deterministic across Node ICU versions and user time zones, UTC-based).
 * `now` is injectable so specs are deterministic.
 */
const MONTHS_EN_GB = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function verifiedAgoText(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (Number.isNaN(minutes) || minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days} d ago`;
  }
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_EN_GB[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * The per-entry "last verified" line (M8): a verified row reads
 * "Last verified {ago}"; an UNDER_REVIEW row is never verified — its line
 * IS the under-review signal, pairing the proposal age with the missing
 * check; any other row without a verification record (e.g. a dev DB before
 * the first import) reads "No verification record yet".
 */
export function lastVerifiedText(
  shelter: { lastVerifiedAt: string | null; provenance: Provenance; createdAt: string },
  now: number = Date.now(),
): string {
  if (shelter.lastVerifiedAt === null) {
    return shelter.provenance === 'UNDER_REVIEW'
      ? `Proposed ${verifiedAgoText(shelter.createdAt, now)} — not yet verified`
      : 'No verification record yet';
  }
  return `Last verified ${verifiedAgoText(shelter.lastVerifiedAt, now)}`;
}

/**
 * The community report count line (M8): "1 community report" /
 * "N community reports" — the TOTAL over all report types (the badge's
 * "Reported (n)" stays the NON_EXISTENT subset).
 */
export function communityReportsText(reportCount: number): string {
  return `${reportCount} community report${reportCount === 1 ? '' : 's'}`;
}

/** True when the DTO carries at least one community report of any type (M8). */
export function hasCommunityReports(shelter: { reportCount: number }): boolean {
  return shelter.reportCount > 0;
}

/**
 * The straight-line distance line (community-review-queue D6 — distance
 * honesty): "≈ 2.4 km straight line" (1 decimal), whole metres below 1 km
 * ("≈ 450 m straight line"). The copy NEVER claims a walking route or
 * official status — it states what it measures. Moved here in M12 from
 * map-page.ts (it is a pure formatter with two consumers — the map's
 * nearest line / address-anchor rows and the detail page's distance-from-
 * you line — so the shared copy module is its home; the geolocation ERROR
 * copy stays mirrored per feature, the W9/W15 convention).
 */
export function straightLineText(km: number): string {
  if (km < 1) {
    return `≈ ${Math.round(km * 1000)} m straight line`;
  }
  return `≈ ${km.toFixed(1)} km straight line`;
}
