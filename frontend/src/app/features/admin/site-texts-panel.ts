import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { LOCALES, type Locale } from '../../core/i18n/locale';
import {
  DEFAULT_SITE_TEXT_URLS,
  SITE_TEXT_BLOCKS,
  SITE_TEXT_KEYS,
  SITE_TEXT_LINK_KEYS,
  isSiteTextLink,
  type SiteTextsByLocale,
} from '../../core/i18n/site-texts';
import { AdminGateway } from '../../gateways/admin-gateway';
import { SiteTextsGateway } from '../../gateways/site-texts-gateway';
import { LoadingIndicator } from '../../shared/loading-indicator';
import type { SiteTextEntryDto } from '../../core/models';

/**
 * The admin Settings panel — the site texts (site_texts): the
 * admin-editable popup / header / footer texts, three languages.
 *
 * One input per (key, locale); the shipped i18n catalog value is the
 * PLACEHOLDER (the default — a blank field means "use the default", and
 * saving a cleared field deletes the override row server-side). The two
 * link keys get one URL input (https-validated server-side) that is
 * stored once and shared by all three locales. Unknown keys are
 * impossible by construction: the panel renders from the declared
 * allowlist (core/i18n/site-texts.ts) — the admin edits VALUES, never
 * invents keys.
 *
 * Self-contained (the guidance/media tab pattern): its own load/save
 * state, its own status line; the surrounding AdminPage renders it on
 * the `settings` tab.
 */
