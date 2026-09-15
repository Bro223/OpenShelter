import { Injectable, signal } from '@angular/core';
import type { Locale } from './locale';
import { LOCALES } from './locale';
import type { Messages, MessageKey } from './messages';
import { EN } from './en';
import { ET } from './et';

/**
 * Where the UI language preference lives in localStorage (i18n-et-en).
 * Only `en`/`et` are ever stored — the default is the ABSENCE of the key
 * (mirrors the pre-paint script in index.html, which reads this same key
 * before first paint, and the ThemeStore persistence shape).
 */
const LOCALE_KEY = 'openshelter-locale';

/**
 * The default locale: `en`, the app's original copy language — a fresh
 * visitor sees the UI exactly as authored (zero first-load behavior
 * change). Flipping the default to `et` (whitepaper: "Estonian first") is
 * an owner decision for after the whole UI is translated: one line here +
 * the spec, no other change.
 */
const DEFAULT_LOCALE: Locale = 'en';

/** The message catalogs, keyed by locale — the typed `Messages` interface
    is the compile-time parity guard, i18n.spec.ts the runtime one. */
const CATALOGS: Record<Locale, Messages> = { en: EN, et: ET };

/**
 * The UI language (i18n-et-en: app chrome + route titles).
 *
 * Signal-based, the same persistence shape as ThemeStore: a key constant +
 * try/catch so private-mode storage degrades to a session-only preference.
 * The `lang` attribute on `<html>` is the seam: screen readers and
 * spellcheck read it, and it is set BEFORE first paint by the inline
 * index.html script — the constructor re-assertion is an idempotent no-op
 * that covers the edge where that script was skipped.
 *
 * `t()` is the single lookup seam: templates use the `t` pipe
 * (`{{ 'nav.map' | t }}`), non-template code (titleGuard, the
 * shelter-copy/error-copy helpers) calls it directly with an optional
 * `{param}` interpolation map.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  /** The active locale. */
  readonly locale = signal<Locale>(storedLocale());

  constructor() {
    document.documentElement.lang = this.locale();
  }

  /** Translate a key for the active locale, interpolating `{param}`
      placeholders when `params` is given (unknown placeholders stay
      literal — a typo'd placeholder is visible, not silently dropped). */
  t(key: MessageKey, params?: Record<string, string | number>): string {
    const template = CATALOGS[this.locale()][key] ?? CATALOGS[DEFAULT_LOCALE][key];
    return params ? interpolate(template, params) : template;
  }

  /** Switch + persist the locale (the header language switcher). */
  setLocale(locale: Locale): void {
    this.locale.set(locale);
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Storage unavailable (private mode): the locale still applies for
      // this session, it just will not survive a reload.
    }
  }
}

/** The stored value when it is a known locale, else the default — an
    invalid/stale value falls back instead of crashing first paint. */
function storedLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return LOCALES.includes(stored as Locale) ? (stored as Locale) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Replace `{name}` placeholders with the given params (pure — unit-
    tested directly; reused by every interpolated message in later slices). */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
