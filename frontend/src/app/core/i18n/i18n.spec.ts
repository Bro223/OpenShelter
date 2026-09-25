import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EN } from './en';
import { ET } from './et';
import { RU } from './ru';
import { I18nService, interpolate } from './i18n.service';
import type { Messages } from './messages';
import { TranslatePipe } from './translate-pipe';

/**
 * The locale service, the translation lookup and
 * the catalog-parity guard.
 *
 *  - Mechanism: default locale (no stored pref = en), stored preference,
 *    invalid-value fallback, setLocale persistence + <html lang>.
 *  - Seam: t() + {param} interpolation (the seam the domain copy runs on —
 *    no chrome key carries a placeholder yet, so the pure interpolate()
 *    helper is unit-tested directly).
 *  - Guard: en/et/ru catalogs stay key-complete and value-complete, so an
 *    untranslated string can never silently ship blank.
 */

describe('I18nService (i18n-et-en)', () => {
  beforeEach(() => {
    // Fresh service per test (TestBed auto-reset) reads localStorage in
    // its constructor — clear it BEFORE the first inject.
    localStorage.clear();
    document.documentElement.lang = '';
  });

  describe('locale resolution (default + stored preference)', () => {
    it('defaults to en with no stored preference and asserts <html lang>', () => {
      const i18n = TestBed.inject(I18nService);
      expect(i18n.locale()).toBe('en');
      expect(document.documentElement.lang).toBe('en');
    });

    it('honors a stored preference from the previous session', () => {
      localStorage.setItem('openshelter-locale', 'et');
      const i18n = TestBed.inject(I18nService);
      expect(i18n.locale()).toBe('et');
      expect(document.documentElement.lang).toBe('et');
    });

    it('falls back to en for an invalid stored value (never crashes first paint)', () => {
      localStorage.setItem('openshelter-locale', 'fr');
      const i18n = TestBed.inject(I18nService);
      expect(i18n.locale()).toBe('en');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('t()', () => {
    it('translates for the active locale and follows setLocale', async () => {
      const i18n = TestBed.inject(I18nService);
      expect(i18n.t('nav.map')).toBe('Shelter map');
      i18n.setLocale('et');
      await i18n.ensureCatalog('et'); // bundle-lazy-i18n: the et chunk is on demand
      expect(i18n.t('nav.map')).toBe('Varjupaikade kaart');
    });
  });

  describe('setLocale', () => {
    it('persists the choice, flips the signal and <html lang> (both directions)', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setLocale('et');
      expect(i18n.locale()).toBe('et');
      expect(document.documentElement.lang).toBe('et');
      expect(localStorage.getItem('openshelter-locale')).toBe('et');

      i18n.setLocale('en');
      expect(i18n.locale()).toBe('en');
      expect(document.documentElement.lang).toBe('en');
      expect(localStorage.getItem('openshelter-locale')).toBe('en');
    });
  });

  /* The admin content language: the locale the
     guidance admin's list/detail/save/reorder calls scope to. It is the
     SECOND, independent language — the UI language (locale/setLocale,
     the public switcher's path) drives the chrome; the content language
     drives which posts are listed and which translation an edit writes.
     Default on first entry: the UI locale. Then independent + persisted. */
  describe('contentLocale (admin-locale-split)', () => {
    it('defaults to the UI locale when no content locale is stored', () => {
      const i18n = TestBed.inject(I18nService);
      expect(i18n.contentLocale()).toBe('en'); // UI locale is en
    });

    it('defaults to the UI locale when the UI locale is stored', () => {
      localStorage.setItem('openshelter-locale', 'et');
      const i18n = TestBed.inject(I18nService);
      expect(i18n.locale()).toBe('et');
      expect(i18n.contentLocale()).toBe('et'); // the first-entry default
    });

    it("is independent of the UI locale: setLocale (the public switcher's path) does not move it", () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setContentLocale('ru');
      expect(i18n.contentLocale()).toBe('ru');

      // The header switcher (public site) flips the UI language…
      i18n.setLocale('et');
      expect(i18n.locale()).toBe('et');
      // …and the admin content locale stays where the admin left it.
      expect(i18n.contentLocale()).toBe('ru');
      expect(localStorage.getItem('openshelter-admin-content-locale')).toBe('ru');
    });

    it("persists under its own key (never the UI locale's key)", () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setContentLocale('ru');
      expect(localStorage.getItem('openshelter-admin-content-locale')).toBe('ru');
      expect(localStorage.getItem('openshelter-locale')).toBeNull(); // untouched

      i18n.setContentLocale('en');
      expect(localStorage.getItem('openshelter-admin-content-locale')).toBe('en');
    });

    it('survives a reload: a fresh service reads the stored content locale', () => {
      let i18n = TestBed.inject(I18nService);
      i18n.setContentLocale('ru');
      // The reload: a fresh service reads the stored pair.
      TestBed.resetTestingModule();
      i18n = TestBed.inject(I18nService);
      expect(i18n.locale()).toBe('en'); // UI locale unchanged by the admin
      expect(i18n.contentLocale()).toBe('ru');
    });

    it('an invalid stored content locale falls back to the UI locale (never crashes)', () => {
      localStorage.setItem('openshelter-locale', 'ru');
      localStorage.setItem('openshelter-admin-content-locale', 'fr');
      const i18n = TestBed.inject(I18nService);
      expect(i18n.contentLocale()).toBe('ru');
    });
  });

  /* The site-text overlay (site_texts): the admin override for the ACTIVE
     locale wins, the shipped catalog is the default, the catalog default
     is readable for ANY locale (the admin panel's placeholder), and the
     link URLs fall back to the shipped defaults. */
  describe('site-text overlay (site_texts)', () => {
    it('with no overrides, t() serves the shipped catalog (the default)', () => {
      const i18n = TestBed.inject(I18nService);
      expect(i18n.siteTexts()).toBeNull();
      expect(i18n.t('a11y.popup.title')).toBe('Accessibility');
    });

    it('an override for the active locale wins over the catalog', async () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setSiteTexts({
        en: { 'a11y.popup.title': { value: 'Contrast' } },
        et: {},
        ru: {},
      });
      expect(i18n.t('a11y.popup.title')).toBe('Contrast'); // en overridden
      i18n.setLocale('et');
      await i18n.ensureCatalog('et'); // bundle-lazy-i18n: the et chunk is on demand
      expect(i18n.t('a11y.popup.title')).toBe('Kättesaadavus'); // et not overridden → catalog
    });

    it('an override without the active-locale key falls back to the catalog default', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setSiteTexts({ en: {}, et: { 'nav.map': { value: 'Kaart' } }, ru: {} });
      i18n.setLocale('en');
      expect(i18n.t('nav.map')).toBe('Shelter map'); // no en override → default
      i18n.setLocale('et');
      expect(i18n.t('nav.map')).toBe('Kaart'); // the et override
    });

    it('a blank override is treated as absent (the catalog default wins)', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setSiteTexts({ en: { 'nav.map': { value: '   ' } }, et: {}, ru: {} });
      expect(i18n.t('nav.map')).toBe('Shelter map');
    });

    it('url() serves the link override, else the shipped default, else empty for non-link keys', () => {
      const i18n = TestBed.inject(I18nService);
      expect(i18n.url('footer.rescueBoard')).toBe('https://www.päästeamet.ee'); // shipped default
      expect(i18n.url('footer.ministry')).toBe('https://www.siseministeerium.ee');
      i18n.setSiteTexts({
        en: { 'footer.rescueBoard': { value: 'Rescue', url: 'https://www.paast.ee' } },
        et: {},
        ru: {},
      });
      expect(i18n.url('footer.rescueBoard')).toBe('https://www.paast.ee'); // the override
      expect(i18n.url('footer.ministry')).toBe('https://www.siseministeerium.ee'); // untouched
      expect(i18n.url('nav.map')).toBe(''); // non-link key
    });

    it('defaultText(key, locale) serves the shipped catalog for an explicit locale (override-independent)', async () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setSiteTexts({ en: { 'nav.map': { value: 'X' } }, et: {}, ru: {} });
      expect(i18n.defaultText('nav.map', 'en')).toBe('Shelter map'); // not the override
      // bundle-lazy-i18n: the non-default placeholders stand in the default
      // locale until their chunks land — the real values after the load.
      await Promise.all([i18n.ensureCatalog('et'), i18n.ensureCatalog('ru')]);
      expect(i18n.defaultText('nav.map', 'et')).toBe('Varjupaikade kaart');
      expect(i18n.defaultText('nav.map', 'ru')).toBe('Карта укрытий');
    });

    it('setSiteTexts(null) clears the overlay (a down API keeps the catalog)', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setSiteTexts({ en: { 'nav.map': { value: 'X' } }, et: {}, ru: {} });
      i18n.setSiteTexts(null);
      expect(i18n.t('nav.map')).toBe('Shelter map');
    });
  });
});