@Component({
  selector: 'app-site-texts-panel',
  imports: [LoadingIndicator],
  templateUrl: './site-texts-panel.html',
  styleUrl: './site-texts-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteTextsPanel {
  private readonly i18n = inject(I18nService);
  private readonly admin = inject(AdminGateway);
  private readonly siteTexts = inject(SiteTextsGateway);

  /** The current overrides; null = still loading. */
  readonly loaded = signal<SiteTextsByLocale | null>(null);
  readonly loadError = signal<string | null>(null);

  /** Value drafts, keyed `key::locale` (blank = shipped default). */
  readonly values = signal<Record<string, string>>({});
  /** URL drafts per link key (one per link, shared across locales). */
  readonly urls = signal<Record<string, string>>({});

  readonly saving = signal(false);
  readonly status = signal<{ ok: boolean; message: string } | null>(null);

  /** The template's view model: the three blocks with per-key defaults
      (the placeholders) and the shipped default URLs. */
  protected readonly blocks = computed(() =>
    SITE_TEXT_BLOCKS.map((block) => ({
      id: block.id,
      heading: this.i18n.defaultText(block.headingKey, 'en'),
      keys: block.keys.map((key) => ({
        key,
        isLink: isSiteTextLink(key),
        urlDefault: DEFAULT_SITE_TEXT_URLS[key] ?? '',
        defaults: Object.fromEntries(
          LOCALES.map((l) => [l, this.i18n.defaultText(key, l)]),
        ) as Record<Locale, string>,
      })),
    })),
  );

  /** The locales in the site order (EN ET RU), with their labels. */
  protected readonly locales: readonly { code: Locale; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'et', label: 'ET' },
    { code: 'ru', label: 'RU' },
  ];

  constructor() {
    this.load();
  }

  /* --- accessors (the template binds the drafts through these) ----------- */

  protected value(key: string, locale: Locale): string {
    return this.values()[`${key}::${locale}`] ?? '';
  }

  protected setValue(key: string, locale: Locale, value: string): void {
    const next = { ...this.values() };
    next[`${key}::${locale}`] = value;
    this.values.set(next);
    this.status.set(null);
  }

  protected url(key: string): string {
    return this.urls()[key] ?? '';
  }

  protected setUrl(key: string, value: string): void {
    const next = { ...this.urls() };
    next[key] = value;
    this.urls.set(next);
    this.status.set(null);
  }

  /* --- load / save -------------------------------------------------------- */

  load(): void {
    this.loaded.set(null);
    this.loadError.set(null);
    this.siteTexts
      .fetch()
      .then((texts) => {
        const values: Record<string, string> = {};
        const urls: Record<string, string> = {};
        if (texts) {
          for (const locale of LOCALES) {
            for (const [key, entry] of Object.entries(texts[locale] ?? {})) {
              values[`${key}::${locale}`] = entry.value;
              // The server stores the URL on the `en` row (one URL per
              // link key, shared by all locales).
              if (entry.url && locale === 'en') {
                urls[key] = entry.url;
              }
            }
          }
        }
        this.values.set(values);
        this.urls.set(urls);
        this.loaded.set(
          texts ?? { en: {}, et: {}, ru: {} },
        );
      })
      .catch(() => {
        this.loadError.set('Failed to load the site texts.');
      });
  }

  /** Diff the drafts against the loaded overrides and PUT only what
      changed. A cleared field sends the blank (the server deletes the
      row); an edited-from-default field sends the new value. */
  save(): void {
    const loaded = this.loaded();
    if (this.saving() || loaded === null) {
      return;
    }
    // Client-side mirror of the server rule: a non-blank link URL must be
    // https (the server enforces it too — this is the fast path).
    for (const link of SITE_TEXT_LINK_KEYS) {
      const draft = (this.urls()[link] ?? '').trim();
      if (draft !== '' && !draft.startsWith('https://')) {
        this.status.set({
          ok: false,
          message: 'Link URLs must start with https://.',
        });
        return;
      }
    }

    const entries: SiteTextEntryDto[] = [];
    for (const locale of LOCALES) {
      for (const key of SITE_TEXT_KEYS) {
        const current = loaded[locale]?.[key]?.value ?? '';
        const draft = this.values()[`${key}::${locale}`] ?? '';
        if (draft !== current) {
          entries.push({ key, locale, value: draft });
        }
      }
    }
    for (const link of SITE_TEXT_LINK_KEYS) {
      const currentUrl = loaded.en?.[link]?.url ?? '';
      const draftUrl = (this.urls()[link] ?? '').trim();
      if (draftUrl !== currentUrl) {
        entries.push({
          key: link,
          locale: 'en',
          value: loaded.en?.[link]?.value ?? '',
          url: draftUrl === '' ? '' : draftUrl,
        });
      }
    }

    if (entries.length === 0) {
      this.status.set({ ok: true, message: 'No changes to save.' });
      return;
    }

    this.saving.set(true);
    this.status.set(null);
    this.admin
      .putSiteTexts(entries)
      .then(() => {
        // Echo: the server now stores exactly the drafts (a blank value
        // means the row is deleted — the default stands).
        this.loaded.set(this.nextLoadedFromDrafts());
        this.status.set({ ok: true, message: 'Saved.' });
      })
      .catch((err: unknown) => {
        this.status.set({
          ok: false,
          message:
            err instanceof Error && err.message !== ''
              ? `Save failed: ${err.message}`
              : 'Save failed.',
        });
      })
      .finally(() => {
        this.saving.set(false);
      });
  }

  /** The override map the drafts imply (only non-blank values, the URL
      on the `en` row of each link key). */
  private nextLoadedFromDrafts(): SiteTextsByLocale {
    const next: SiteTextsByLocale = { en: {}, et: {}, ru: {} };
    for (const locale of LOCALES) {
      for (const key of SITE_TEXT_KEYS) {
        const draft = (this.values()[`${key}::${locale}`] ?? '').trim();
        if (draft !== '') {
          next[locale][key] = { value: this.values()[`${key}::${locale}`] };
        }
      }
    }
    for (const link of SITE_TEXT_LINK_KEYS) {
      const draftUrl = (this.urls()[link] ?? '').trim();
      const value = next.en[link]?.value;
      if (value !== undefined && draftUrl !== '') {
        next.en[link] = { value, url: draftUrl };
      }
    }
    return next;
  }
}
