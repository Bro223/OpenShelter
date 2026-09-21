import { EN } from '../core/i18n/en';
import { MONTH_ABBREVS } from '../core/i18n/locale';
import { interpolate } from '../core/i18n/i18n.service';
import type { MessageKey } from '../core/i18n/messages';
import type {
  LocationKind,
  OccupancyBand,
  OpenStatusDto,
  ReviewStatus,
  ShelterOccupancy,
  ShelterSource,
  ShelterStatus,
  SubmitterVerification,
} from '../core/models';

/**
 * The shared shelter copy: source/trust labels + the practical-info
 * status line, single-sourced for its consumers — the map sidebar, the
 * shelter detail header, the admin list, and the contributions panel.
 *
 * i18n (N7 i18n-completeness): every user-visible string in this module
 * now runs through the CATALOG. Each copy function takes an optional
 * trailing `translate` callback — the same seam error-copy.ts's
 * bannerMessage() uses. Public pages pass `(key, params) => i18n.t(key,
 * params)` (the active locale); callers that pass none get the EN
 * catalog value, byte-identical to the old hardcoded literals, so the
 * admin surface (still un-routed) keeps its current copy. The nine
 * strings that already had translated catalog twins — the trust-state
 * labels, the two registry labels, the inaccurate warning and the three
 * FIRM band heads — REUSE those keys (account.contrib.* / detail.band.*),
 * never a duplicate: one fact can no longer read in two languages inside
 * one view.
 */

/** The i18n seam (the error-copy.ts precedent): the active-locale
 *  resolver for a catalog key, with the `{param}` interpolation map. */
export type ShelterTranslate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

/** The no-callback path: the EN catalog value (byte-identical to the
 *  old hardcoded literals — behavior unchanged for un-routed callers). */
const EN_FALLBACK: ShelterTranslate = (key, params) =>
  params === undefined ? EN[key] : interpolate(EN[key], params);

/** Resolve a key through the seam: the caller's locale when a callback
 *  was passed, the EN catalog otherwise. */
function resolve(
  key: MessageKey,
  translate: ShelterTranslate | undefined,
  params?: Record<string, string | number>,
): string {
  const tr = translate ?? EN_FALLBACK;
  return params === undefined ? tr(key) : tr(key, params);
}

/** The verification depth -> its "added by …" catalog key. */
const SUBMITTER_LABEL_KEY: Record<SubmitterVerification, MessageKey> = {
  EMAIL: 'shelter.submitterVerification.email',
  PHONE: 'shelter.submitterVerification.phone',
  SMART_ID: 'shelter.submitterVerification.smartId',
  FULL: 'shelter.submitterVerification.full',
};

/**
 * The "added by …" badge CATALOG KEY for a row's submitter, or null for NO
 * badge: registry rows, a deleted account, an author with no confirmed channel
 * yet, or an older backend that omits the field. The caller renders it through
 * the `| t` pipe, so the badge follows the active locale with no extra seam.
 *
 * Rendered on the shelter DETAIL header; the map row deliberately stays lean —
 * there the marker SHAPE carries the depth (owner decision: no extra badge
 * clutter in the sidebar row).
 */
export function submitterVerificationKey(shelter: {
  submitterVerification?: SubmitterVerification | null;
}): MessageKey | null {
  const depth = shelter.submitterVerification;
  return depth == null ? null : SUBMITTER_LABEL_KEY[depth];
}

/**
 * The marker's verification tone: 'partial' at exactly one confirmed channel,
 * 'full' at two or more, null when there is nothing to show (registry rows, no
 * author, an older backend). The SHAPE carries the depth so the distinction
 * never rests on colour alone (WCAG 1.4.1) — the same rationale as the anchor
 * diamond. The colour family (verified yellow) is a second cue, not the only
 * one. Shares the tone vocabulary with {@code markerTone}.
 */
export function verificationTone(shelter: {
  submitterVerification?: SubmitterVerification | null;
}): 'partial' | 'full' | null {
  const depth = shelter.submitterVerification;
  if (depth == null) {
    return null;
  }
  return depth === 'FULL' ? 'full' : 'partial';
}

