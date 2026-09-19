import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme-store';
import {
  BLACK_AND_YELLOW_TOKENS,
  clearBlackAndYellowTokens,
} from './theme-tokens';

/**
 * src/ — the test runner's cwd is the frontend project root
 * (`npx ng test` runs from frontend/), so resolve against it.
 */
const SRC_DIR = `${process.cwd()}/src`;

/** Strip the <html> data-theme attribute + the runtime theme tokens
 *  (each test starts light). */
function clearThemeAttribute(): void {
  document.documentElement.removeAttribute('data-theme');
  clearBlackAndYellowTokens(document.documentElement);
}

/** True when the black-and-yellow token set is applied to <html>. */
function blackYellowApplied(): boolean {
  return (
    document.documentElement.style.getPropertyValue('--color-text') ===
      BLACK_AND_YELLOW_TOKENS['--color-text'] &&
    document.documentElement.style.getPropertyValue('--color-bg') ===
      BLACK_AND_YELLOW_TOKENS['--color-bg']
  );
}

describe('ThemeStore (D2: toggle + persistence, no flash)', () => {
  let store: ThemeStore;

  beforeEach(() => {
    localStorage.clear();
    clearThemeAttribute();
    TestBed.configureTestingModule({});
    store = TestBed.inject(ThemeStore);
  });

  afterEach(() => {
    clearThemeAttribute();
  });

  /** A reload = fresh injector (fresh service instance) over the same storage. */
  function reload(): ThemeStore {
    clearThemeAttribute();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeStore);
  }

  it('defaults to light: no stored preference -> no attribute, signal false', () => {
    expect(store.highContrast()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('openshelter-theme')).toBeNull();
  });

  it('an unrecognised stored value is treated as light (only the non-default themes are stored)', () => {
    localStorage.setItem('openshelter-theme', 'night');
    expect(reload().highContrast()).toBe(false);
    expect(reload().theme()).toBe('default');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('adopts a stored high-contrast preference on boot and asserts the attribute', () => {
    localStorage.setItem('openshelter-theme', 'high-contrast');
    expect(reload().highContrast()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(blackYellowApplied()).toBe(false);
  });

  it('adopts a stored black-and-yellow preference on boot: attribute AND runtime tokens', () => {
    localStorage.setItem('openshelter-theme', 'black-and-yellow');
    const reloaded = reload();
    expect(reloaded.theme()).toBe('black-and-yellow');
    expect(reloaded.highContrast()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('black-and-yellow');
    expect(blackYellowApplied()).toBe(true);
  });

  it('toggle() enables high contrast: sets the attribute AND persists the key', () => {
    store.toggle();
    expect(store.highContrast()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(localStorage.getItem('openshelter-theme')).toBe('high-contrast');
  });

  it('toggle() back to light: removes the attribute AND removes the key (no stored pref)', () => {
    store.toggle();
    store.toggle();
    expect(store.highContrast()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('openshelter-theme')).toBeNull();
  });

  it('survives a reload: a fresh store instance reads the persisted preference', () => {
    store.toggle();
    expect(reload().highContrast()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
  });

  /* --- the three-option accessibility dialog (accessibility-dialog) --- */

  it('set(\'black-and-yellow\') sets the attribute, applies the tokens AND persists the key', () => {
    store.set('black-and-yellow');
    expect(store.theme()).toBe('black-and-yellow');
    expect(store.highContrast()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('black-and-yellow');
    expect(blackYellowApplied()).toBe(true);
    expect(localStorage.getItem('openshelter-theme')).toBe('black-and-yellow');
  });

  it('set(\'default\') removes the attribute, the key AND the black-and-yellow tokens', () => {
    store.set('black-and-yellow');
    store.set('default');
    expect(store.theme()).toBe('default');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(blackYellowApplied()).toBe(false);
    expect(localStorage.getItem('openshelter-theme')).toBeNull();
  });

  it('switching black-and-yellow → high-contrast clears the runtime tokens (inline styles would beat the SCSS block)', () => {
    store.set('black-and-yellow');
    expect(blackYellowApplied()).toBe(true);
    store.set('high-contrast');
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(blackYellowApplied()).toBe(false);
    expect(localStorage.getItem('openshelter-theme')).toBe('high-contrast');
  });

  it('the black-and-yellow choice survives a reload (attribute + tokens re-applied)', () => {
    store.set('black-and-yellow');
    const reloaded = reload();
    expect(reloaded.theme()).toBe('black-and-yellow');
    expect(document.documentElement.getAttribute('data-theme')).toBe('black-and-yellow');
    expect(blackYellowApplied()).toBe(true);
  });

  it('the black-and-yellow token set carries the owner-verified palette', () => {
    // The verified tokens the design is built on (the rest of the set
    // follows the documented derivation in theme-tokens.ts).
    expect(BLACK_AND_YELLOW_TOKENS['--color-text']).toBe('#ffd400');
    expect(BLACK_AND_YELLOW_TOKENS['--color-muted']).toBe('#d4b53a');
    expect(BLACK_AND_YELLOW_TOKENS['--color-link']).toBe('#ffe066');
    expect(BLACK_AND_YELLOW_TOKENS['--color-cta']).toBe('#ff9f1c');
    expect(BLACK_AND_YELLOW_TOKENS['--color-reported']).toBe('#ff6b4d');
    expect(BLACK_AND_YELLOW_TOKENS['--color-border']).toBe('#8a7400');
    expect(BLACK_AND_YELLOW_TOKENS['--color-bg']).toBe('#000000');
    // Cards are border-distinguished, never a dark tint (#111 on black = 1.11:1).
    expect(BLACK_AND_YELLOW_TOKENS['--color-bg-surface']).toBe('#000000');
  });

  /* The chrome band (header + footer + the <900 menu panel) follows the
     selected mode: page-shell.scss styles the band exclusively through
     the --color-chrome-* tokens (page-shell.spec.ts pins the token
     references, including the panel's), so driving the tokens on <html>
     drives the whole band — no SCSS change, no reload. */
  describe('the mode drives the chrome band tokens (no navy leak)', () => {
    const CHROME = [
      '--color-chrome-bg',
      '--color-chrome-text',
      '--color-chrome-muted',
      '--color-chrome-focus',
      '--color-chrome-active',
      '--color-chrome-border',
    ] as const;

    it('black-and-yellow puts the band\'s black + yellow values on <html>', () => {
      store.set('black-and-yellow');
      for (const token of CHROME) {
        expect(
          document.documentElement.style.getPropertyValue(token),
          `${token} must carry the black-and-yellow runtime value`,
        ).toBe(BLACK_AND_YELLOW_TOKENS[token]);
      }
      // The owner\'s words: black background, yellow text.
      expect(BLACK_AND_YELLOW_TOKENS['--color-chrome-bg']).toBe('#000000');
      expect(BLACK_AND_YELLOW_TOKENS['--color-chrome-text']).toBe('#ffd400');
    });

    it('switching modes updates the band without a reload (the tokens are re-applied/cleared on <html>)', () => {
      store.set('black-and-yellow');
      expect(document.documentElement.style.getPropertyValue('--color-chrome-bg')).toBe(
        BLACK_AND_YELLOW_TOKENS['--color-chrome-bg'],
      );

      // high-contrast: the attribute seam only — the inline B&Y values are
      // cleared so the [data-theme='high-contrast'] SCSS block\'s own band
      // tokens rule (navy, spec-verified there).
      store.set('high-contrast');
      expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
      for (const token of CHROME) {
        expect(document.documentElement.style.getPropertyValue(token), token).toBe('');
      }

      // back to black-and-yellow: the values re-apply on the live document.
      store.set('black-and-yellow');
      for (const token of CHROME) {
        expect(document.documentElement.style.getPropertyValue(token), token).toBe(
          BLACK_AND_YELLOW_TOKENS[token],
        );
      }

      // default: cleared again — the :root (navy) values rule.
      store.set('default');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      for (const token of CHROME) {
        expect(document.documentElement.style.getPropertyValue(token), token).toBe('');
      }
    });

    it('booting with the stored black-and-yellow preference re-applies the band values (pre-paint twin)', () => {
      localStorage.setItem('openshelter-theme', 'black-and-yellow');
      const reloaded = reload();
      expect(reloaded.theme()).toBe('black-and-yellow');
      for (const token of CHROME) {
        expect(document.documentElement.style.getPropertyValue(token), token).toBe(
          BLACK_AND_YELLOW_TOKENS[token],
        );
      }
    });
  });
});

describe('index.html pre-paint theme script (no flash, no FOUC)', () => {
  it('reads openshelter-theme and sets data-theme BEFORE the app bundle', () => {
    const indexHtml = readFileSync(`${SRC_DIR}/index.html`, 'utf8');
    // The script reads the persisted key…
    expect(indexHtml).toContain("localStorage.getItem('openshelter-theme')");
    // …and sets the attribute on <html> for BOTH non-default themes
    // (the high-contrast SCSS seam; black-and-yellow adds runtime tokens).
    expect(indexHtml).toContain("'high-contrast'");
    expect(indexHtml).toContain("'black-and-yellow'");
    expect(indexHtml).toMatch(/document\.documentElement\.setAttribute\('data-theme'/);
    // The black-and-yellow tokens must be applied pre-paint too (no flash
    // of the light palette) — the typed twin lives in theme-tokens.ts.
    expect(indexHtml).toContain(BLACK_AND_YELLOW_TOKENS['--color-text']);
    expect(indexHtml).toContain('setProperty');
    // House pattern: the inline script sits in <head>, so it executes before
    // the app bundle (injected at the end of <body> by the build).
    const script = indexHtml.match(/<script>[\s\S]*?<\/script>/);
    expect(script, 'index.html must carry an inline pre-paint script').not.toBeNull();
    expect(indexHtml.indexOf('<script>')).toBeLessThan(indexHtml.indexOf('</head>'));
  });
});