describe('interpolate() (the t(key, params) seam for slice 2+ domain copy)', () => {
  it('replaces {param} placeholders and stringifies numbers', () => {
    expect(interpolate('{n} min ago', { n: 12 })).toBe('12 min ago');
    expect(interpolate('{a} and {b}', { a: 'x', b: 'y' })).toBe('x and y');
  });

  it('unknown placeholders stay literal (a typo is visible, not dropped)', () => {
    expect(interpolate('{n} and {other}', { n: 3 })).toBe('3 and {other}');
    expect(interpolate('no placeholders', { n: 3 })).toBe('no placeholders');
  });
});

/** Test host: one chrome string through the t pipe (module-level so the
    lazy-loading describe below can reuse it for the first-paint spec). */
@Component({ template: "{{ 'nav.map' | t }}", imports: [TranslatePipe] })
class Host {}

describe('TranslatePipe (t)', () => {
  it('renders the active locale and re-renders on a locale switch', async () => {
    TestBed.configureTestingModule({ imports: [Host, TranslatePipe] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('Shelter map');

    TestBed.inject(I18nService).setLocale('et');
    await TestBed.inject(I18nService).ensureCatalog('et'); // bundle-lazy-i18n: the chunk is on demand
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('Varjupaikade kaart');
  });
});

describe('lazy catalog loading (bundle-lazy-i18n)', () => {
  beforeEach(() => {
    // Fresh service per test (TestBed auto-reset) reads localStorage in
    // its constructor — clear it BEFORE the first inject.
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('the default locale ships in the initial bundle: loaded synchronously, no load step', async () => {
    const i18n = TestBed.inject(I18nService);
    expect(i18n.isCatalogLoaded('en')).toBe(true);
    await expect(i18n.ensureCatalog('en')).resolves.toBe(EN); // never waits
    expect(i18n.t('nav.map')).toBe(EN['nav.map']);
    // …and a fresh service has NOT eagerly loaded the other catalogs:
    expect(i18n.isCatalogLoaded('et')).toBe(false);
    expect(i18n.isCatalogLoaded('ru')).toBe(false);
  });

  it.each([
    ['et', ET],
    ['ru', RU],
  ] as const)(
    '%s: loads on demand (not eagerly), loads the REAL module content, and caches',
    async (locale, catalog) => {
      const i18n = TestBed.inject(I18nService);
      // On demand: a fresh service has not loaded it…
      expect(i18n.isCatalogLoaded(locale)).toBe(false);
      // …so t() serves the DEFAULT locale's text — translated copy, never a raw key:
      expect(i18n.t('nav.map')).toBe(EN['nav.map']);
      // …and ensureCatalog loads it. The promise is cached (one load per
      // session) and resolves to the real module content, not a copy:
      const first = i18n.ensureCatalog(locale);
      expect(i18n.ensureCatalog(locale)).toBe(first); // cached — same promise
      const loaded = await first;
      expect(loaded).toBe(catalog); // the module's own export object
      expect(i18n.isCatalogLoaded(locale)).toBe(true);
      i18n.setLocale(locale); // the chrome follows the now-loaded catalog
      expect(i18n.t('nav.map')).toBe(catalog['nav.map']);
      expect(i18n.t('title.map')).toBe(catalog['title.map']);
      expect(i18n.defaultText('nav.map', locale)).toBe(catalog['nav.map']);
    },
  );

  it('a stored non-default locale starts its load at construction (the boot path), and t() serves the default locale until it lands', async () => {
    localStorage.setItem('openshelter-locale', 'ru');
    const i18n = TestBed.inject(I18nService);
    expect(i18n.locale()).toBe('ru');
    // Synchronously after construction the chunk is in flight — the
    // loading state renders the DEFAULT locale, never a raw key:
    expect(i18n.isCatalogLoaded('ru')).toBe(false);
    expect(i18n.t('nav.map')).toBe(EN['nav.map']);
    // …and the constructor-started load resolves to the real content:
    await i18n.ensureCatalog('ru'); // the SAME cached promise the constructor started
    expect(i18n.isCatalogLoaded('ru')).toBe(true);
    expect(i18n.t('nav.map')).toBe(RU['nav.map']);
  });

  it('onCatalogLoaded runs the callback exactly once, when a catalog lands (the title re-resolve seam)', async () => {
    localStorage.setItem('openshelter-locale', 'et');
    const i18n = TestBed.inject(I18nService); // the constructor starts the et load
    let runs = 0;
    i18n.onCatalogLoaded(() => runs++); // the active locale is still loading → deferred
    await i18n.ensureCatalog('et');
    expect(runs).toBe(1); // fired exactly once, on arrival
    i18n.onCatalogLoaded(() => runs++); // active locale loaded → immediate
    expect(runs).toBe(2);
  });

  it('first paint with a stored non-default locale never shows an untranslated key (the pipe seam)', async () => {
    localStorage.setItem('openshelter-locale', 'et');
    TestBed.configureTestingModule({ imports: [Host, TranslatePipe] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges(); // FIRST PAINT — the et chunk has not resolved yet
    const el = fixture.nativeElement as HTMLElement;
    // Translated copy (the default locale) — never the raw key, never blank:
    expect(el.textContent).toBe(EN['nav.map']);
    expect(el.textContent).not.toContain('nav.map');
    expect((el.textContent ?? '').trim()).not.toHaveLength(0);

    // The chunk lands (in the browser: the network fetch); the service's
    // own change-detection pass repaints — one more pass pins the seam:
    await TestBed.inject(I18nService).ensureCatalog('et');
    fixture.detectChanges();
    expect(el.textContent).toBe(ET['nav.map']);
  });
});

describe('catalog parity (en/et/ru lockstep)', () => {
  function keysOf(catalog: Messages): string[] {
    return Object.keys(catalog).sort();
  }

  it('en, et and ru carry exactly the same key set', () => {
    expect(keysOf(ET)).toEqual(keysOf(EN));
    expect(keysOf(RU)).toEqual(keysOf(EN));
  });

  it('no catalog value is empty (an untranslated string would render blank)', () => {
    for (const [key, value] of Object.entries(EN)) {
      expect(value.trim(), `en key "${key}" must not be empty`).not.toHaveLength(0);
    }
    for (const [key, value] of Object.entries(ET)) {
      expect(value.trim(), `et key "${key}" must not be empty`).not.toHaveLength(0);
    }
    for (const [key, value] of Object.entries(RU)) {
      expect(value.trim(), `ru key "${key}" must not be empty`).not.toHaveLength(0);
    }
  });
});