/**
 * The community trust-state label (community-review-queue D5): a USER row
 * says what it IS in the trust lifecycle:
 *   NEW       -> "Newly added"       (amber marker treatment)
 *   CONFIRMED -> "Community-checked" (green marker treatment)
 *   REJECTED  -> "Rejected"          (hidden; /mine + admin surfaces only)
 * The keys are the contributions panel's catalog set (account.contrib.
 * badge.*) — the same words the /mine panel has rendered translated all
 * along.
 */
const TRUST_BADGE_KEY: Record<ReviewStatus, MessageKey> = {
  NEW: 'account.contrib.badge.new',
  CONFIRMED: 'account.contrib.badge.confirmed',
  REJECTED: 'account.contrib.badge.rejected',
};

export function communityTrustLabel(
  reviewStatus: ReviewStatus,
  translate?: ShelterTranslate,
): string {
  return resolve(TRUST_BADGE_KEY[reviewStatus], translate);
}

/**
 * The row's source/trust badge label: registry rows carry their registry
 * label ("Päästeamet registry" / "Municipal registry"); USER rows carry
 * the trust-state label instead (REJECTED rows are not public — the label
 * exists for the /mine + admin surfaces). Single-sourced: map rows, detail
 * header, /mine badges and the admin list all call this. The labels are
 * the contributions panel's catalog keys (account.contrib.source.*) —
 * byte-identical EN, translated ET/RU.
 */
