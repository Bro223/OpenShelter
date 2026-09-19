import { readFileSync } from 'node:fs';
import {
  applyPrePaint,
  applyStoredLocale,
  applyStoredTheme,
  BLACK_AND_YELLOW_VALUE,
  HIGH_CONTRAST_VALUE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  THEME_STORAGE_KEY,
  type PrePaintRoot,
  type SupportedLocale,
} from './prepaint';
import { BLACK_AND_YELLOW_TOKENS } from './theme-tokens';

/**
 * The pre-paint boot guarantees: two halves, one contract.
 *
 * 1. The exported typed functions (core/prepaint.ts) — table-driven over
 *    the stored-value vocabulary: present + valid, present + invalid,
 *    absent, and the private-mode (throwing storage) row.
 * 2. The ACTUAL inline <head> scripts of index.html — the code the page
 *    executes before first paint — extracted from the HTML and evaluated
 *    against the same guarantees (a spec that evaluates the script source
 *    directly — the only way to test what index.html really runs without a
 *    build-config change).
 *
 * The final describe runs BOTH halves over the same inputs and pins
 * identical outcomes, so the page and the module cannot drift apart
 * silently.
 *
 * The test runner's cwd is the frontend project root (`npx ng test` runs
 * from frontend/), so resolve against it (the design-tokens spec's pattern).
 */
const INDEX_HTML = readFileSync(`${process.cwd()}/src/index.html`, 'utf8');

/** A <html>-shaped fake (the scripts only touch `lang`, the data-theme
 *  attribute and the style object for the black-and-yellow tokens). */
function fakeRoot(initialLang: string = 'en'): PrePaintRoot & {
  attributes: Map<string, string>;
  styleValues: Map<string, string>;
} {
  const attributes = new Map<string, string>();
  const styleValues = new Map<string, string>();
  return {
    lang: initialLang,
    attributes,
    styleValues,
    setAttribute: (name, value) => void attributes.set(name, value),
    getAttribute: (name) => attributes.get(name) ?? null,
    style: {
      setProperty: (name, value) => void styleValues.set(name, value),
      removeProperty: (name) => void styleValues.delete(name),
    },
  };
}

/** The black-and-yellow token the pre-paint guarantee is pinned on
 *  (the full set is pinned in theme-store.spec.ts). */
const BLACK_AND_YELLOW_PIN = '--color-text';

/** An in-memory Storage (the test-setup.ts pattern). */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

/** A storage whose reads throw — private mode (the inline scripts' catch). */
function throwingStorage(): Storage {
  const storage = memoryStorage();
  storage.getItem = (): string | null => {
    throw new Error('storage disabled (private mode)');
  };
  return storage;
}

/** The inline <script> bodies of index.html, in document order. */
function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

const SCRIPTS = inlineScripts(INDEX_HTML);

/** Evaluate one inline script against a fake <document> + storage. */
function runInlineScript(source: string, root: PrePaintRoot, storage: Storage): void {
  const run = new Function('document', 'localStorage', source) as (
    document: { documentElement: PrePaintRoot },
    localStorage: Storage,
  ) => void;
  run({ documentElement: root }, storage);
}

/** The theme script (the one reading the theme key) and the locale script
 *  (the one reading the locale key). */
const THEME_SCRIPT = SCRIPTS.find((s) => s.includes(THEME_STORAGE_KEY));
const LOCALE_SCRIPT = SCRIPTS.find((s) => s.includes(LOCALE_STORAGE_KEY));

