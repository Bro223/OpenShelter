/**
 * The paging policy, in one place (list-page-paging, admin-page-size).
 *
 * The owner's paging contract: sizes 10..100 in steps of 10, default 20,
 * 1-based pages, and the server does the slicing (limit/offset) — the page
 * never fetches-and-slices client-side. The un-paged total arrives as the
 * X-Total-Count header (the endpoint's contract), which is what makes an
 * out-of-range page distinguishable from a truly empty scope.
 *
 * <p>Every paged surface — the public /blog index and the admin's paged
 * lists — parses the URL through {@link parsePage}/{@link parseSize},
 * derives its page count through {@link lastPage}, and clamps a
 * size-flip through {@link clampPage}, so the policy cannot drift between
 * surfaces. The Pagination control's default size list is this same
 * {@link PAGE_SIZES} constant.
 */

/** The smallest page size the selector offers (the endpoint's floor). */
export const PAGE_SIZE_MIN = 10;

/** The largest page size the selector offers (the endpoint bounds 1..200,
 *  so the control never offers a size the backend would refuse). */
export const PAGE_SIZE_MAX = 100;

/** The selector's step: 10, 20, … 100 (the owner's paging contract). */
export const PAGE_SIZE_STEP = 10;

/** The default size: the only value the frontend sends when the URL
 *  carries no size. */
export const PAGE_SIZE_DEFAULT = 20;

/** The one size-step list the selector offers, DERIVED from the bounds
 *  above (it cannot drift from them). */
export const PAGE_SIZES: number[] = Array.from(
  { length: (PAGE_SIZE_MAX - PAGE_SIZE_MIN) / PAGE_SIZE_STEP + 1 },
  (_, i) => PAGE_SIZE_MIN + i * PAGE_SIZE_STEP,
);

/** page: 1-based integer; missing / non-numeric / below 1 -> 1 (hand-typed
 *  URLs only — the control can only offer legal values). */
export function parsePage(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** size: clamp to the nearest member of 10..100 step 10; missing /
 *  non-numeric -> the default. The selector can only offer legal values,
 *  so this only matters for hand-typed URLs. */
export function parseSize(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) {
    return PAGE_SIZE_DEFAULT;
  }
  const stepped = Math.round(n / PAGE_SIZE_STEP) * PAGE_SIZE_STEP;
  return Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, stepped));
}

/** The page count at a total and a size — 1 even for an empty scope, so
 *  "Page 1 of 1" can never say "of 0". */
export function lastPage(total: number, size: number): number {
  return total > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
}

/** A requested page clamped to [1, lastPage(total, size)]: the rule a
 *  SIZE change must apply so it never strands the view on a dead page
 *  (the total is known whenever the pagination control is visible). */
export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, page), lastPage(total, size));
}

/** The X-Total-Count header -> the un-paged total. A missing / blank /
 *  non-integer / negative header degrades to `fallback` (the fetched
 *  page's own length) — out-of-range detection stays honest (such a page
 *  IS empty) rather than pretending a scope the header did not report. */
export function parseTotal(raw: string | null, fallback: number): number {
  const parsed = raw === null || raw.trim() === '' ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
