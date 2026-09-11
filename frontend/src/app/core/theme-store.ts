import { Injectable, signal } from '@angular/core';

/**
 * Where the UI theme preference lives in localStorage (D2,
 * accessibility-and-provenance). Only the high-contrast value is stored —
 * the default light theme is the ABSENCE of the key (mirrors the pre-paint
 * script in index.html, which reads this same key before first paint).
 */
const THEME_KEY = 'openshelter-theme';
const HIGH_CONTRAST = 'high-contrast';

/**
 * The persisted UI theme (D2: toggle + persistence, no flash).
 *
 * Signal-based, same persistence shape as TokenStore (key constant +
 * try/catch so private-mode storage degrades to a session-only preference).
 * The `data-theme` attribute on `<html>` is the CSS seam: the [data-theme=
 * 'high-contrast'] block in styles.scss overrides the design tokens, so no
 * component style knows the theme exists.
 *
 * No init() lifecycle is needed (unlike AuthStore): reading a synchronous
 * localStorage key has no async race, so the constructor reads the store
 * once and re-asserts the attribute. On a reload the inline index.html
 * script already set the attribute before first paint — this re-assertion
 * is an idempotent no-op that also covers the edge where it was skipped
 * (e.g. a bundler that strips head scripts).
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  /** True while the high-contrast theme is active. */
  readonly highContrast = signal<boolean>(storedTheme() === HIGH_CONTRAST);

  constructor() {
    applyTheme(this.highContrast());
  }

  /** Flip the theme (the shell header toggle). */
  toggle(): void {
    this.set(!this.highContrast());
  }

  /** Apply + persist the theme. Light removes the key (no stored pref). */
  set(highContrast: boolean): void {
    this.highContrast.set(highContrast);
    applyTheme(highContrast);
    try {
      if (highContrast) {
        localStorage.setItem(THEME_KEY, HIGH_CONTRAST);
      } else {
        localStorage.removeItem(THEME_KEY);
      }
    } catch {
      // Storage unavailable (private mode): the theme still applies for
      // this session, it just will not survive a reload.
    }
  }
}

/** The stored value, or null when storage is absent/unreadable. */
function storedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

/** The CSS seam: high-contrast sets the attribute, light removes it. */
function applyTheme(highContrast: boolean): void {
  if (highContrast) {
    document.documentElement.setAttribute('data-theme', HIGH_CONTRAST);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
