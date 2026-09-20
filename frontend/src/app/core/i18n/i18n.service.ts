import { Injectable, signal } from '@angular/core';
import type { Locale } from './locale';
import { LOCALES } from './locale';
import type { Messages, MessageKey } from './messages';
import { EN } from './en';
import { ET } from './et';
import { RU } from './ru';
import {
  DEFAULT_SITE_TEXT_URLS,
  type SiteTextOverride,
  type SiteTextsByLocale,
} from './site-texts';

/**
 * Where the UI language preference lives in localStorage (i18n-et-en).
 * Only `en`/`et`/`ru` are ever stored — the default is the ABSENCE of the
 * key (mirrors the pre-paint script in index.html, which reads this same
 * key before first paint, and the ThemeStore persistence shape).
 */
const LOCALE_KEY = 'openshelter-locale';

/**
 * Where the admin area's CONTENT language lives in localStorage
 * (admin-locale-split): the locale the guidance admin's list/detail/
 * save/reorder calls scope to. A SEPARATE key from LOCALE_KEY on purpose
 * — the two languages are independent (the owner's requirement): the
 * admin chrome can be Estonian while the moderator edits Russian
 * content, and the public header switcher (LOCALE_KEY) never touches
 * this one.
 */
const CONTENT_LOCALE_KEY = 'openshelter-admin-content-locale';

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
const CATALOGS: Record<Locale, Messages> = { en: EN, et: ET, ru: RU };

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
 * TWO LANGUAGES (admin-locale-split): `locale`/`setLocale` is the UI
 * language — the chrome, exactly as before; the public site's header
 * switcher drives it, and public pages render both their chrome and their
 * content in it, unchanged. `contentLocale`/`setContentLocale` is the
 * admin area's content language: the locale the guidance admin's list/
 * detail/save/reorder calls scope to. It defaults to the UI locale on
 * first entry, then persists INDEPENDENTLY (its own key) — a UI-language
 * switch never moves it, and a content-language switch never re-translates
 * the chrome.
 *
 * `t()` is the single lookup seam: templates use the `t` pipe
 * (`{{ 'nav.map' | t }}`), non-template code (titleGuard, the
 * shelter-copy/error-copy helpers) calls it directly with an optional
 * `{param}` interpolation map.
 *
 * Site-text overlay (site_texts): the admin can override a DECLARED set
 * of keys (see site-texts.ts) per locale. `setSiteTexts()` installs the
 * fetched overrides (null = none / not loaded yet); `t()` reads the
 * active locale's override for the key FIRST and falls back to the
 * shipped catalog — the catalog is the default, never a duplicate of
 * the stored row. Override values are plain text rendered through
 * Angular interpolation (auto-escaped, never innerHTML).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  /** The active locale. */
  readonly locale = signal<Locale>(storedLocale());

  /** The admin area's CONTENT language (admin-locale-split): the locale
      the guidance admin's list/detail/save/reorder calls scope to. The
      UI locale does NOT drive it — the default (on first entry) is the
      UI locale, and from then on it persists independently under its
      own key. The public site never reads it: public pages render in
      the UI locale, exactly as before. */
  readonly contentLocale = signal<Locale>(storedContentLocale(this.locale()));

  /** The admin overrides (site_texts), fetched once at boot by the shell.
      null = not loaded yet (or the fetch failed) — t() serves the
      shipped catalog, so a down API degrades to the default copy. */
  readonly siteTexts = signal<SiteTextsByLocale | null>(null);

  constructor() {
    document.documentElement.lang = this.locale();
  }

  /** Translate a key for the active locale, interpolating `{param}`
      placeholders when `params` is given (unknown placeholders stay
      literal — a typo'd placeholder is visible, not silently dropped). */
  t(key: MessageKey, params?: Record<string, string | number>): string {
    const template = this.lookup(key);
    return params ? interpolate(template, params) : template;
  }

  /** The link URL for a key (the label + https-validated URL pairs):
      the active locale's override when present, else the shipped
      default (DEFAULT_SITE_TEXT_URLS), else '' (a non-link key). */
  url(key: MessageKey): string {
    const override = this.overrideFor(key);
    return override?.url ?? DEFAULT_SITE_TEXT_URLS[key] ?? '';
  }

  /** The shipped CATALOG value for an explicit locale — the admin
      Settings panel's placeholder (the default, override-independent). */
  defaultText(key: MessageKey, locale: Locale): string {
    return CATALOGS[locale][key] ?? CATALOGS[DEFAULT_LOCALE][key];
  }

  /** Install (or clear, with null) the fetched admin overrides. */
  setSiteTexts(texts: SiteTextsByLocale | null): void {
    this.siteTexts.set(texts);
  }

  /** The active locale's override for the key, when one exists and
      carries a non-blank value (a blank override is treated as absent —
      the catalog default wins; the server also refuses to store one). */
  private overrideFor(key: MessageKey): SiteTextOverride | null {
    const entry = this.siteTexts()?.[this.locale()]?.[key];
    if (entry === undefined || entry === null || entry.value.trim() === '') {
      return null;
    }
    return entry;
  }

  /** The single override seam: active-locale override FIRST, shipped
      catalog as the default (the old lookup, unchanged as a fallback). */
  private lookup(key: MessageKey): string {
    const override = this.overrideFor(key);
    if (override !== null) {
      return override.value;
    }
    return CATALOGS[this.locale()][key] ?? CATALOGS[DEFAULT_LOCALE][key];
  }

  /** Switch + persist the locale (the header language switcher). Never
      touches the admin's content locale — the two languages are
      independent (admin-locale-split). */
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

  /** Switch + persist the admin's CONTENT language (the admin Settings
      panel's content-language control). Never touches the UI locale: the
      chrome keeps its language, the guidance list/detail/save/reorder
      scope to this one. */
  setContentLocale(locale: Locale): void {
    this.contentLocale.set(locale);
    try {
      localStorage.setItem(CONTENT_LOCALE_KEY, locale);
    } catch {
      // Storage unavailable (private mode): the choice still applies for
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

/** The stored admin content locale when it is a known one, else `fallback`
    — an invalid/stale value falls back to the UI locale (the first-entry
    default), never a hardcoded locale (admin-locale-split). */
function storedContentLocale(fallback: Locale): Locale {
  try {
    const stored = localStorage.getItem(CONTENT_LOCALE_KEY);
    return LOCALES.includes(stored as Locale) ? (stored as Locale) : fallback;
  } catch {
    return fallback;
  }
}

/** Replace `{name}` placeholders with the given params (pure — unit-
    tested directly; reused by every interpolated message in later slices). */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
