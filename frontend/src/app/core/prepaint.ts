/**
 * Pre-paint boot logic: the two inline <head> scripts in index.html
 * apply the persisted theme and UI language BEFORE the app bundle paints —
 * no theme flash/FOUC, and <html lang> is correct for screen readers /
 * spellcheck from first paint. The inline scripts stay the page's entry
 * point: a pre-paint script must run synchronously during parse, and the
 * build only injects BUNDLED scripts as deferred <script> tags (angular.json
 * "scripts" would run too late for the no-flash guarantee). This module is
 * the exported, typed form of that same logic — prepaint.spec.ts exercises
 * these functions AND evaluates the index.html script source against the
 * same guarantees, so the page and the module cannot drift apart silently.
 */

import {
  applyBlackAndYellowTokens,
  BLACK_AND_YELLOW_THEME,
  HIGH_CONTRAST_THEME,
} from './theme-tokens';

/** The persisted theme key (ThemeStore owns the same key post-paint). */
export const THEME_STORAGE_KEY = 'openshelter-theme';
/** The high-contrast stored value (the SCSS token-override seam). */
export const HIGH_CONTRAST_VALUE = HIGH_CONTRAST_THEME;
/** The black-and-yellow stored value (the runtime-token theme). */
export const BLACK_AND_YELLOW_VALUE = BLACK_AND_YELLOW_THEME;

/** The persisted UI language key (I18nService owns the same key post-paint). */
export const LOCALE_STORAGE_KEY = 'openshelter-locale';
/** The only locales ever stored; absent or invalid key = the static
 *  lang="en" default. */
export const SUPPORTED_LOCALES = ['en', 'et', 'ru'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** The <html> surface the scripts write to (document.documentElement):
 *  the `lang` property, the data-theme attribute and the style object
 *  (the black-and-yellow runtime tokens). */
export type PrePaintRoot = Pick<HTMLElement, 'lang' | 'setAttribute' | 'getAttribute'> & {
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void };
};

/**
 * Apply the persisted theme to <html data-theme>: the stored
 * 'high-contrast' value applies the SCSS token block (the attribute
 * alone); 'black-and-yellow' applies the attribute AND the verified
 * runtime token set (the values live in theme-tokens.ts — the
 * design-tokens audit keeps hex literals out of component stylesheets).
 * An absent key or any other value leaves the light default (no
 * attribute). A storage read that throws (private mode) is a no-op, same
 * as the inline script's catch.
 */
export function applyStoredTheme(storage: Storage, root: PrePaintRoot): void {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    if (stored === HIGH_CONTRAST_THEME || stored === BLACK_AND_YELLOW_THEME) {
      root.setAttribute('data-theme', stored);
    }
    if (stored === BLACK_AND_YELLOW_THEME) {
      applyBlackAndYellowTokens(root);
    }
  } catch {
    /* storage unavailable (private mode) — default to light */
  }
}

/**
 * Apply the persisted UI language to <html lang>: only 'en'/'et'/'ru'
 * apply — an absent or invalid value keeps the static lang="en" default.
 * A storage read that throws (private mode) is a no-op, same as the inline
 * script's catch.
 */
export function applyStoredLocale(storage: Storage, root: PrePaintRoot): void {
  try {
    const locale = storage.getItem(LOCALE_STORAGE_KEY);
    if (locale === 'en' || locale === 'et' || locale === 'ru') {
      root.lang = locale;
    }
  } catch {
    /* storage unavailable (private mode) — default to the static lang */
  }
}

/** Both guarantees in the pre-paint order (theme, then locale). */
export function applyPrePaint(storage: Storage, root: PrePaintRoot): void {
  applyStoredTheme(storage, root);
  applyStoredLocale(storage, root);
}
