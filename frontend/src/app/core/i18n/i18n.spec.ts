import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EN } from './en';
import { ET } from './et';
import { RU } from './ru';
import { I18nService, interpolate } from './i18n.service';
import type { Messages } from './messages';
import { TranslatePipe } from './translate-pipe';

/**
 * i18n-et-en: the locale service, the translation lookup and
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

describe('I18nService (i18n-et-en M14)', () => {
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
    it('translates for the active locale and follows setLocale', () => {
      const i18n = TestBed.inject(I18nService);
      expect(i18n.t('nav.map')).toBe('Shelter map');
      i18n.setLocale('et');
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

describe('TranslatePipe (t)', () => {
  @Component({ template: "{{ 'nav.map' | t }}", imports: [TranslatePipe] })
  class Host {}

  it('renders the active locale and re-renders on a locale switch', () => {
    TestBed.configureTestingModule({ imports: [Host, TranslatePipe] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('Shelter map');

    TestBed.inject(I18nService).setLocale('et');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('Varjupaikade kaart');
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
