import { computed, Injectable, signal } from '@angular/core';
import {
  applyBlackAndYellowTokens,
  BLACK_AND_YELLOW_THEME,
  clearBlackAndYellowTokens,
  HIGH_CONTRAST_THEME,
  type AppTheme,
} from './theme-tokens';

/** Where the UI theme preference lives in localStorage. Only the
 *  non-default values are ever stored — the default (light) theme is
 *  the ABSENCE of the key (mirrors the pre-paint script in index.html,
 *  which reads this same key before first paint). */
const THEME_KEY = 'openshelter-theme';

/**
 * The persisted UI theme: the three contrast options of the
 * accessibility dialog — the light default (absent key, no attribute),
 * high contrast and black-and-yellow.
 *
 * Signal-based, same persistence shape as TokenStore (key constant +
 * try/catch so private-mode storage degrades to a session-only
 * preference). The `data-theme` attribute on `<html>` is the CSS seam:
 * the [data-theme='high-contrast'] block in styles.scss overrides the
 * design tokens for that theme; the black-and-yellow theme applies its
 * verified token values as RUNTIME custom properties (theme-tokens.ts —
 * the design-tokens audit keeps hex literals in the styles.scss blocks,
 * so the third theme lives in TS). No component style knows the theme
 * exists either way.
 *
 * No init() lifecycle is needed: reading a synchronous localStorage key
 * has no async race, so the constructor reads the store once and
 * re-asserts the attribute + tokens. On a reload the inline index.html
 * script already applied both before first paint — this re-assertion is
 * an idempotent no-op that also covers the edge where that script was
 * skipped.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  /** The active theme: 'default' (light, no attribute), 'high-contrast'
      or 'black-and-yellow' (the attribute + the runtime tokens). */
  readonly theme = signal<AppTheme>(storedTheme());

  /** True while the high-contrast theme is active (kept for the
      existing consumers and specs). */
  readonly highContrast = computed(() => this.theme() === HIGH_CONTRAST_THEME);

  constructor() {
    applyTheme(this.theme());
  }

  /** Flip light ↔ high-contrast (the pre-dialog toggle). */
  toggle(): void {
    this.set(this.theme() === HIGH_CONTRAST_THEME ? 'default' : HIGH_CONTRAST_THEME);
  }

  /** Apply + persist a theme. Default removes the key (no stored
      pref) and the attribute + tokens; the other two store their value. */
  set(theme: AppTheme): void {
    this.theme.set(theme);
    applyTheme(theme);
    try {
      if (theme === 'default') {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, theme);
      }
    } catch {
      // Storage unavailable (private mode): the theme still applies for
      // this session, it just will not survive a reload.
    }
  }
}

/** The stored value when it is a known theme, else the default — an
    invalid/stale value falls back instead of crashing first paint. */
function storedTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === HIGH_CONTRAST_THEME || stored === BLACK_AND_YELLOW_THEME) {
      return stored;
    }
  } catch {
    /* storage unavailable (private mode) */
  }
  return 'default';
}

/**
 * The CSS seam: the attribute + the black-and-yellow runtime tokens.
 * High contrast is owned by the SCSS token block (the attribute alone);
 * the black-and-yellow values ride on inline custom properties, which
 * must be CLEARED when switching to either other theme (inline styles
 * would otherwise beat the SCSS block / :root defaults).
 */
function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  if (theme === 'default') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  if (theme === BLACK_AND_YELLOW_THEME) {
    applyBlackAndYellowTokens(root);
  } else {
    clearBlackAndYellowTokens(root);
  }
}
