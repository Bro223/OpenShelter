import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { SiteTextsByLocale } from '../core/i18n/site-texts';

/**
 * The door to the site_texts endpoints (site_texts): the admin-editable
 * popup/header/footer texts.
 *
 *   GET /api/site-texts  -> SiteTextsByLocale (permit-all — the overrides
 *                           are public copy: the same text every visitor
 *                           sees, one fetch for all three locales)
 *
 * The admin write side (PUT /admin/site-texts) lives in AdminGateway —
 * the /admin/* door — so this gateway carries the public read only,
 * exactly like DataSourceGateway (a public provenance read, non-critical:
 * a failure resolves to null and the shipped i18n catalog stands).
 */
@Injectable({ providedIn: 'root' })
export class SiteTextsGateway {
  private readonly api = inject(ApiClient);

  /** The current overrides (absent key = the shipped catalog default).
      Any failure resolves to null — the overlay is progressive
      enhancement, never a blocker for the chrome. */
  async fetch(): Promise<SiteTextsByLocale | null> {
    try {
      return await lastValueFrom(this.api.get<SiteTextsByLocale>('/api/site-texts'));
    } catch {
      return null;
    }
  }
}
