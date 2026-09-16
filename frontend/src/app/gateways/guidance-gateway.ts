import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { GuidancePostDto } from '../core/models';

/**
 * The door to the public /api/guidance controller group (crisis-guidance
 * D3/D4): the /blog pages. Public read API — permit-all, no auth. Both
 * methods return typed promises and throw ApiError on failure (mapped
 * centrally by ApiClient).
 */
@Injectable({ providedIn: 'root' })
export class GuidanceGateway {
  private readonly api = inject(ApiClient);

  /**
   * GET /api/guidance -> GuidancePostDto[] — the public index, pinned first then newest:
   * PUBLISHED only (drafts are invisible), pinned first, then publishedAt
   * descending (id descending tie-break). 200 with [] when nothing is
   * published. The index does not carry the post body (bodyHtml is null).
   */
  list(): Promise<GuidancePostDto[]> {
    return lastValueFrom(this.api.get<GuidancePostDto[]>('/api/guidance'));
  }

  /**
   * GET /api/guidance/{slug} -> one GuidancePostDto — the public detail
   * PUBLISHED only, fetched by slug (never by id), carrying the stored
   * (sanitized) bodyHtml. A draft slug and an unknown slug answer the
   * SAME 404 (a draft's existence is never revealed).
   */
  getBySlug(slug: string): Promise<GuidancePostDto> {
    return lastValueFrom(this.api.get<GuidancePostDto>(`/api/guidance/${slug}`));
  }
}
