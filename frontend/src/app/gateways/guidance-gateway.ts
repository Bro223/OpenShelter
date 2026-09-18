import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import { I18nService } from '../core/i18n/i18n.service';
import type { GuidancePostDto } from '../core/models';

/**
 * The door to the public /api/guidance controller group (crisis-guidance
 * D3/D4): the /blog pages. Public read API — permit-all, no auth. Both
 * methods return typed promises and throw ApiError on failure (mapped
 * centrally by ApiClient).
 *
 * Locale scope: the server answers ONE language per call — both methods
 * send the reader's ACTIVE language (the I18nService locale signal, read
 * at call time: never a hard-coded value, never a route parameter), so
 * the index lists only that language's posts and a slug in the other
 * language answers 404 (the page re-fetches on a language switch).
 */
@Injectable({ providedIn: 'root' })
export class GuidanceGateway {
  private readonly api = inject(ApiClient);
  /** The reader's active language — the source of the locale query value. */
  private readonly i18n = inject(I18nService);

  /**
   * GET /api/guidance?locale=<active> -> GuidancePostDto[] — the public
   * index, pinned first then newest: PUBLISHED only (drafts are
   * invisible) AND only the active locale's posts, pinned first, then
   * publishedAt descending (id descending tie-break). 200 with [] when
   * nothing is published in that locale. The index does not carry the
   * post body (bodyHtml is null).
   */
  list(): Promise<GuidancePostDto[]> {
    return lastValueFrom(
      this.api.get<GuidancePostDto[]>(`/api/guidance?locale=${this.i18n.locale()}`),
    );
  }

  /**
   * GET /api/guidance/{slug}?locale=<active> -> one GuidancePostDto —
   * the public detail, PUBLISHED only, fetched by slug (never by id),
   * carrying the stored (sanitized) bodyHtml. A draft slug, an unknown
   * slug, and a slug whose post is in ANOTHER locale answer the SAME
   * 404 (neither a draft's existence nor another language's text is
   * revealed).
   */
  getBySlug(slug: string): Promise<GuidancePostDto> {
    return lastValueFrom(
      this.api.get<GuidancePostDto>(`/api/guidance/${slug}?locale=${this.i18n.locale()}`),
    );
  }
}
