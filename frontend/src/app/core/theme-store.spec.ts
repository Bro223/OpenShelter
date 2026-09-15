import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme-store';

/**
 * src/ — the test runner's cwd is the frontend project root
 * (`npx ng test` runs from frontend/), so resolve against it.
 */
const SRC_DIR = `${process.cwd()}/src`;

/** Strip the <html> data-theme attribute (each test starts light). */
function clearThemeAttribute(): void {
  document.documentElement.removeAttribute('data-theme');
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

  it('an unrecognised stored value is treated as light (only high-contrast is stored)', () => {
    localStorage.setItem('openshelter-theme', 'night');
    expect(reload().highContrast()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('adopts a stored high-contrast preference on boot and asserts the attribute', () => {
    localStorage.setItem('openshelter-theme', 'high-contrast');
    expect(reload().highContrast()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
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
});

describe('index.html pre-paint theme script (no flash, no FOUC)', () => {
  it('reads openshelter-theme and sets data-theme BEFORE the app bundle', () => {
    const indexHtml = readFileSync(`${SRC_DIR}/index.html`, 'utf8');
    // The script reads the persisted key…
    expect(indexHtml).toContain("localStorage.getItem('openshelter-theme')");
    // …and sets the attribute on <html> (the token-override seam).
    expect(indexHtml).toMatch(
      /document\.documentElement\.setAttribute\('data-theme',\s*'high-contrast'\)/,
    );
    // House pattern: the inline script sits in <head>, so it executes before
    // the app bundle (injected at the end of <body> by the build).
    const script = indexHtml.match(/<script>[\s\S]*?<\/script>/);
    expect(script, 'index.html must carry an inline pre-paint script').not.toBeNull();
    expect(indexHtml.indexOf('<script>')).toBeLessThan(indexHtml.indexOf('</head>'));
  });
});