export function sourceTrustLabel(
  shelter: {
    source: ShelterSource;
    reviewStatus: ReviewStatus;
  },
  translate?: ShelterTranslate,
): string {
  if (shelter.source === 'PAASETEAMET') {
    return resolve('account.contrib.source.paasteamet', translate);
  }
  if (shelter.source === 'MUNICIPALITY') {
    return resolve('account.contrib.source.municipality', translate);
  }
  return communityTrustLabel(shelter.reviewStatus, translate);
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
 *
 * The public templates render this through the `t` pipe
 * (`'shelter.privateBadge' | t`); the const stays for the un-routed
 * admin call sites and is the EN catalog value — one source.
 */
export const PRIVATE_LOCATION_BADGE = EN['shelter.privateBadge'];

/**
 * The detail-page note for PRIVATE rows (community-review-queue D7):
 * resident-offered, not an official facility. The public template renders
 * this through the `t` pipe (`'shelter.privateNote' | t`); the const
 * stays for the un-routed admin call sites (EN catalog value).
 */
export const PRIVATE_LOCATION_NOTE = EN['shelter.privateNote'];

/**
 * The unverified warning for community rows (community-review-queue, map-
 * browse delta): shown as a block on the detail page of USER rows in the
 * NEW state (CONFIRMED rows keep the "Community-checked" badge and no
 * warning), and as a line under the around-you result when the highlighted
 * row is community (any review status). Muted styling at the point of use:
 * a caveat, not the crisis orange. The public templates render this
 * through the `t` pipe (`'shelter.unverifiedWarning' | t`); the const
 * stays for the un-routed admin call sites (EN catalog value).
 */
export const COMMUNITY_UNVERIFIED_WARNING = EN['shelter.unverifiedWarning'];

/**
 * The "reported inaccurate" warning
 * (moderation-dashboard-completion): the single-sourced sentence for a
 * moderator-marked row. A marked row stays visible with status and trust
 * state untouched — the warning is the treatment. Rendered on every
 * surface that renders the unverified treatment: the map's around-you
 * line, the detail header, the /mine rows and the admin list. Muted
 * styling at the point of use: a caveat, not the crisis orange.
 *
 * The key is the contributions panel's catalog entry (account.contrib.
 * inaccurate) — the public templates render it through the `t` pipe; the
 * const stays for the un-routed admin call sites (EN catalog value).
 */
export const INACCURATE_WARNING = EN['account.contrib.inaccurate'];

/**
 * The admin-list badge for a moderator-marked row. Admin-only — it has no
 * catalog key on purpose: the admin surface is the other lane's copy work
 * (P1-4), and keying only the public consumers would leave this one
 * dangling.
 */
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
export function shelterStatusText(
  shelter: {
    status: ShelterStatus;
    openStatus: OpenStatusDto | null;
  },
  translate?: ShelterTranslate,
): string {
  // An older BE omits the field entirely (undefined) — treat it as null
  // ("nothing fresh") so the FE ships ahead of the API safely.
  const fresh = shelter.openStatus ?? null;
  if (fresh !== null && fresh.state === 'CLOSED') {
    return resolve(
      fresh.reportCount === 1 ? 'shelter.status.reportedClosed' : 'shelter.status.closed',
      translate,
    );
  }
  if (fresh !== null && fresh.state === 'OPEN') {
    return resolve('shelter.status.open', translate);
  }
  if (shelter.status === 'INACTIVE') {
    return resolve('shelter.status.closed', translate);
  }
  return resolve('shelter.status.openNoReports', translate);
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
// source/trust labels.
// ---------------------------------------------------------------------------

/**
 * The list row's open/closed badge text: a fresh
 * CLOSED row carries the amber badge — the same copy the status row uses
 * ("Reported closed" at exactly one fresh report, "Closed" at two+). A
 * fresh OPEN row carries NO badge (open is the default — no noise); null
 * = nothing fresh (render nothing). Single-sourced: map rows and the
 * detail header render the same badge.
 */
export function openStatusBadgeText(
  openStatus: OpenStatusDto | null,
  translate?: ShelterTranslate,
): string | null {
  // An older BE omits the field entirely (undefined) — treat it as null
  // ("nothing fresh") so the FE ships ahead of the API safely.
  const fresh = openStatus ?? null;
  if (fresh === null || fresh.state !== 'CLOSED') {
    return null;
  }
  return resolve(
    fresh.reportCount === 1 ? 'shelter.status.reportedClosed' : 'shelter.status.closed',
    translate,
  );
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
// its text from the report's write outcome. The keys live in the
// catalog (shelter.notice.*); the consts stay for the un-routed call
// sites and are the EN catalog values — one source.

/** Plain success notice after a stored shelter report. */
export const REPORT_SUBMITTED = EN['shelter.notice.reportSubmitted'];

/**
 * Dampened report notice (community-self-moderation D3/D4; M8 honesty):
 * the report was STORED but the server weighted it 0 — the reporter has
 * their own other listing of a similar location, a self-interested vote
 * that contributes 0 to the trust-weighted hide tally. The copy says
 * plainly what "weighted 0" means for the user (it does not count toward
 * hiding the shelter) and why — the damping rule is no longer silent.
 */
export const REPORT_SUBMITTED_DAMPED = EN['shelter.notice.reportSubmittedDamped'];

/**
 * Firm band heads (D4) — >= 2 fresh reports agreeing with the latest
 * band. These REUSE the band picker's catalog keys (detail.band.*): the
 * picker button and the badge for the same band are one word in every
 * locale (the EN values are byte-identical; ET/RU are translated once,
 * not twice).
 */
export const OCCUPANCY_FIRM_KEY: Record<OccupancyBand, MessageKey> = {
  SPACE: 'detail.band.space',
  GETTING_FULL: 'detail.band.gettingFull',
  FULL: 'detail.band.full',
};

/** Hedged band heads (D4) — exactly one fresh report (a lone claim). */
export const OCCUPANCY_HEDGED_KEY: Record<OccupancyBand, MessageKey> = {
  SPACE: 'shelter.occupancy.hedged.space',
  GETTING_FULL: 'shelter.occupancy.hedged.gettingFull',
  FULL: 'shelter.occupancy.hedged.full',
};

/**
 * The recency suffix of the occupancy badge ("12 min ago"). The freshness
 * WINDOW itself is server-side (2 h, read-time); this only formats the
 * server's lastReportedAt relative to now. `now` is injectable so specs
 * are deterministic.
 */
export function recencyText(
  iso: string,
  now: number = Date.now(),
  translate?: ShelterTranslate,
): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (Number.isNaN(minutes) || minutes < 1) {
    return resolve('shelter.recency.justNow', translate);
  }
  if (minutes < 60) {
    return resolve('shelter.recency.minutes', translate, { minutes });
  }
  return resolve('shelter.recency.hours', translate, { hours: Math.round(minutes / 60) });
}

/**
 * The occupancy badge line (D4/D6): firm head at reportCount >= 2
 * ("Full · 12 min ago"), hedged at exactly 1 ("Reported full · 12 min
 * ago"). Occupancy is display-only — the copy deliberately never reads
 * as success or crisis; the styling is the neutral badge class. The `·`
 * is a separator glyph, not copy — it stays in the join, in every locale.
 */
export function occupancyText(
  occupancy: ShelterOccupancy,
  now: number = Date.now(),
  translate?: ShelterTranslate,
): string {
  const headKey =
    occupancy.reportCount >= 2
      ? OCCUPANCY_FIRM_KEY[occupancy.band]
      : OCCUPANCY_HEDGED_KEY[occupancy.band];
  return `${resolve(headKey, translate)} · ${recencyText(occupancy.lastReportedAt, now, translate)}`;
}

// ---------------------------------------------------------------------------
// Last-verified meta (last-verified-meta): the per-entry verification
// stamp + the report counts, single-sourced like the rest of the trust
// copy. The DATUM is server-derived (ShelterDto.lastVerifiedAt / reportCount);
// these helpers only format it through the shelter.* catalog keys.
// ---------------------------------------------------------------------------

/**
 * The reported badge with its count: "Reported (2)" — the count is the
 * `nonexistentReports` subset that drives the badge (not the total report
 * count). Rendered on the map row and the detail header wherever the
 * orange "Reported" badge appears.
 */
export function reportedBadgeText(
  nonexistentReports: number,
  translate?: ShelterTranslate,
): string {
  return resolve('shelter.reportedBadge', translate, { count: nonexistentReports });
}

/**
 * Relative text for a verification stamp: coarser than
 * {@link recencyText} — occupancy freshness lives in minutes/hours, but a
 * verification stamp can be days or weeks old (an import from last week).
 * Under 7 days it stays relative; older stamps fall back to a concrete
 * date (formatted by hand so the output is deterministic across Node ICU
 * versions and user time zones, UTC-based; `monthNames` is the locale's
 * short month set — MONTH_ABBREVS — filled into {month}). `now` is
 * injectable so specs are deterministic.
 */
export function verifiedAgoText(
  iso: string,
  now: number = Date.now(),
  translate?: ShelterTranslate,
  monthNames: readonly string[] = MONTH_ABBREVS.en,
): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (Number.isNaN(minutes) || minutes < 1) {
    return resolve('shelter.recency.justNow', translate);
  }
  if (minutes < 60) {
    return resolve('shelter.recency.minutes', translate, { minutes });
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return resolve('shelter.recency.hours', translate, { hours });
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return resolve('shelter.recency.days', translate, { days });
  }
  const d = new Date(iso);
  return resolve('shelter.recency.date', translate, {
    day: d.getUTCDate(),
    month: monthNames[d.getUTCMonth()],
    year: d.getUTCFullYear(),
  });
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
  translate?: ShelterTranslate,
  monthNames: readonly string[] = MONTH_ABBREVS.en,
): string {
  if (shelter.lastVerifiedAt === null) {
    if (shelter.reviewStatus === 'NEW') {
      return resolve('shelter.newlyAddedUnverified', translate, {
        ago: verifiedAgoText(shelter.createdAt, now, translate, monthNames),
      });
    }
    return resolve('shelter.noVerificationRecord', translate);
  }
  const ago = verifiedAgoText(shelter.lastVerifiedAt, now, translate, monthNames);
  return resolve(
    shelter.source === 'USER' ? 'shelter.lastVerified' : 'shelter.lastVerifiedRegistry',
    translate,
    { ago },
  );
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
export function communityReportsText(reportCount: number, translate?: ShelterTranslate): string {
  return resolve('shelter.communityReports', translate, { count: reportCount });
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
 * page's distance-from-you line (spliced into detail.distance.fromYou's
 * {distance} param) — so the shared copy module is its home; the
 * geolocation ERROR copy is keyed per feature (map.nearest.* — the detail
 * page reuses the same keys, the map's CTA vocabulary).
 */
export function straightLineText(km: number, translate?: ShelterTranslate): string {
  if (km < 1) {
    return resolve('shelter.distance.meters', translate, { distance: Math.round(km * 1000) });
  }
  return resolve('shelter.distance.kilometers', translate, { distance: km.toFixed(1) });
}
