import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  CreateShelterRequest,
  ShelterDto,
  ShelterSourceFilter,
  UpdateShelterRequest,
} from '../core/models';

/**
 * The door to the /api/shelters controller group (01-TASK.md §4: gateways are
 * the only way pages reach the API). Public read API — no auth. Both methods
 * return typed promises and throw ApiError on failure (mapped centrally by
 * ApiClient). `get` is used by the M5 detail page too.
 *
 * Author-scoped mutations (user-contributions): `mine()` lists the caller's
 * own shelters; `update()`/`remove()` act on the caller's own shelter only
 * (the backend answers 404 if absent, 403 if not the author).
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

  /**
   * POST /api/shelters -> the created ShelterDto (201 + Location, body carries
   * the full row). Verified accounts only (403 otherwise); the backend
   * re-checks the Estonia bbox and field bounds (400).
   */
  create(request: CreateShelterRequest): Promise<ShelterDto> {
    return lastValueFrom(this.api.post<ShelterDto>('/api/shelters', request));
  }

  /** GET /api/shelters/mine -> the caller's own shelters (Bearer JWT). */
  mine(): Promise<ShelterDto[]> {
    return lastValueFrom(this.api.get<ShelterDto[]>('/api/shelters/mine'));
  }

  /**
   * PUT /api/shelters/{id} -> the updated ShelterDto (200). The caller's own
   * USER-source shelter only: 404 if absent, 403 if not the author (the
   * backend re-checks the Estonia bbox + the POST field bounds, 400).
   */
  update(id: number, request: UpdateShelterRequest): Promise<ShelterDto> {
    return lastValueFrom(this.api.put<ShelterDto>(`/api/shelters/${id}`, request));
  }

  /** DELETE /api/shelters/{id} -> 204 No Content (author only; reviews cascade). */
  remove(id: number): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/api/shelters/${id}`));
  }
}