describe('pre-paint boot (index.html inline scripts + core/prepaint.ts)', () => {
  it('index.html carries exactly the two pre-paint inline scripts (theme, locale)', () => {
    expect(SCRIPTS).toHaveLength(2);
    expect(THEME_SCRIPT, 'the theme script must read the theme key').toBeDefined();
    expect(LOCALE_SCRIPT, 'the locale script must read the locale key').toBeDefined();
    // The scripts sit in <head> — they execute before the app bundle
    // (injected at the end of <body> by the build).
    expect(INDEX_HTML.indexOf('<script>')).toBeLessThan(INDEX_HTML.indexOf('</head>'));
  });

  describe('applyStoredTheme (the module half)', () => {
    const rows = [
      {
        stored: HIGH_CONTRAST_VALUE as string | null,
        note: 'the persisted high-contrast preference applies (the attribute alone)',
      },
      {
        stored: BLACK_AND_YELLOW_VALUE as string | null,
        note: 'the persisted black-and-yellow preference applies (attribute + runtime tokens)',
      },
      {
        stored: 'light',
        note: 'an unrecognised stored value keeps the light default (no attribute, no tokens)',
      },
      {
        stored: 'night',
        note: 'another unrecognised stored value keeps the light default (no attribute, no tokens)',
      },
      { stored: null, note: 'an absent key is the light default (no attribute, no tokens)' },
    ];

    it.each(rows)('$note', ({ stored }) => {
      const root = fakeRoot();
      const storage = memoryStorage(stored === null ? {} : { [THEME_STORAGE_KEY]: stored });
      applyStoredTheme(storage, root);
      expect(root.attributes.get('data-theme')).toBe(
        stored === HIGH_CONTRAST_VALUE || stored === BLACK_AND_YELLOW_VALUE ? stored : undefined,
      );
      expect(root.styleValues.get(BLACK_AND_YELLOW_PIN)).toBe(
        stored === BLACK_AND_YELLOW_VALUE ? BLACK_AND_YELLOW_TOKENS[BLACK_AND_YELLOW_PIN] : undefined,
      );
    });
  });

  describe('the index.html theme script (the page half)', () => {
    const rows = [
      {
        stored: HIGH_CONTRAST_VALUE as string | null,
        note: 'the persisted high-contrast preference applies (the attribute alone)',
      },
      {
        stored: BLACK_AND_YELLOW_VALUE as string | null,
        note: 'the persisted black-and-yellow preference applies (attribute + runtime tokens)',
      },
      {
        stored: 'light',
        note: 'an unrecognised stored value keeps the light default (no attribute, no tokens)',
      },
      {
        stored: 'night',
        note: 'another unrecognised stored value keeps the light default (no attribute, no tokens)',
      },
      { stored: null, note: 'an absent key is the light default (no attribute, no tokens)' },
    ];

    it.each(rows)('$note', ({ stored }) => {
      const root = fakeRoot();
      const storage = memoryStorage(stored === null ? {} : { [THEME_STORAGE_KEY]: stored });
      runInlineScript(THEME_SCRIPT!, root, storage);
      expect(root.attributes.get('data-theme')).toBe(
        stored === HIGH_CONTRAST_VALUE || stored === BLACK_AND_YELLOW_VALUE ? stored : undefined,
      );
      expect(root.styleValues.get(BLACK_AND_YELLOW_PIN)).toBe(
        stored === BLACK_AND_YELLOW_VALUE ? BLACK_AND_YELLOW_TOKENS[BLACK_AND_YELLOW_PIN] : undefined,
      );
    });
  });

  describe('applyStoredLocale (the module half)', () => {
    const rows = [
      { stored: 'en' as string | null, note: 'the persisted "en" preference applies' },
      { stored: 'et', note: 'the persisted "et" preference applies' },
      { stored: 'ru', note: 'the persisted "ru" preference applies' },
      { stored: 'et-EE', note: 'a locale the app never stores keeps the static lang="en" default' },
      { stored: 'fr', note: 'an invalid stored value keeps the static lang="en" default' },
      { stored: null, note: 'an absent key keeps the static lang="en" default' },
    ];

    it.each(rows)('$note', ({ stored }) => {
      const root = fakeRoot();
      const storage = memoryStorage(stored === null ? {} : { [LOCALE_STORAGE_KEY]: stored });
      applyStoredLocale(storage, root);
      expect(root.lang).toBe(SUPPORTED_LOCALES.includes(stored as SupportedLocale) ? stored : 'en');
    });
  });

  describe('the index.html locale script (the page half)', () => {
    const rows = [
      { stored: 'en' as string | null, note: 'the persisted "en" preference applies' },
      { stored: 'et', note: 'the persisted "et" preference applies' },
      { stored: 'ru', note: 'the persisted "ru" preference applies' },
      { stored: 'et-EE', note: 'a locale the app never stores keeps the static lang="en" default' },
      { stored: 'fr', note: 'an invalid stored value keeps the static lang="en" default' },
      { stored: null, note: 'an absent key keeps the static lang="en" default' },
    ];

    it.each(rows)('$note', ({ stored }) => {
      const root = fakeRoot();
      const storage = memoryStorage(stored === null ? {} : { [LOCALE_STORAGE_KEY]: stored });
      runInlineScript(LOCALE_SCRIPT!, root, storage);
      expect(root.lang).toBe(SUPPORTED_LOCALES.includes(stored as SupportedLocale) ? stored : 'en');
    });
  });

  it('private mode (a throwing storage): neither guarantee throws, both defaults hold', () => {
    const storage = throwingStorage();

    // The module half.
    const moduleRoot = fakeRoot();
    expect(() => applyPrePaint(storage, moduleRoot)).not.toThrow();
    expect(moduleRoot.attributes.get('data-theme')).toBeUndefined();
    expect(moduleRoot.styleValues.get(BLACK_AND_YELLOW_PIN)).toBeUndefined();
    expect(moduleRoot.lang).toBe('en');

    // The page half: evaluating the inline scripts must not throw either.
    const themeRoot = fakeRoot();
    const localeRoot = fakeRoot();
    expect(() => runInlineScript(THEME_SCRIPT!, themeRoot, storage)).not.toThrow();
    expect(() => runInlineScript(LOCALE_SCRIPT!, localeRoot, storage)).not.toThrow();
    expect(themeRoot.attributes.get('data-theme')).toBeUndefined();
    expect(themeRoot.styleValues.get(BLACK_AND_YELLOW_PIN)).toBeUndefined();
    expect(localeRoot.lang).toBe('en');
  });
});

