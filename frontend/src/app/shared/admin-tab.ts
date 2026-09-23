/**
 * The admin page's active-tab URL vocabulary (admin-tab-persist).
 *
 * The /admin tabs share ONE route; the active tab is a query param
 * (`tab`) like every other list view state on the page — a reload, a
 * bookmark and a shared link open the same tab. Its value is a member
 * of the AdminTab union (admin-page.ts), which the architecture guard
 * parses: the two spellings must move TOGETHER — a new tab lands in the
 * union AND in this array (the admin spec pins set equality between
 * them, so a half-done addition fails the build).
 *
 * URL contract (the page's omit-defaults + clamp discipline):
 *  - ABSENT            -> the default tab ({@link ADMIN_TAB_DEFAULT});
 *  - the default value -> normalized to absence (replaceUrl);
 *  - outside the vocabulary -> dropped (replaceUrl) and the page reads
 *    the default — the fallback is a tab, never a blank page;
 *  - a legal non-default value -> the tab's URL form.
 */

/** The legal tab values — the AdminTab union (admin-page.ts) spelled
 *  as data, in the template's button order (the review queue first, the
 *  audit trail last). */
export const ADMIN_TABS = [
  'unconfirmed',
  'shelters',
  'reports',
  'alerts',
  'users',
  'guidance',
  'media',
  'settings',
  'audit',
] as const;

/** The legal tab values (the union's member type). */
export type AdminTabValue = (typeof ADMIN_TABS)[number];

/** The default tab — the FIRST tab (the review queue): the param's
 *  absence is its URL form (omit-defaults). */
export const ADMIN_TAB_DEFAULT: AdminTabValue = ADMIN_TABS[0];

/**
 * The URL's `tab` into a legal tab value: null = absent or outside the
 * vocabulary (a repeated param — `?tab=a&tab=b` — arrives as an array
 * at runtime and answers the same way). The caller reads the default;
 * the page's normalizer drops a null-answering value from the URL in
 * its single replaceUrl pass.
 */
export function parseAdminTab(raw: string | null): AdminTabValue | null {
  if (typeof raw !== 'string') {
    return null;
  }
  return (ADMIN_TABS as readonly string[]).includes(raw) ? (raw as AdminTabValue) : null;
}
