import type {
  LocationKind,
  OccupancyBand,
  OpenStatusDto,
  ReviewStatus,
  ShelterOccupancy,
  ShelterSource,
  ShelterStatus,
} from '../core/models';

/**
 * The shared shelter copy: source/trust labels + the practical-info
 * status line, single-sourced for its consumers — the map sidebar, the
 * shelter detail header, the admin list, and the contributions panel.
 */

/**
 * The community trust-state label (community-review-queue D5): a USER row
 * says what it IS in the trust lifecycle:
 *   NEW       -> "Newly added"       (amber marker treatment)
 *   CONFIRMED -> "Community-checked" (green marker treatment)
 *   REJECTED  -> "Rejected"          (hidden; /mine + admin surfaces only)
 */
export function communityTrustLabel(reviewStatus: ReviewStatus): string {
  switch (reviewStatus) {
    case 'NEW':
      return 'Newly added';
    case 'CONFIRMED':
      return 'Community-checked';
    case 'REJECTED':
      return 'Rejected';
  }
}

/**
 * The row's source/trust badge label: registry rows carry their registry
 * label ("Päästeamet registry" / "Municipal registry"); USER rows carry
 * the trust-state label instead (REJECTED rows are not public — the label
 * exists for the /mine + admin surfaces). Single-sourced: map rows, detail
 * header, /mine badges and the admin list all call this.
 */
export function sourceTrustLabel(shelter: {
  source: ShelterSource;
  reviewStatus: ReviewStatus;
}): string {
  if (shelter.source === 'PAASETEAMET') {
    return 'Päästeamet registry';
  }
  if (shelter.source === 'MUNICIPALITY') {
    return 'Municipal registry';
  }
  return communityTrustLabel(shelter.reviewStatus);
}

/**
 * The row's badge tone (community-review-queue D5): the badge follows the
 * marker's trust palette — USER rows in NEW get the amber "Newly added"
 * badge, REJECTED the danger one, CONFIRMED the green one. Registry rows
 * get no modifier (their base badge fill already says registry). Applied
 * on every surface that renders the badge (map row, detail header, admin
 * list, /mine).
 */
export function communityBadgeClass(shelter: {
  source: ShelterSource;
  reviewStatus: ReviewStatus;
}): string {
  if (shelter.source !== 'USER') {
    return '';
  }
  if (shelter.reviewStatus === 'NEW') {
    return 'badge--new';
  }
  if (shelter.reviewStatus === 'REJECTED') {
    return 'badge--rejected';
  }
  return 'badge--user';
}

/**
 * The private-home declaration badge (community-review-queue D7): shown
 * on list rows, the detail page and the admin list for rows whose
 * submitter declared the location a private home/shelter. Muted styling
 * at the point of use — a description, not a caveat. The copy says what it
 * IS (a declared private home), never what it is NOT: the app carries no
 * access data and must not claim any (owner decision, Option A).
 */
export const PRIVATE_LOCATION_BADGE = 'Private home (declared)';

/**
 * The detail-page note for PRIVATE rows (community-review-queue D7):
 * resident-offered, not an official facility. Exact copy is spec-pinned —
 * a copy change is a spec change.
 */
export const PRIVATE_LOCATION_NOTE =
  'This is a resident-offered location, not an official facility.';

/**
 * The unverified warning for community rows (community-review-queue, map-
 * browse delta): shown as a block on the detail page of USER rows in the
 * NEW state (CONFIRMED rows keep the "Community-checked" badge and no
 * warning), and as a line under the around-you result when the highlighted
 * row is community (any review status). Exact copy is spec-pinned — a
 * copy change is a spec change. Muted styling at the point of use: this is
 * a caveat, not the crisis orange.
 */
export const COMMUNITY_UNVERIFIED_WARNING =
  'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.';

/**
 * The "reported inaccurate" warning
 * (moderation-dashboard-completion): the single-sourced sentence for a
 * moderator-marked row. A marked row stays visible with status and trust
 * state untouched — the
 * warning is the treatment. Rendered on every surface that renders the
 * unverified treatment: the map's around-you line, the detail header,
 * the /mine rows and the admin list. Exact copy is spec-pinned — a copy
 * change is a spec change. Muted styling at the point of use: a caveat,
 * not the crisis orange.
 */
export const INACCURATE_WARNING = 'Reported inaccurate — details may be wrong';

/** The admin-list badge for a moderator-marked row. */
export const INACCURATE_BADGE = 'Inaccurate';