/** Lockstep: for the same storage state, the page (the evaluated inline
 *  scripts) and the module (the exported functions) must land on the same
 *  <html> state — this is what keeps "index.html invokes the same logic"
 *  true without a build-config change. */
describe('pre-paint lockstep (page vs module)', () => {
  const states: { theme: string | null; locale: string | null }[] = [
    { theme: null, locale: null },
    { theme: HIGH_CONTRAST_VALUE, locale: null },
    { theme: BLACK_AND_YELLOW_VALUE, locale: null },
    { theme: null, locale: 'et' },
    { theme: HIGH_CONTRAST_VALUE, locale: 'et' },
    { theme: BLACK_AND_YELLOW_VALUE, locale: 'et' },
    { theme: null, locale: 'ru' },
    { theme: HIGH_CONTRAST_VALUE, locale: 'ru' },
    { theme: BLACK_AND_YELLOW_VALUE, locale: 'ru' },
    { theme: 'light', locale: 'fr' },
  ];

  it.each(states)('theme=$theme locale=$locale', ({ theme, locale }) => {
    const initial: Record<string, string> = {};
    if (theme !== null) {
      initial[THEME_STORAGE_KEY] = theme;
    }
    if (locale !== null) {
      initial[LOCALE_STORAGE_KEY] = locale;
    }
    const storage = memoryStorage(initial);

    const moduleRoot = fakeRoot();
    applyPrePaint(storage, moduleRoot);

    const pageRoot = fakeRoot();
    runInlineScript(THEME_SCRIPT!, pageRoot, storage);
    runInlineScript(LOCALE_SCRIPT!, pageRoot, storage);

    expect(pageRoot.attributes.get('data-theme')).toBe(moduleRoot.attributes.get('data-theme'));
    expect(pageRoot.lang).toBe(moduleRoot.lang);
    // The black-and-yellow token seam must agree too (a half-applied token
    // set would flash a broken palette before the app bundle paints).
    expect(pageRoot.styleValues.get(BLACK_AND_YELLOW_PIN)).toBe(
      moduleRoot.styleValues.get(BLACK_AND_YELLOW_PIN),
    );
  });
});
