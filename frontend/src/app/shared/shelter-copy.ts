import type { ShelterSource } from '../core/models';

/**
 * The shared shelter copy (W24): source-badge labels + the rating-summary
 * phrasing, single-sourced for the three consumers that used to carry
 * divergent inline copies — the map sidebar, the shelter detail header, and
 * the contributions panel.
 */

/** "No ratings yet" — the null-average phrasing (never an invented zero). */
export const NO_RATINGS_YET = 'No ratings yet';

/** Source badge label: a USER-submitted row vs a registry row (the map
 *  legend uses the same wording). */
// The map filter chip "User" is the short form of "User-submitted" (deliberate — chip space).
export function sourceLabel(source: ShelterSource): string {
  return source === 'USER' ? 'User-submitted' : 'Registry';
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