/** True for rows carrying the private-home declaration. */
export function isPrivateLocation(shelter: { locationKind: LocationKind }): boolean {
  return shelter.locationKind === 'PRIVATE';
}

/**
 * The shelter's derived display status: the FRESH
 * open/closed reports outrank the lifecycle status — a fresh lone CLOSED
 * report hedges ("Reported closed"), a fresh firm one (two+) is firm
 * ("Closed"), a fresh OPEN reads "Open"; with nothing fresh the lifecycle
 * status decides — INACTIVE reads "Closed", ACTIVE reads "Open (no recent
 * reports)". Single-sourced: the map's "Open" chip (isOpenRow), the amber
 * badge copy (openStatusBadgeText) and the admin-facing displays consume
 * the same rule. The PUBLIC detail page deliberately does NOT render it
 * (owner decision — its Info section shows the last reported rows instead,
 * which consult the same fresh reports and carry the time; see the Info
 * section comment in shelter-detail-page.html). INACTIVE rows normally
 * never reach the public UI (the detail read 404s), but the mapping stays
 * for the admin-facing displays.
 */
export function shelterStatusText(shelter: {
  status: ShelterStatus;
  openStatus: OpenStatusDto | null;
}): string {
  // An older BE omits the field entirely (undefined) — treat it as null
  // ("nothing fresh") so the FE ships ahead of the API safely.
  const fresh = shelter.openStatus ?? null;
  if (fresh !== null && fresh.state === 'CLOSED') {
    return fresh.reportCount === 1 ? 'Reported closed' : 'Closed';
  }
  if (fresh !== null && fresh.state === 'OPEN') {
    return 'Open';
  }
  if (shelter.status === 'INACTIVE') {
    return 'Closed';
  }
  return 'Open (no recent reports)';
}

/**
 * The map's "Open" chip predicate: keeps the rows whose derived display
 * status reads OPEN — fresh OPEN and nothing-fresh ("Open (no recent
 * reports)") — and drops the fresh-CLOSED rows (and lifecycle-INACTIVE rows,
 * which never reach the public list but the rule covers them). Client-side:
 * the BE has no open/closed param, the chip filters the loaded list without
 * a refetch.
 */
export function isOpenRow(shelter: {
  status: ShelterStatus;
  openStatus: OpenStatusDto | null;
}): boolean {
  if (shelter.status === 'INACTIVE') {
    return false;
  }
  return shelter.openStatus?.state !== 'CLOSED';
}

// ---------------------------------------------------------------------------
// Trust layer copy (shelter-trust-and-reports D6): the map rows and the
// detail header render the SAME badge text — single-sourced here, like the
// source/trust labels. Copy changes are spec changes; the pins live in
// shelter-copy.spec.ts.
// ---------------------------------------------------------------------------

/**
 * The list row's open/closed badge text: a fresh
 * CLOSED row carries the amber badge — the same copy the status row uses
 * ("Reported closed" at exactly one fresh report, "Closed" at two+). A
 * fresh OPEN row carries NO badge (open is the default — no noise); null
 * = nothing fresh (render nothing). Single-sourced: map rows and the
 * detail header render the same badge.
 */
export function openStatusBadgeText(openStatus: OpenStatusDto | null): string | null {
  // An older BE omits the field entirely (undefined) — treat it as null
  // ("nothing fresh") so the FE ships ahead of the API safely.
  const fresh = openStatus ?? null;
  if (fresh === null || fresh.state !== 'CLOSED') {
    return null;
  }
  return fresh.reportCount === 1 ? 'Reported closed' : 'Closed';
}

/** True when the DTO is in the reported state (D1: nonexistentReports > 0). */
export function hasReports(shelter: { nonexistentReports: number }): boolean {
  return shelter.nonexistentReports > 0;
}

/** True when the DTO carries at least one trust badge to render (D6) — a
 *  fresh OPEN openStatus carries no badge (open is the default), so only
 *  the fresh CLOSED one counts. */
export function hasTrustBadges(shelter: {
  nonexistentReports: number;
  openStatus: OpenStatusDto | null;
  occupancy: ShelterOccupancy | null;
}): boolean {
  return (
    shelter.nonexistentReports > 0 ||
    openStatusBadgeText(shelter.openStatus) !== null ||
    shelter.occupancy !== null
  );
}

