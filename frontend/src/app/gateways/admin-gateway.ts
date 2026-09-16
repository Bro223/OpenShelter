import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  AdminAlertRow,
  AdminAuditRow,
  AdminGuidancePostDto,
  AdminShelterDto,
  AdminShelterFilters,
  AdminShelterHistoryEvent,
  AdminShelterReportDto,
  AdminUserDto,
  CreateGuidancePostRequest,
  MediaAssetDto,
  ReviewShelterRequest,
  ReviewShelterResponse,
  ShelterStatus,
  UpdateGuidancePostRequest,
} from '../core/models';

/**
 * The door to the /admin/* controller group (admin-moderation D3, plus the
 * crisis-guidance D3 authoring + media-library endpoints). Every endpoint
 * requires the caller's JWT AND admin kind (backend re-checks the kind per
 * request — a fresh lookup, never a JWT claim: 401 anonymous, 403
 * non-admin, 409 registry-row writes). All methods return typed promises
 * and throw ApiError on failure (mapped centrally by ApiClient).
 *
 * The twenty-five endpoints, 1:1:
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
 *   GET    /admin/guidance                     -> AdminGuidancePostDto[] (drafts incl.)
 *   GET    /admin/guidance/{id}                -> AdminGuidancePostDto
 *   POST   /admin/guidance                     -> AdminGuidancePostDto (200)
 *   PUT    /admin/guidance/{id}                -> AdminGuidancePostDto (200)
 *   POST   /admin/guidance/{id}/publish        -> 204 (idempotent)
 *   POST   /admin/guidance/{id}/unpublish      -> 204 (idempotent)
 *   DELETE /admin/guidance/{id}?confirm=true   -> 204 (confirm REQUIRED)
 *   GET    /admin/media                        -> MediaAssetDto[] (newest first)
 *   POST   /admin/media (multipart: file)      -> MediaAssetDto (201)
 *   DELETE /admin/media/{id}[?confirm=true]    -> MediaAssetDto (200; 409 in-use)
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

  // ------------------------------------------------------------------
  // Guidance (crisis-guidance D3/D4): the authoring endpoints
  // ------------------------------------------------------------------

  /**
   * GET /admin/guidance -> AdminGuidancePostDto[] — every post, drafts
   * included, newest-updated first (the list renders in the server's
   * order — no client sort). The stored (sanitized) bodyHtml is returned
   * — the editor round-trips what is stored.
   */
  listGuidancePosts(): Promise<AdminGuidancePostDto[]> {
    return lastValueFrom(this.api.get<AdminGuidancePostDto[]>('/admin/guidance'));
  }

  /**
   * GET /admin/guidance/{id} -> AdminGuidancePostDto — the id-keyed detail
   * (the admin form edits by id — a draft has a slug, but the form never
   * navigates by it). 404 unknown id.
   */
  getGuidancePost(id: number): Promise<AdminGuidancePostDto> {
    return lastValueFrom(this.api.get<AdminGuidancePostDto>(`/admin/guidance/${id}`));
  }

  /**
   * POST /admin/guidance -> 200 with the created post. DRAFT by default;
   * an explicit status PUBLISHED publishes in one call. 400 validation
   * (title/body required, the alt/hero pairing, the slug shape); 409 an
   * admin-supplied slug another post already holds (naming the slug); 404
   * a heroImageId with no such asset.
   */
  createGuidancePost(request: CreateGuidancePostRequest): Promise<AdminGuidancePostDto> {
    return lastValueFrom(this.api.post<AdminGuidancePostDto>('/admin/guidance', request));
  }

  /**
   * PUT /admin/guidance/{id} -> 200 with the updated post. Full replace of
   * the editable fields; the slug is kept when omitted (a given slug that
   * another post holds → 409 naming it); the body is re-sanitized
   * server-side (the stored value is the sanitizer output). The
   * publication state is NOT editable here — publish/unpublish own it.
   * 404 unknown id (or a heroImageId with no such asset).
   */
  updateGuidancePost(id: number, request: UpdateGuidancePostRequest): Promise<AdminGuidancePostDto> {
    return lastValueFrom(this.api.put<AdminGuidancePostDto>(`/admin/guidance/${id}`, request));
  }

  /**
   * POST /admin/guidance/{id}/publish -> 204 (no body). Stamps publishedAt
   * from the server clock (a re-publish stamps a FRESH instant);
   * idempotent — an already-published post is a 204 no-op that writes no
   * audit row. 404 unknown id.
   */
  publishGuidancePost(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/guidance/${id}/publish`));
  }

  /**
   * POST /admin/guidance/{id}/unpublish -> 204 (no body). Back to DRAFT,
   * publishedAt cleared (the public surface no longer exposes it);
   * idempotent. 404 unknown id.
   */
  unpublishGuidancePost(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/guidance/${id}/unpublish`));
  }

  /**
   * DELETE /admin/guidance/{id}?confirm=true -> 204 (no body). The confirm
   * query parameter is REQUIRED (400 without it) — the UI's two-tap
   * confirm precedes the call, so the gateway always sends it. The post's
   * media assets stay in the library (uploads are inventory, not
   * garbage) and its audit rows keep their label snapshot. 404 unknown id.
   */
  deleteGuidancePost(id: number): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/admin/guidance/${id}?confirm=true`));
  }

  // ------------------------------------------------------------------
  // Media library (crisis-guidance D7/D8): the asset inventory
  // ------------------------------------------------------------------

  /**
   * GET /admin/media -> MediaAssetDto[] — every asset newest-first, with
   * the serving URL, dimensions, size, upload date and the reused-by-post
   * count (0 for an unused asset — the library is the admin's inventory).
   */
  listMediaAssets(): Promise<MediaAssetDto[]> {
    return lastValueFrom(this.api.get<MediaAssetDto[]>('/admin/media'));
  }

  /**
   * POST /admin/media -> 201 with the stored asset. Multipart (field name:
   * `file`); the FormData body is sent as-is — Angular's HttpClient sets
   * the multipart/form-data content type (with its boundary) for FormData
   * bodies, so no explicit headers. 400 not a readable JPEG/PNG/WebP, or
   * the declared type contradicts the bytes; 413 over the size cap (the
   * server message names the cap — no partial file is left behind).
   */
  uploadMediaAsset(file: File): Promise<MediaAssetDto> {
    const form = new FormData();
    form.append('file', file);
    return lastValueFrom(this.api.post<MediaAssetDto>('/admin/media', form));
  }

  /**
   * DELETE /admin/media/{id} -> 200 with the pre-delete asset snapshot.
   * With `confirm=false` (the default) an unreferenced asset deletes
   * straight; a still-referenced one answers 409 naming the affected
   * posts (nothing deleted) — the UI turns that answer into its confirm
   * step and re-issues with `confirm=true`, which clears BOTH
   * hero_image_id and hero_image_alt on every referencing post in the
   * same transaction (the posts still render, with no image). 404 unknown
   * id.
   */
  deleteMediaAsset(id: number, confirm: boolean): Promise<MediaAssetDto> {
    const path = confirm ? `/admin/media/${id}?confirm=true` : `/admin/media/${id}`;
    return lastValueFrom(this.api.delete<MediaAssetDto>(path));
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
