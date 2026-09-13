import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  CreateShelterRequest,
  MineShelterDto,
  OccupancyBand,
  ProvenanceFilter,
  ReportOccupancyRequest,
  ReportShelterRequest,
  ShelterDetailDto,
  ShelterDto,
  ShelterReportResult,
  ShelterTrustFilter,
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
 *
 * Trust layer (shelter-trust-and-reports): `report()` posts a typed shelter
 * report and `reportOccupancy()` upserts the caller's live band — both
 * verified-only (403), 404 on unknown shelter, 409 on a duplicate.
 */
@Injectable({ providedIn: 'root' })
export class ShelterGateway {
  private readonly api = inject(ApiClient);

  /**
   * GET /api/shelters?provenance=… -> ShelterDto[] (ACTIVE rows only, no
   * paging — Estonia-scale fetch-all). The provenance filter (shelter-
   * provenance-taxonomy M6) replaces the old source chips — provenance
   * strictly subdivides source, and `ALL` omits the param entirely (the
   * backend keeps `?source=` for compatibility).
   *
   * `trust` (optional, D5) composes with the provenance filter: reviewed=
   * true, minRating=1..5, hasCapacity=true. Inactive filters are omitted
   * from the query string entirely (the default call is `/api/shelters`,
   * byte-identical to M4's default `?source=ALL` response).
   */
  list(provenance: ProvenanceFilter, trust?: ShelterTrustFilter): Promise<ShelterDto[]> {
    return lastValueFrom(this.api.get<ShelterDto[]>(listPath(provenance, trust)));
  }

  /** GET /api/shelters/{id} -> the detail projection, or a 404 ApiError. */
  get(id: number): Promise<ShelterDetailDto> {
    return lastValueFrom(this.api.get<ShelterDetailDto>(`/api/shelters/${id}`));
  }

  /**
   * POST /api/shelters -> the created ShelterDto (201 + Location, body carries
   * the full row). Verified accounts only (403 otherwise); the backend
   * re-checks the Estonia bbox and field bounds (400).
   */
  create(request: CreateShelterRequest): Promise<ShelterDto> {
    return lastValueFrom(this.api.post<ShelterDto>('/api/shelters', request));
  }

  /**
   * GET /api/shelters/mine -> the caller's own shelters (Bearer JWT), with
   * the review state (community-review-queue): `reviewStatus` (NEW until
   * confirmed by the community or an admin) + `reviewNote` (the admin's
   * REJECT reason, when present). The public list/detail DTOs carry
   * reviewStatus/locationKind too (v2 contract) — only reviewNote is
   * owner-scoped.
   */
  mine(): Promise<MineShelterDto[]> {
    return lastValueFrom(this.api.get<MineShelterDto[]>('/api/shelters/mine'));
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

  /**
   * POST /api/shelters/{id}/reports -> 200 {"damped": true|false}
   * (shelter-trust-and-reports D1; community-self-moderation M9 damp
   * flag). Verified accounts only: 403 (the standard redirect
   * vocabulary), 404 unknown shelter, 409 when the caller already
   * reported that type.
   */
  report(id: number, request: ReportShelterRequest): Promise<ShelterReportResult> {
    return lastValueFrom(
      this.api.post<ShelterReportResult>(`/api/shelters/${id}/reports`, request),
    );
  }

  /**
   * PUT /api/shelters/{id}/occupancy -> 2xx (D4): upsert — one live band per
   * user per shelter, latest edit wins. Verified accounts only (403),
   * 404 unknown shelter.
   */
  reportOccupancy(id: number, band: OccupancyBand): Promise<void> {
    const request: ReportOccupancyRequest = { band };
    return lastValueFrom(this.api.put<void>(`/api/shelters/${id}/occupancy`, request));
  }
}

/**
 * The list query string: `provenance` first, only when not ALL (M6 — the
 * old `source` param is no longer sent by the FE), trust filters appended
 * in a fixed order (reviewed, minRating, hasCapacity) — only when active.
 * No filters -> exactly `/api/shelters`.
 */
function listPath(provenance: ProvenanceFilter, trust?: ShelterTrustFilter): string {
  const params: string[] = [];
  if (provenance !== 'ALL') {
    params.push(`provenance=${provenance}`);
  }
  if (trust?.reviewed === true) {
    params.push('reviewed=true');
  }
  if (trust?.minRating !== undefined) {
    params.push(`minRating=${trust.minRating}`);
  }
  if (trust?.hasCapacity === true) {
    params.push('hasCapacity=true');
  }
  return params.length === 0 ? '/api/shelters' : `/api/shelters?${params.join('&')}`;
}
