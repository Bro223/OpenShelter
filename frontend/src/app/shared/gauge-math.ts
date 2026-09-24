/**
 * The report-gauge angle math (report aggregation UI): the
 * semicircular gauge's needle sweeps 0° (pointing at the LEFT end, the
 * "closed" / "empty" side) through 90° (straight up — an exact equal
 * split) to 180° (pointing at the RIGHT end, the "open" / "full" side).
 *
 * The share itself is SERVER-derived (trust-weighted — the same
 * derivation the auto-hide tally uses), so this module never re-derives
 * anything from counts: it only maps the share to a needle angle.
 */

/**
 * The needle angle in degrees for a weighted share toward the right end.
 *
 * Boundary cases (unit-tested): an equal split (0.5) answers 90° —
 * straight up; all-one-way answers the extremes (0 → 0° pointing left,
 * 1 → 180° pointing right); zero data (null / NaN) answers null — the
 * empty state, never a misleading neutral arrow.
 *
 * Out-of-range server values are clamped to [0, 1] (defence in depth —
 * the server answers in-range, a rounding drift must not produce a
 * needle outside the semicircle).
 */
export function gaugeAngle(share: number | null): number | null {
  if (share === null || Number.isNaN(share)) {
    return null;
  }
  const clamped = Math.min(1, Math.max(0, share));
  return clamped * 180;
}
