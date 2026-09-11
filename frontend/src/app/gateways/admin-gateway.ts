import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  AdminShelterDto,
  AdminShelterFilters,
  AdminShelterReportDto,
  AdminReviewReportDto,
  ShelterStatus,
} from '../core/models';

/**
 * The door to the /admin/* controller group (admin-moderation D3). Every
 * endpoint requires the caller's JWT AND admin kind (backend re-checks the
 * kind per request — a fresh lookup, never a JWT claim: 401 anonymous, 403
 * non-admin, 409 registry-row writes). All methods return typed promises
 * and throw ApiError on failure (mapped centrally by ApiClient).
 *
 * The seven endpoints, 1:1:
 *
 *   GET    /admin/shelters?status=&source=&q=  -> AdminShelterDto[]
 *   POST   /admin/shelters/{id}/status         -> 204 (USER rows only)
 *   DELETE /admin/shelters/{id}                -> 204 (USER rows only)
 *   GET    /admin/reports?shelterId=           -> AdminShelterReportDto[]
 *   POST   /admin/reports/{id}/dismiss         -> 204 (idempotent)
 *   GET    /admin/review-reports               -> AdminReviewReportDto[]
 *   POST   /admin/reviews/{id}/hide            -> 204 (idempotent)
 *   POST   /admin/reviews/{id}/restore         -> 204 (idempotent)
 *
 * The review hide/restore `{id}` is the REVIEW's id, not the review-report
 * row's id — callers pass `row.reviewId`.
 */
@Injectable({ providedIn: 'root' })
export class AdminGateway {
  private readonly api = inject(ApiClient);

  /**
   * GET /admin/shelters — ALL rows incl. hidden (INACTIVE). `filters` are
   * optional; absent fields are omitted from the query string entirely
   * (the bare call is exactly `/admin/shelters`).
   */
  listShelters(filters?: AdminShelterFilters): Promise<AdminShelterDto[]> {
    return lastValueFrom(this.api.get<AdminShelterDto[]>(adminSheltersPath(filters)));
  }

  /**
   * POST /admin/shelters/{id}/status {status} -> 204. Manual hide/restore.
   * USER rows only — a registry row answers 409 (import-owned, D4) and the
   * page surfaces the server message; the UI never offers these actions for
   * registry rows in the first place.
   */
  setShelterStatus(id: number, status: ShelterStatus): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/shelters/${id}/status`, { status }));
  }

  /**
   * DELETE /admin/shelters/{id} -> 204. Hard delete; reviews, reports and
   * occupancy cascade (backend). USER rows only (409), 404 unknown.
   */
  deleteShelter(id: number): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/admin/shelters/${id}`));
  }

  /**
   * GET /admin/reports — the shelter-report queue, newest first, with the
   * shelter's live status and the reporter's profile name + email.
   * Optional `shelterId` narrows to one shelter.
   */
  listShelterReports(shelterId?: number): Promise<AdminShelterReportDto[]> {
    const suffix = shelterId === undefined ? '' : `?shelterId=${shelterId}`;
    return lastValueFrom(this.api.get<AdminShelterReportDto[]>(`/admin/reports${suffix}`));
  }

  /** POST /admin/reports/{id}/dismiss -> 204. Idempotent (no-op if done). */
  dismissShelterReport(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/reports/${id}/dismiss`));
  }

  /** GET /admin/review-reports — the review-report queue, newest first. */
  listReviewReports(): Promise<AdminReviewReportDto[]> {
    return lastValueFrom(this.api.get<AdminReviewReportDto[]>('/admin/review-reports'));
  }

  /** POST /admin/reviews/{id}/hide -> 204, idempotent. `{id}` = the REVIEW id. */
  hideReview(reviewId: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/reviews/${reviewId}/hide`));
  }

  /**
   * POST /admin/reviews/{id}/restore -> 204, idempotent. Clears the hidden
   * marker; the review rejoins the public list, average and count.
   * `{id}` = the REVIEW id.
   */
  restoreReview(reviewId: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/reviews/${reviewId}/restore`));
  }
}

/**
 * The list query string: fixed order (status, source, q), only the fields
 * actually set appear (no trailing `&`, no empty values). `q` is a free
 * name/address substring — URL-encoded.
 */
function adminSheltersPath(filters?: AdminShelterFilters): string {
  const params: string[] = [];
  if (filters?.status !== undefined) {
    params.push(`status=${filters.status}`);
  }
  if (filters?.source !== undefined) {
    params.push(`source=${filters.source}`);
  }
  if (filters?.q !== undefined && filters.q !== '') {
    params.push(`q=${encodeURIComponent(filters.q)}`);
  }
  return params.length > 0 ? `/admin/shelters?${params.join('&')}` : '/admin/shelters';
}
