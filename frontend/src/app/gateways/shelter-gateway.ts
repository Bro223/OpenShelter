import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  CreateShelterRequest,
  MineShelterDto,
  OccupancyBand,
  PutOpenStatusRequest,
  ReportOccupancyRequest,
  ReportShelterRequest,
  ShelterDetailDto,
  ShelterDto,
  ShelterReportResult,
  ShelterSourceFilter,
  ShelterTrustFilter,
  UpdateShelterRequest,
} from '../core/models';

/**
 * The door to the /api/shelters controller group (01-TASK.md §4: gateways are
 * the only way pages reach the API). Public read API — no auth. Both methods
 * return typed promises and throw ApiError on failure (mapped centrally by
 * ApiClient). `get` serves the detail page too.
 *
 * Author-scoped mutations (user-contributions): `mine()` lists the caller's
 * own shelters; `update()`/`remove()` act on the caller's own shelter only
 * (the backend answers 404 if absent, 403 if not the author).
 *
 * Trust layer (shelter-trust-and-reports): `report()` posts a typed shelter
 * report and `reportOccupancy()` upserts the caller's live band — both
 * verified-only (403), 404 on unknown shelter, 409 on a duplicate.
 * `putOpenStatus()` upserts the caller's live open/closed state — same
 * verified-only 403 vocabulary, 204 on success.
 */
@Injectable({ providedIn: 'root' })
export class ShelterGateway {
  private readonly api = inject(ApiClient);

  /**
   * GET /api/shelters?source=ALL|REGISTRY|USER -> ShelterDto[] (ACTIVE rows
   * only, no paging — Estonia-scale fetch-all). REGISTRY = PAASETEAMET +
   * MUNICIPALITY rows; USER = community submissions.
   *
   * `trust` (optional, D5) composes with the source filter: hasCapacity=true.
   * Inactive filters are omitted from the query string entirely. (The
   * `reviewed` filter is gone with the review model; "Open" is a
   * client-side chip and never reaches the query string.)
   */
  list(source: ShelterSourceFilter, trust?: ShelterTrustFilter): Promise<ShelterDto[]> {
    return lastValueFrom(this.api.get<ShelterDto[]>(listPath(source, trust)));
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
   * REJECT reason, when present) + `infoRequest` (the moderator→submitter
   * information request — null when none). The public
   * list/detail DTOs carry reviewStatus/locationKind too (v2 contract) —
   * only reviewNote + infoRequest are owner-scoped.
   */
  mine(): Promise<MineShelterDto[]> {
    return lastValueFrom(this.api.get<MineShelterDto[]>('/api/shelters/mine'));
  }

  /**
   * POST /api/shelters/{id}/info-request/reply {message} -> 204. The
   * submitter's ONE-TIME answer to the admin's information
   * request: author only (403), 404 when the row has no request, 409 on a
   * second answer (the row is kept after the reply — audit posture).
   */
  replyInfoRequest(id: number, message: string): Promise<void> {
    return lastValueFrom(
      this.api.post<void>(`/api/shelters/${id}/info-request/reply`, { message }),
    );
  }

  /**
   * PUT /api/shelters/{id} -> the updated ShelterDto (200). The caller's own
   * USER-source shelter only: 404 if absent, 403 if not the author (the
   * backend re-checks the Estonia bbox + the POST field bounds, 400).
   */
  update(id: number, request: UpdateShelterRequest): Promise<ShelterDto> {
    return lastValueFrom(this.api.put<ShelterDto>(`/api/shelters/${id}`, request));
  }

  /** DELETE /api/shelters/{id} -> 204 No Content (author only; reports and
   *  occupancy cascade). */
  remove(id: number): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/api/shelters/${id}`));
  }

  /**
   * POST /api/shelters/{id}/reports -> 200 {"damped": true|false}
   * (shelter-trust-and-reports D1; community-self-moderation damp
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

  /**
   * PUT /api/shelters/{id}/open-status -> 204: upsert —
   * one live open/closed state per user per shelter, latest edit wins.
   * Verified accounts only (403, the standard redirect vocabulary),
   * 404 unknown shelter.
   */
  putOpenStatus(id: number, state: 'OPEN' | 'CLOSED'): Promise<void> {
    const request: PutOpenStatusRequest = { state };
    return lastValueFrom(this.api.put<void>(`/api/shelters/${id}/open-status`, request));
  }
}

/**
 * The list query string: `source` always first, trust filters appended in
 * a fixed order (hasCapacity) — only when active.
 * No trust filters -> exactly `/api/shelters?source=…`.
 */
function listPath(source: ShelterSourceFilter, trust?: ShelterTrustFilter): string {
  const params = [`source=${source}`];
  if (trust?.hasCapacity === true) {
    params.push('hasCapacity=true');
  }
  return `/api/shelters?${params.join('&')}`;
}