// Report-submitted notices (shelter-trust-and-reports D6; the dampened
// variant is community-self-moderation): the detail page banner picks
// its text from the report's write outcome — single-sourced here, pinned
// in shelter-copy.spec.ts.

/** Plain success notice after a stored shelter report. */
export const REPORT_SUBMITTED = 'Your report was submitted.';

/**
 * Dampened report notice (community-self-moderation D3/D4; M8 honesty):
 * the report was STORED but the server weighted it 0 — the reporter has
 * their own other listing of a similar location, a self-interested vote
 * that contributes 0 to the trust-weighted hide tally. The copy says
 * plainly what "weighted 0" means for the user (it does not count toward
 * hiding the shelter) and why — the damping rule is no longer silent.
 */
export const REPORT_SUBMITTED_DAMPED =
  'Your report was recorded but weighted 0 — because you have your own listing of a similar location, it does not count toward hiding this shelter.';

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
// Last-verified meta (last-verified-meta): the per-entry verification
// stamp + the report counts, single-sourced like the rest of the trust
// copy. The DATUM is server-derived (ShelterDto.lastVerifiedAt / reportCount);
// these helpers only format. Copy changes are spec changes — pins live in
// shelter-copy.spec.ts.
// ---------------------------------------------------------------------------

/**
 * The reported badge with its count: "Reported (2)" — the count is the
 * `nonexistentReports` subset that drives the badge (not the total report
 * count). Rendered on the map row and the detail header wherever the
 * orange "Reported" badge appears.
 */
export function reportedBadgeText(nonexistentReports: number): string {
  return `Reported (${nonexistentReports})`;
}

/**
 * Relative text for a verification stamp: coarser than
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
 * The per-entry "last verified" line: a verified row reads
 * "Last verified {ago}" — and, for registry rows, says WHAT the check was
 * against ("against the registry": the newest non-failed import of the
 * row's source) so the stamp cannot be read as a community-sourced fact.
 * Community (USER) rows keep the plain form — their verification is a
 * community check or a moderator confirm, and neither attribution is safe
 * to hard-code. A NEW community row is never verified — its line IS the
 * not-yet-verified signal, pairing the submission age with the missing
 * check; any other row without a verification record (e.g. a dev DB before
 * the first import) reads "No verification record yet". M8: this line is
 * rendered SEPARATELY from the community report count — the two facts are
 * never joined into one string (the detail header renders them as two
 * lines, each self-contained).
 */
export function lastVerifiedText(
  shelter: {
    lastVerifiedAt: string | null;
    reviewStatus: ReviewStatus;
    createdAt: string;
    source: ShelterSource;
  },
  now: number = Date.now(),
): string {
  if (shelter.lastVerifiedAt === null) {
    return shelter.reviewStatus === 'NEW'
      ? `Newly added ${verifiedAgoText(shelter.createdAt, now)} — not yet verified`
      : 'No verification record yet';
  }
  const ago = verifiedAgoText(shelter.lastVerifiedAt, now);
  return shelter.source === 'USER'
    ? `Last verified ${ago}`
    : `Last verified against the registry ${ago}`;
}

/**
 * The community report count line: "Community reports: N (total, all
 * types)" — the LIFETIME TOTAL over all report types, labeled as such so
 * it cannot be read as a live tally: the open/closed and how-full taps are
 * live states (one per user, latest wins) and do not change this count, and
 * the count does not move the verification stamp on the line above. (The
 * badge's "Reported (n)" stays the NON_EXISTENT subset.) M8: a separate
 * line from the verification stamp — never spliced onto it.
 */
export function communityReportsText(reportCount: number): string {
  return `Community reports: ${reportCount} (total, all types)`;
}

/** True when the DTO carries at least one community report of any type. */
export function hasCommunityReports(shelter: { reportCount: number }): boolean {
  return shelter.reportCount > 0;
}

/**
 * The straight-line distance line (community-review-queue D6 — distance
 * honesty): "≈ 2.4 km straight line" (1 decimal), whole metres below 1 km
 * ("≈ 450 m straight line"). The copy NEVER claims a walking route or
 * official status — it states what it measures. A pure formatter with two
 * consumers — the map's nearest line / address-anchor rows and the detail
 * page's distance-from-you line — so the shared copy module is its home;
 * the geolocation ERROR copy stays mirrored per feature).
 */
export function straightLineText(km: number): string {
  if (km < 1) {
    return `≈ ${Math.round(km * 1000)} m straight line`;
  }
  return `≈ ${km.toFixed(1)} km straight line`;
}
