import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import { I18nService } from '../core/i18n/i18n.service';
import type { GuidancePostDto } from '../core/models';

/**
 * The public index page (guidance-index-paging): one page's posts PLUS the
 * un-paged total the server reports in X-Total-Count — the page count is
 * derived from it, so an out-of-range page can be told apart from a truly
 * empty index.
 */
export interface GuidancePageResult {
  /** The posts of the requested page (empty when the page is past the end). */
  posts: GuidancePostDto[];
  /** The number of published posts in the active locale, WITHOUT paging. */
  total: number;
}

/**
 * The default page size of the /blog index (the owner's paging contract).
 * The size selector offers 10..100 in steps of 10; 20 is the default and
 * the only value the frontend ever sends when the URL carries no size.
 */
export const GUIDANCE_PAGE_SIZE = 20;

/**
 * The public index page bounds — the size selector offers exactly this
 * range (10..100 in steps of 10), and the endpoint's limit bound (1..200)
 * always honours it, so the control never offers a size the backend would
 * refuse.
 */
export const GUIDANCE_PAGE_SIZES: number[] = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
];

/**
 * The door to the public /api/guidance controller group (crisis-guidance
 * D3/D4): the /blog pages. Public read API — permit-all, no auth. Both
 * methods return typed promises and throw ApiError on failure (mapped
 * centrally by ApiClient).
 *
 * Locale scope: the server answers ONE language per call — both methods
 * send the reader's ACTIVE language (the I18nService locale signal, read
 * at call time: never a hard-coded value, never a route parameter), so the
 * index lists only that language's posts. The DETAIL never dead-ends on a
 * language switch (bilingual-guidance): a slug whose post has no
 * translation in the active language is served in the default locale with
 * `localeFallback: true` (a 200 with the flag — the page tells the reader
 * which language is being shown), and `alternates` names every locale that
 * has a translation (the reader's own choice to follow).
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
   * GET /api/guidance?locale=<active>&limit=<size>&offset=(page-1)*size ->
   * GuidancePageResult — the PAGED public index (guidance-index-paging).
   * The server slices its stable order (pinned first, then publishedAt
   * descending, id descending tie-break); nothing is fetched-and-sliced
   * client-side. The un-paged total comes back as the X-Total-Count
   * response header (the body stays GuidancePostDto[], so a client that
   * ignores the header keeps working); a missing/blank header degrades
   * to the fetched page's own length, which makes out-of-range detection
   * honest (such a page IS empty) rather than a bare empty list.
   *
   * <p>page is 1-based; size is one of {@link GUIDANCE_PAGE_SIZES}.
   */
  listPage(page: number, size: number): Promise<GuidancePageResult> {
    const offset = (page - 1) * size;
    return lastValueFrom(
      this.api.getWithHeaders<GuidancePostDto[]>(
        `/api/guidance?locale=${this.i18n.locale()}&limit=${size}&offset=${offset}`,
      ),
    ).then(({ body, headers }) => {
      const rawTotal = headers.get('X-Total-Count');
      const parsed = rawTotal === null ? NaN : Number(rawTotal);
      return { posts: body, total: Number.isInteger(parsed) && parsed >= 0 ? parsed : body.length };
    });
  }

  /**
   * GET /api/guidance/{slug}?locale=<active> -> one GuidancePostDto —
   * the public detail, PUBLISHED only, fetched by slug (never by id),
   * carrying the stored (sanitized) bodyHtml. A draft slug and an unknown
   * slug answer the SAME 404 (a draft's existence is never revealed).
   * A post WITHOUT a translation in the active language does NOT 404
   * (bilingual-guidance): the server serves the default-locale translation
   * with `localeFallback: true`, and `alternates` maps every locale that
   * has a translation to its slug (the detail only — the index is null).
   */
  getBySlug(slug: string): Promise<GuidancePostDto> {
    return lastValueFrom(
      this.api.get<GuidancePostDto>(`/api/guidance/${slug}?locale=${this.i18n.locale()}`),
    );
  }
}
