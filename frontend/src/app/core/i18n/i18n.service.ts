import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import type { Locale } from './locale';
import { LOCALES } from './locale';
import type { Messages, MessageKey } from './messages';
import { EN } from './en';
import {
  DEFAULT_SITE_TEXT_URLS,
  type SiteTextOverride,
  type SiteTextsByLocale,
} from './site-texts';

/** Where the UI language preference lives in localStorage. Only `en`/`et`/`ru`
 *  is ever stored — the default is the ABSENCE of the key. The pre-paint
 *  script in index.html reads this same key before first paint. */
const LOCALE_KEY = 'openshelter-locale';

/** Where the admin area's CONTENT language lives in localStorage. A
 *  SEPARATE key from LOCALE_KEY on purpose — the two languages are
 *  independent: the admin chrome can be Estonian while the moderator
 *  edits Russian content, and the public header switcher (LOCALE_KEY)
 *  never touches this one. */
const CONTENT_LOCALE_KEY = 'openshelter-admin-content-locale';

/** The default locale: `en`, the app's original copy language — a fresh
 *  visitor sees the UI exactly as authored (zero first-load behavior
 *  change). */
const DEFAULT_LOCALE: Locale = 'en';

/** The on-demand loaders for the non-default catalogs: dynamic imports,
 *  so `et`/`ru` each ship in their own lazy chunk. The default catalog
 *  (`en`) ships in the initial bundle and is never loaded here. */
const LAZY_CATALOG_LOADERS: Partial<Record<Locale, () => Promise<Messages>>> = {
  et: () => import('./et').then((m) => m.ET),
  ru: () => import('./ru').then((m) => m.RU),
};

