import type { Locale } from './locale';
import type { MessageKey } from './messages';

/**
 * The admin-editable site texts (site_texts): the DECLARED KEY ALLOWLIST.
 *
 * The admin edits VALUES, never invents keys: both the backend
 * (`SiteTextKeys`, the server-side twin of this list) and this frontend
 * list are closed sets of catalog keys. A value is stored per (key,
 * locale) in the `site_texts` table and the shipped i18n catalog is the
 * DEFAULT when no override row exists — `I18nService` applies the overlay
 * in one place, so the same mechanism covers the accessibility popup,
 * the header and the footer.
 *
 * Plain text only: the override values are auto-escaped (Angular text
 * interpolation, never innerHTML). The two official-source links are
 * LABEL + https-VALIDATED URL pairs: only the link keys below carry a
 * URL, and the URL must start with `https://` (checked server-side).
 *
 * Keep in lockstep with `ee.sheltermap.sitetexts.SiteTextKeys` on the
 * backend (a unit test pins that set).
 */

/** One stored override: the text value; link keys carry the https URL. */
export interface SiteTextOverride {
  value: string;
  /** Present for link keys (label + https-validated URL pair). */
  url?: string;
}

/** The full public payload: every locale the site serves, each a
 *  key → override map (absent key = the shipped catalog default). */
export type SiteTextsByLocale = Record<Locale, Record<string, SiteTextOverride>>;

/** A key an admin may edit — a catalog key, so a typo'd entry is a
 *  compile error here and a 400 on the server. */
export type SiteTextKey = MessageKey;

/** The Popup block — the accessibility dialog's header (title), body,
 *  the three option labels + descriptions and the footer (note + close). */
export const SITE_TEXT_POPUP_KEYS: readonly SiteTextKey[] = [
  'a11y.popup.title',
  'a11y.popup.body',
  'a11y.option.default',
  'a11y.option.default.desc',
  'a11y.option.highContrast',
  'a11y.option.highContrast.desc',
  'a11y.option.blackYellow',
  'a11y.option.blackYellow.desc',
  'a11y.popup.footer',
  'a11y.popup.close',
] as const;

/** The Header block — the app header's own texts: the accessibility
 *  trigger, the nav labels and the session controls. */
export const SITE_TEXT_HEADER_KEYS: readonly SiteTextKey[] = [
  'a11y.button',
  'nav.map',
  'nav.guidance',
  'nav.account',
  'nav.admin',
  'lang.label',
  'auth.login',
  'auth.logout',
  'auth.register',
] as const;

/** The Footer block — the app-wide safety notice + legal/data rows.
 *  `footer.rescueBoard` and `footer.ministry` are the link keys (their
 *  labels AND their https URLs are editable; every other key is
 *  plain text — the internal privacy/terms routes are not). */
export const SITE_TEXT_FOOTER_KEYS: readonly SiteTextKey[] = [
  'footer.notice1',
  'footer.notice2',
  'footer.notice3',
  'footer.rescueBoard',
  'footer.and',
  'footer.ministry',
  'footer.privacy',
  'footer.terms',
  'footer.dataSource',
  'footer.lastImport',
  'footer.officialOpenData',
  'footer.dataSourceTransformed',
] as const;

/** The allowlist — the union the backend mirrors. The admin UI renders
 *  from the block order below; the server checks membership here. */
export const SITE_TEXT_KEYS: readonly SiteTextKey[] = [
  ...SITE_TEXT_POPUP_KEYS,
  ...SITE_TEXT_HEADER_KEYS,
  ...SITE_TEXT_FOOTER_KEYS,
];

/** The link keys: LABEL + https-validated URL pairs (the URL is stored
 *  per row like the label; the admin UI offers one URL per link key that
 *  is written to all three locales). */
export const SITE_TEXT_LINK_KEYS: readonly SiteTextKey[] = [
  'footer.rescueBoard',
  'footer.ministry',
] as const;

/** The shipped default URLs the overlay falls back to (page-shell.html
 *  used to hardcode them in the template). */
export const DEFAULT_SITE_TEXT_URLS: Readonly<Record<string, string>> = {
  'footer.rescueBoard': 'https://www.päästeamet.ee',
  'footer.ministry': 'https://www.siseministeerium.ee',
};

/** True when the key carries a URL (label + https URL pair). */
export function isSiteTextLink(key: string): boolean {
  return SITE_TEXT_LINK_KEYS.some((k) => k === key);
}

/** The admin UI's block order: Popup → Header → Footer. */
export interface SiteTextBlock {
  /** Stable id for the DOM/ARIA; the heading is a catalog key rendered
   *  by the panel (the block titles are NOT themselves editable — they
   *  are admin UI, not site copy). */
  id: 'popup' | 'header' | 'footer';
  headingKey: MessageKey;
  keys: readonly SiteTextKey[];
}

export const SITE_TEXT_BLOCKS: readonly SiteTextBlock[] = [
  { id: 'popup', headingKey: 'a11y.popup.title', keys: SITE_TEXT_POPUP_KEYS },
  { id: 'header', headingKey: 'a11y.button', keys: SITE_TEXT_HEADER_KEYS },
  { id: 'footer', headingKey: 'footer.notice2', keys: SITE_TEXT_FOOTER_KEYS },
];
