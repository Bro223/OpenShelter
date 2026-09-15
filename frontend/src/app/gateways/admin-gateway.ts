import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  AdminAlertRow,
  AdminAuditRow,
  AdminShelterDto,
  AdminShelterFilters,
  AdminShelterHistoryEvent,
  AdminShelterReportDto,
  AdminUserDto,
  ReviewShelterRequest,
  ReviewShelterResponse,
  ShelterStatus,
} from '../core/models';

/**
 * The door to the /admin/* controller group (admin-moderation D3). Every
 * endpoint requires the caller's JWT AND admin kind (backend re-checks the
 * kind per request — a fresh lookup, never a JWT claim: 401 anonymous, 403
 * non-admin, 409 registry-row writes). All methods return typed promises
 * and throw ApiError on failure (mapped centrally by ApiClient).
 *
 * The fifteen endpoints, 1:1:
 *
 *   GET    /admin/shelters?status=&source=&q=  -> AdminShelterDto[]
 *   POST   /admin/shelters/{id}/status         -> 204 (USER rows only)
 *   POST   /admin/shelters/{id}/review         -> 200 {ok} (USER rows only)
 *   DELETE /admin/shelters/{id}                -> 204 (USER rows only)
 *   GET    /admin/shelters/{id}/history        -> AdminShelterHistoryEvent[]
 *   POST   /admin/shelters/{id}/request-info   -> 204 (USER rows only)
 *   POST   /admin/shelters/{id}/mark-inaccurate -> 204 (USER rows only)
 *   POST   /admin/shelters/{id}/clear-inaccurate -> 204 (USER rows only)
 *   GET    /admin/reports?shelterId=           -> AdminShelterReportDto[]
 *   POST   /admin/reports/{id}/dismiss         -> 204 (idempotent)
 *   GET    /admin/audit                        -> AdminAuditRow[] (newest 100)
 *   GET    /admin/alerts?limit=                -> AdminAlertRow[] (newest 50)
 *   GET    /admin/users                        -> AdminUserDto[]
 *   POST   /admin/users/{id}/suspend           -> 204 (idempotent; REGISTERED only)
 *   POST   /admin/users/{id}/unsuspend         -> 204 (idempotent; REGISTERED only)
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
   * POST /admin/shelters/{id}/review {action, reason?} -> 200 {ok:true}.
   * The rare MANUAL trust override (community-review-queue D2) — the
   * primary flow is the automatic community one. CONFIRM sets
   * review_status=CONFIRMED (status untouched); REJECT sets
   * review_status=REJECTED + status=INACTIVE and stores the reason as the
   * submitter's note. USER rows only — a registry row answers 409 and the
   * page surfaces the server message (bannerMessage echoes 409); 404
   * unknown id. Every decision also writes an audit row server-side.
   */
  reviewShelter(id: number, request: ReviewShelterRequest): Promise<ReviewShelterResponse> {
    return lastValueFrom(
      this.api.post<ReviewShelterResponse>(`/admin/shelters/${id}/review`, request),
    );
  }

  /**
   * DELETE /admin/shelters/{id} -> 204. Hard delete; reports and
   * occupancy cascade (backend). USER rows only (409), 404 unknown.
   */
  deleteShelter(id: number): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/admin/shelters/${id}`));
  }

  /**
   * GET /admin/shelters/{id}/history -> the shelter's edit history, ASCENDING:
   * CREATED / EDITED (server-parsed field changes — the UI renders, never
   * parses JSON) / DELETED, with snapshot names and resolved actor names.
   * The history of a deleted shelter still serves
   * (404 only when the shelter is absent AND has no history rows); registry
   * import rows answer an empty list (the import keeps its own
   * data_imports audit).
   */
  listShelterHistory(id: number): Promise<AdminShelterHistoryEvent[]> {
    return lastValueFrom(this.api.get<AdminShelterHistoryEvent[]>(`/admin/shelters/${id}/history`));
  }

  /**
   * POST /admin/shelters/{id}/request-info {message} -> 204. The
   * moderator→submitter information request: the submitter sees it on
   * their own row and answers once; the admin sees the request with the
   * reply on the shelter list. USER rows only (409 registry — import-
   * owned); 404 unknown id; 409 when the row already has a request (one
   * exchange per shelter — the replied row is kept).
   */
  requestInfo(id: number, message: string): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/shelters/${id}/request-info`, { message }));
  }

  /**
   * POST /admin/shelters/{id}/mark-inaccurate {reason?} -> 204. Sets the
   * public `inaccurate` flag on a USER shelter — the row stays visible
   * (status and trust state untouched). The reason is
   * optional (the audit row stores it when given; blank/absent stores
   * NULL). USER rows only (409 registry — import-owned); 404 unknown id;
   * idempotent (re-marking an already-marked row is a no-op that audits
   * nothing).
   */
  markInaccurate(id: number, reason?: string): Promise<void> {
    const trimmed = reason?.trim();
    return lastValueFrom(
      this.api.post<void>(
        `/admin/shelters/${id}/mark-inaccurate`,
        trimmed ? { reason: trimmed } : undefined,
      ),
    );
  }

  /**
   * POST /admin/shelters/{id}/clear-inaccurate -> 204.
   * Clears the flag — idempotent (clearing an unmarked row is a no-op). Same
   * 404/409 guards as the mark.
   */
  clearInaccurate(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/shelters/${id}/clear-inaccurate`));
  }

  /**
   * GET /admin/audit -> the moderation audit trail, newest first (the
   * backend's default newest-100 window). Shelter names are resolved at
   * read time (a deleted shelter's rows carry the "Deleted shelter" text).
   */
  listAudit(): Promise<AdminAuditRow[]> {
    return lastValueFrom(this.api.get<AdminAuditRow[]>('/admin/audit'));
  }

  /**
   * GET /admin/alerts -> the throttle-abuse alerts (abuse-limits),
   * newest first: the daily submission cap (429), the per-contact OTP
   * cap (429) and the near-duplicate rejection (409). Optional `limit`
   * (1..200, default 50 — the backend answers 400 outside). The ring is
   * in-memory on the backend, so it clears on a restart.
   */
  listAlerts(limit?: number): Promise<AdminAlertRow[]> {
    const suffix = limit === undefined ? '' : `?limit=${limit}`;
    return lastValueFrom(this.api.get<AdminAlertRow[]>(`/admin/alerts${suffix}`));
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

  /**
   * GET /admin/users -> the account list behind the Users tab: every
   * REGISTERED + ADMIN account, id-ordered, with its suspension state
   * (null = active).
   */
  listUsers(): Promise<AdminUserDto[]> {
    return lastValueFrom(this.api.get<AdminUserDto[]>('/admin/users'));
  }

  /**
   * POST /admin/users/{id}/suspend -> 204 (idempotent). Suspension stops
   * the account at the credential doors (login 403, refresh 403, in-flight
   * tokens 401); its shelters stay on the map. REGISTERED accounts only —
   * an admin/guest target answers 409, an unknown id 404.
   */
  suspendUser(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/users/${id}/suspend`));
  }

  /**
   * POST /admin/users/{id}/unsuspend -> 204 (idempotent). Restores login,
   * refresh rotation and in-flight tokens immediately (fresh lookups).
   */
  unsuspendUser(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/users/${id}/unsuspend`));
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
