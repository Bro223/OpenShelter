import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { ShelterDto, ShelterSourceFilter } from '../core/models';

/**
 * The door to the /api/shelters controller group (01-TASK.md §4: gateways are
 * the only way pages reach the API). Public read API — no auth. Both methods
 * return typed promises and throw ApiError on failure (mapped centrally by
 * ApiClient). `get` is used by the M5 detail page too.
 */
@Injectable({ providedIn: 'root' })
export class ShelterGateway {
  private readonly api = inject(ApiClient);

  /**
   * GET /api/shelters?source=ALL|REGISTRY|USER -> ShelterDto[] (ACTIVE rows
   * only, no paging — Estonia-scale fetch-all). REGISTRY = PAASETEAMET +
   * MUNICIPALITY rows; USER = community submissions.
   */
  list(source: ShelterSourceFilter): Promise<ShelterDto[]> {
    return lastValueFrom(this.api.get<ShelterDto[]>(`/api/shelters?source=${source}`));
  }

  /** GET /api/shelters/{id} -> one ShelterDto, or a 404 ApiError. */
  get(id: number): Promise<ShelterDto> {
    return lastValueFrom(this.api.get<ShelterDto>(`/api/shelters/${id}`));
  }
}