/**
 * The UI language: the app chrome and the route titles.
 *
 * TWO LANGUAGES: `locale`/`setLocale` is the UI language — the chrome,
 * driven by the public header switcher, and public pages render both
 * their chrome and their content in it. `contentLocale`/`setContentLocale`
 * is the admin area's content language: the locale the guidance admin's
 * list/detail/save/reorder calls scope to. It defaults to the UI locale
 * on first entry, then persists INDEPENDENTLY (its own key) — a
 * UI-language switch never moves it, and a content-language switch never
 * re-translates the chrome.
 *
 * `t()` is the single lookup seam: templates use the `t` pipe
 * (`{{ 'nav.map' | t }}`), non-template code (titleGuard, the
 * shelter-copy/error-copy helpers) calls it directly with an optional
 * `{param}` interpolation map.
 *
 * Lazy catalogs: the DEFAULT catalog ships in the initial bundle — a
 * fresh (or default-locale) visitor paints the final text with zero
 * flash, and the pre-paint script needs no catalog data at all (it only
 * validates the stored locale STRING against the known set and sets
 * `<html lang>`, and the pre-paint `<title>` is the brand name, which no
 * locale translates). The other catalogs load ON DEMAND — a stored
 * non-default preference at boot, or the header language switcher — and
 * stay cached for the session. While a catalog is still loading, `t()`
 * serves the DEFAULT locale's value for the key: translated copy, never
 * a raw key, never undefined.
 *
 * Site-text overlay: the admin can override a DECLARED set of keys (the
 * allowlist in site-texts.ts) per locale. `setSiteTexts()` installs the
 * fetched overrides (null = none / not loaded yet); `t()` reads the
 * active locale's override for the key FIRST and falls back to the
 * shipped catalog — the catalog is the default, never a duplicate of
 * the stored row. Override values are plain text rendered through
 * Angular interpolation (auto-escaped, never innerHTML).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  /** The active UI locale. */
  readonly locale = signal<Locale>(storedLocale(LOCALE_KEY, DEFAULT_LOCALE));

  /** The admin area's CONTENT language: the locale the guidance
      admin's list/detail/save/reorder calls scope to. The UI locale does
      NOT drive it — the default (on first entry) is the UI locale, and
      from then on it persists independently under its own key. The
      public site never reads it. */
  readonly contentLocale = signal<Locale>(storedLocale(CONTENT_LOCALE_KEY, this.locale()));

  /** The admin overrides (the site_texts table), fetched once at boot by
      the shell. null = not loaded yet (or the fetch failed) — t() serves
      the shipped catalog, so a down API degrades to the default copy. */
  readonly siteTexts = signal<SiteTextsByLocale | null>(null);

  /** Bumped each time a catalog finishes loading — reactive consumers
      (the admin site-texts panel's placeholder computed, via
      defaultText) re-run with the real values when a non-default chunk
      lands. */
  readonly catalogVersion = signal(0);

  private readonly appRef = inject(ApplicationRef);
  /** The catalogs in memory: the default locale eagerly, the rest as
      their chunks arrive. `lookup` falls back to the default locale
      while one is still loading. */
  private readonly resolvedCatalogs: Partial<Record<Locale, Messages>> = {
    en: EN,
  };
  /** One load per locale per session — the promise IS the cache. */
  private readonly catalogLoads: Partial<Record<Locale, Promise<Messages>>> = {};
  /** One-shot callbacks run when the next catalog lands (the tab-title
      re-resolve in core/title.ts); flushed in order, then cleared. */
  private readonly catalogArrivals: Array<() => void> = [];

  constructor() {
    document.documentElement.lang = this.locale();
    // A stored non-default preference starts its chunk loading NOW (the
    // shell creates this service at boot, before the route content
    // renders). If the chunk has not landed by first paint, t() serves
    // the default locale — the accepted one-language flash, never a raw
    // key.
    if (this.locale() !== DEFAULT_LOCALE) {
      void this.ensureCatalog(this.locale()).catch(() => {
        /* chunk load failed (network): t() keeps serving the default
           locale; a later ensureCatalog (switcher click, title
           re-resolve) retries, because a failed load is not cached. */
      });
    }
  }

  /** Load the catalog for `locale` (if not in memory yet) and return the
      — cached — promise. The default locale is synchronous: its catalog
      ships in the initial bundle, so this never waits.
      On arrival: bump `catalogVersion`, run the queued arrival callbacks
      (the title re-resolve), and schedule ONE change-detection pass
      (ApplicationRef.tick — the zoneless app has no zone to schedule
      one) so every `| t` consumer repaints in the active locale without
      any template change. A failed load rejects AND drops out of the
      cache, so the next call retries. */
  ensureCatalog(locale: Locale): Promise<Messages> {
    const inMemory = this.resolvedCatalogs[locale];
    if (inMemory !== undefined) {
      return Promise.resolve(inMemory);
    }
    const inFlight = this.catalogLoads[locale];
    if (inFlight !== undefined) {
      return inFlight;
    }
    const load = LAZY_CATALOG_LOADERS[locale] ?? (() => Promise.resolve(EN));
    const promise = load()
      .then((catalog) => {
        this.resolvedCatalogs[locale] = catalog;
        this.catalogVersion.update((version) => version + 1);
        const arrivals = this.catalogArrivals.splice(0);
        for (const arrive of arrivals) {
          arrive();
        }
        // One extra change-detection pass (zoneless: no zone to schedule
        // one). Guarded: the chunk may land after the app is destroyed
        // (test teardown) — nothing to repaint then, and the
        // signal-tracking in lookup() already covers live views.
        try {
          this.appRef.tick();
        } catch {
          /* app destroyed before the chunk landed — no repaint target */
        }
        return catalog;
      })
      .catch((error) => {
        delete this.catalogLoads[locale];
        throw error;
      });
    this.catalogLoads[locale] = promise;
    return promise;
  }

  /** True once the catalog for `locale` is in memory (the default
      locale: always — it ships in the initial bundle). */
  isCatalogLoaded(locale: Locale): boolean {
    return this.resolvedCatalogs[locale] !== undefined;
  }

  /** Run `cb` once, the next time a catalog lands. If the ACTIVE
      locale's catalog is already in memory, `cb` runs immediately — the
      caller can rely on it running exactly once. */
  onCatalogLoaded(cb: () => void): void {
    if (this.isCatalogLoaded(this.locale())) {
      cb();
      return;
    }
    this.catalogArrivals.push(cb);
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
      Settings panel's placeholder (the default, override-independent).
      While a non-default catalog is still loading the DEFAULT locale's
      value stands in; the `catalogVersion` read makes a calling
      `computed` re-run the moment the real catalog lands. */
  defaultText(key: MessageKey, locale: Locale): string {
    this.catalogVersion(); // tracked read — recomputes when a catalog lands
    return this.resolvedCatalogs[locale]?.[key] ?? EN[key];
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

  /** The single lookup seam: active-locale override FIRST, the ACTIVE
      locale's catalog when it is loaded, and the DEFAULT locale's
      catalog otherwise — the loading state renders the default locale,
      never a raw key, never undefined (the default catalog is
      key-complete and always in memory).

      The `catalogVersion` read is the lazy-loading re-render seam
      (zoneless CD): every template binding that calls t() thereby
      consumes `catalogVersion`, so the zoneless scheduler marks the view
      for refresh the moment a non-default chunk lands — the pipe
      re-evaluates into the active locale's text with no template change
      and no zone. (Same tracking pattern this codebase already uses for
      locale switches.) */
  private lookup(key: MessageKey): string {
    const override = this.overrideFor(key);
    if (override !== null) {
      return override.value;
    }
    this.catalogVersion(); // tracked read — views re-run when a catalog lands
    const catalog = this.resolvedCatalogs[this.locale()];
    if (catalog !== undefined) {
      return catalog[key];
    }
    return EN[key];
  }

  /** Switch + persist the UI locale (the header language switcher).
      Never touches the admin's content locale — the two languages are
      independent. */
  setLocale(locale: Locale): void {
    this.locale.set(locale);
    document.documentElement.lang = locale;
    // Start fetching the (possibly new) locale's chunk NOW — the chrome
    // shows the default locale's copy until it lands, then
    // ensureCatalog's change-detection pass repaints it. A failed load
    // is silent: the UI keeps the default-locale copy and the next
    // switch retries (a failed load is not cached).
    void this.ensureCatalog(locale).catch(() => {
      /* degraded to the default-locale copy until a later retry lands */
    });
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

/** The stored value for `key` when it is a known locale, else `fallback`
 *  — an invalid/stale value falls back instead of crashing first paint. */
function storedLocale(key: string, fallback: Locale): Locale {
  try {
    const stored = localStorage.getItem(key);
    return LOCALES.includes(stored as Locale) ? (stored as Locale) : fallback;
  } catch {
    return fallback;
  }
}

/** Replace `{name}` placeholders with the given params (pure —
 *  unit-tested directly). Unknown placeholders stay literal. */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
