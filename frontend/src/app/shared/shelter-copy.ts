import type {
  OccupancyBand,
  ShelterOccupancy,
  ShelterSource,
  ShelterStatusFlag,
} from '../core/models';

/**
 * The shared shelter copy (W24): source-badge labels + the rating-summary
 * phrasing, single-sourced for the three consumers that used to carry
 * divergent inline copies — the map sidebar, the shelter detail header, and
 * the contributions panel.
 */

/** "No ratings yet" — the null-average phrasing (never an invented zero). */
export const NO_RATINGS_YET = 'No ratings yet';

/**
 * The provenance label (accessibility-and-provenance D4): the source is
 * three-valued, not two, and a USER shelter is only "verified" when its
 * creator has a completed verification — read from the DTO field (backend
 * D3), never re-derived in the UI. Single-sourced: the map sidebar rows
 * and the detail-page header both call this, so the four pinned values
 * live in exactly one place. The legend/filter chip wording is a
 * different (untouched) copy — it lives inline in map-page.html.
 */
export function provenanceLabel(shelter: {
  source: ShelterSource;
  submitterVerified: boolean;
}): string {
  if (shelter.source === 'PAASETEAMET') {
    return 'Paasteamet registry';
  }
  if (shelter.source === 'MUNICIPALITY') {
    return 'Municipal registry';
  }
  return shelter.submitterVerified ? 'Verified user' : 'User-submitted';
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
