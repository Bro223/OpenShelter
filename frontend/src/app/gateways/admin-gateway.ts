import { inject, Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
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
  AdminShelterReportFilters,
  AdminUserDto,
  CreateGuidancePostRequest,
  CreateGuidanceTranslationRequest,
  GuidanceTranslationDto,
  MediaAssetDto,
  PagedRows,
  ReviewShelterRequest,
  ReviewShelterResponse,
  ReorderGuidanceRequest,
  ShelterStatus,
  SiteTextEntryDto,
  UpdateGuidancePostRequest,
  UpdateGuidanceTranslationRequest,
} from '../core/models';
import { parseTotal } from '../shared/paging';

/**
 * The door to the /admin/* controller group (admin-moderation, plus the
 * crisis-guidance authoring + media-library endpoints). Every endpoint
 * requires the caller's JWT AND admin kind (backend re-checks the kind per
 * request — a fresh lookup, never a JWT claim: 401 anonymous, 403
 * non-admin, 409 registry-row writes). All methods return typed promises
 * and throw ApiError on failure (mapped centrally by ApiClient).
 *
 * The thirty-two methods, 1:1 (one line per public method below):
 *
 *   GET    /admin/shelters?status=&source=&q=&limit=&offset= -> AdminShelterDto[] (+ X-Total-Count)
 *   POST   /admin/shelters/{id}/status         -> 204 (USER rows only)
 *   POST   /admin/shelters/{id}/review         -> 200 {ok} (USER rows only)
 *   DELETE /admin/shelters/{id}                -> 204 (USER rows only)
 *   GET    /admin/shelters/{id}/history        -> AdminShelterHistoryEvent[]
 *   POST   /admin/shelters/{id}/request-info   -> 204 (USER rows only)
 *   POST   /admin/shelters/{id}/mark-inaccurate -> 204 (USER rows only)
 *   POST   /admin/shelters/{id}/clear-inaccurate -> 204 (USER rows only)
 *   GET    /admin/reports?shelterId=&excludeDismissed=&limit=&offset= -> AdminShelterReportDto[] (+ X-Total-Count)
 *   POST   /admin/reports/{id}/dismiss         -> 204 (idempotent)
 *   GET    /admin/audit?limit=&offset=         -> AdminAuditRow[] (+ X-Total-Count)
 *   GET    /admin/alerts?limit=                -> AdminAlertRow[] (newest 50)
 *   GET    /admin/users?limit=&offset=         -> AdminUserDto[] (+ X-Total-Count)
 *   POST   /admin/users/{id}/suspend           -> 204 (idempotent; REGISTERED only)
 *   POST   /admin/users/{id}/unsuspend         -> 204 (idempotent; REGISTERED only)
 *   GET    /admin/guidance                     -> AdminGuidancePostDto[] (drafts incl.)
 *   GET    /admin/guidance?locale=&q=&limit=&offset= -> AdminGuidancePostDto[] (+ X-Total-Count)
 *   GET    /admin/guidance/{id}                -> AdminGuidancePostDto
 *   POST   /admin/guidance                     -> AdminGuidancePostDto (200)
 *   PUT    /admin/guidance/{id}                -> AdminGuidancePostDto (200)
 *   POST   /admin/guidance/{id}/publish        -> 204 (idempotent)
 *   POST   /admin/guidance/{id}/unpublish      -> 204 (idempotent)
 *   DELETE /admin/guidance/{id}?confirm=true   -> 204 (confirm REQUIRED)
 *   PUT    /admin/guidance/order               -> 204 (manual order, full list)
 *   GET    /admin/guidance/{id}/translations   -> GuidanceTranslationDto[]
 *   POST   /admin/guidance/{id}/translations   -> GuidanceTranslationDto (200)
 *   PUT    /admin/guidance/{id}/translations/{locale} -> GuidanceTranslationDto (200)
 *   DELETE /admin/guidance/{id}/translations/{locale} -> 204 (no body)
 *   GET    /admin/media?limit=&offset=         -> MediaAssetDto[] (+ X-Total-Count, newest first)
 *   POST   /admin/media (multipart: file)      -> MediaAssetDto (201)
 *   DELETE /admin/media/{id}[?confirm=true]    -> MediaAssetDto (200; 409 in-use)
 *   PUT    /admin/site-texts                   -> 204 (batch of (key, locale) edits)
 */
@Injectable({ providedIn: 'root' })
export class AdminGateway {
  private readonly api = inject(ApiClient);

  /**
   * GET /admin/shelters — ALL rows incl. hidden (INACTIVE). `filters` are
   * optional; absent fields are omitted from the query string entirely
   * (the bare call is exactly `/admin/shelters`). `source` is the
   * frontend-facing grouping the backend speaks (REGISTRY = the Päästeamet
   * + municipality imports, USER = community submissions); `limit` (1..200)
   * and `offset` (>= 0) page the (filtered) list server-side. Returns the
   * page's rows PLUS the un-paged total (the X-Total-Count header).
   */
  listShelters(filters?: AdminShelterFilters): Promise<PagedRows<AdminShelterDto>> {
    return lastValueFrom(
      this.api.getWithHeaders<AdminShelterDto[]>(adminSheltersPath(filters)),
    ).then((result) => pagedResult(result.body, result.headers));
  }

  /**
   * POST /admin/shelters/{id}/status {status} -> 204. Manual hide/restore.
   * USER rows only — a registry row answers 409 (import-owned) and the
   * page surfaces the server message; the UI never offers these actions for
   * registry rows in the first place.
   */
  setShelterStatus(id: number, status: ShelterStatus): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/shelters/${id}/status`, { status }));
  }

  /**
   * POST /admin/shelters/{id}/review {action, reason?} -> 200 {ok:true}.
   * The rare MANUAL trust override (community-review-queue) — the
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
   * GET /admin/audit -> the moderation audit trail, newest first.
   * Shelter names are resolved at read time (a deleted shelter's rows
   * carry the "Deleted shelter" text). Optional `limit` (1..200; absent
   * = the backend's default 100) / `offset` page the trail
   * server-side; the un-paged length comes back as the X-Total-Count
   * header.
   */
  listAudit(options?: AdminListPageOptions): Promise<PagedRows<AdminAuditRow>> {
    return lastValueFrom(
      this.api.getWithHeaders<AdminAuditRow[]>(adminListPagePath('/admin/audit', options)),
    ).then((result) => pagedResult(result.body, result.headers));
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
   * Optional `shelterId` narrows to one shelter. `excludeDismissed`
   * hides the dismissed (resolved) rows — the moderator's hide-dismissed
   * control; absent = everything renders (nothing is hidden silently).
   * `limit` (1..200; absent = the backend's default 100) / `offset` page
   * the (filtered) queue server-side. Returns the page's rows PLUS the
   * un-paged (filtered) total (the X-Total-Count header — the OPEN count
   * when the filter is on, which is the sum of the per-shelter open
   * counts the pins express).
   */
  listShelterReports(
    filters?: AdminShelterReportFilters,
  ): Promise<PagedRows<AdminShelterReportDto>> {
    return lastValueFrom(
      this.api.getWithHeaders<AdminShelterReportDto[]>(adminReportsPath(filters)),
    ).then((result) => pagedResult(result.body, result.headers));
  }

  /** POST /admin/reports/{id}/dismiss -> 204. Idempotent (no-op if done). */
  dismissShelterReport(id: number): Promise<void> {
    return lastValueFrom(this.api.post<void>(`/admin/reports/${id}/dismiss`));
  }

  /**
   * GET /admin/users -> the account list behind the Users tab: every
   * REGISTERED + ADMIN account, id-ordered, with its suspension state
   * (null = active). Optional `limit` (1..200; absent = the whole list)
   * / `offset` page it server-side; the un-paged population comes back
   * as the X-Total-Count header.
   */
  listUsers(options?: AdminListPageOptions): Promise<PagedRows<AdminUserDto>> {
    return lastValueFrom(
      this.api.getWithHeaders<AdminUserDto[]>(adminListPagePath('/admin/users', options)),
    ).then((result) => pagedResult(result.body, result.headers));
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
  // Guidance (crisis-guidance): the authoring endpoints
  // ------------------------------------------------------------------

  /**
   * GET /admin/guidance?locale=&q=&limit=&offset= -> PagedRows — the paged,
   * searched admin list (admin-guidance-search / admin-page-size). The
   * search filter runs over the RENDERED content (scoped: the locale's
   * row or the home columns; unscoped: ANY locale content), and
   * limit/offset then slice the FILTERED stored manual order — the order
   * is never re-sorted by the search. The un-paged total (the filtered
   * length) comes back as the X-Total-Count header; the bounds are the
   * public guidance's (limit 1..200, offset >= 0 — a 400 outside).
   */
  listGuidancePostsPage(
    options: GuidanceAdminListOptions,
  ): Promise<PagedRows<AdminGuidancePostDto>> {
    return lastValueFrom(
      this.api.getWithHeaders<AdminGuidancePostDto[]>(guidanceListPagePath(options)),
    ).then((result) => pagedResult(result.body, result.headers));
  }

  /**
   * GET /admin/guidance/{id} -> AdminGuidancePostDto — the id-keyed detail
   * (the admin form edits by id — a draft has a slug, but the form never
   * navigates by it). 404 unknown id. Scoped (admin-locale-scope, `locale`
   * given): the DTO carries that locale's content; a post without content in
   * the locale answers the same 404 as an unknown id.
   */
  getGuidancePost(id: number, locale?: string): Promise<AdminGuidancePostDto> {
    return lastValueFrom(
      this.api.get<AdminGuidancePostDto>(`/admin/guidance/${id}` + localeQuery(locale)),
    );
  }

  /**
   * POST /admin/guidance -> 200 with the created post. DRAFT by default;
   * an explicit status PUBLISHED publishes in one call. 400 validation
   * (title/body required, the alt/hero pairing, the slug shape); 409 an
   * admin-supplied slug another post already holds (naming the slug); 404
   * a heroImageId with no such asset. The hero import (`heroImportUrl`,
   * guidance-hero-import): the server fetches, validates and stores the
   * image AT SAVE (this create call — draft and one-shot PUBLISHED
   * alike). A failed import never blocks the create: the post is stored
   * anyway and the 200 body's `heroImportError` names the failure (the
   * URL is kept for a retry on the next save).
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
   * 404 unknown id (or a heroImageId with no such asset). `heroImportUrl`
   * (guidance-hero-import): a blank/absent value CLEARS the import URL
   * (full replace); a non-null URL is fetched, validated and stored AT
   * SAVE, draft or published alike (the trigger) — a changed URL
   * re-imports. A failed import never blocks the update: the 200 body's
   * `heroImportError` names it and the URL is kept for a retry.
   *
   * <p>Scoped (admin-locale-scope, `locale` given): the content fields
   * (title/slug/body/hero alt) are written to THAT locale's translation row
   * while the post-level fields (pinned, the hero reference, the import
   * URL) stay shared on the post. `request.locale` is the post's HOME
   * (a foreign-locale edit never moves it — a different declaration is a
   * 400); a post without a translation in the locale 404s.
   */
  updateGuidancePost(
    id: number,
    request: UpdateGuidancePostRequest,
    locale?: string,
  ): Promise<AdminGuidancePostDto> {
    return lastValueFrom(
      this.api.put<AdminGuidancePostDto>(`/admin/guidance/${id}` + localeQuery(locale), request),
    );
  }

  /**
   * POST /admin/guidance/{id}/publish -> 204 (no body). Stamps publishedAt
   * from the server clock (a re-publish stamps a FRESH instant);
   * idempotent — an already-published post is a 204 no-op that writes no
   * audit row. 404 unknown id. The hero import moved to SAVE time (the
   * trigger): this call never fetches, validates or stores
   * anything — a post with an unimported or failed hero URL publishes
   * exactly as stored, so publishing is never the moment an image can
   * fail for the first time.
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

  /**
   * PUT /admin/guidance/order -> 204 (no body) — the MANUAL ordering
   * (guidance-manual-order): UNSCOPED (no `locale`): the FULL ordered id
   * list of every guidance post, exactly the order the admin table shows it
   * (pinned block first, then the rest) — the server validates the list as a
   * permutation of all post ids BEFORE writing — an unknown id, a duplicate,
   * or a stale (short) list 400s with nothing written — then renumbers the
   * positions 1..N in one transaction (all-or-nothing). SCOPED (admin-locale-
   * scope, `locale` given): the FULL ordered id list of the posts VISIBLE IN
   * that locale — the slot-preserving algorithm: the visible posts are
   * rewritten into their slots of the GLOBAL order (sort_order asc, then the
   * published_at / id tie-breakers) in the submitted order; posts not visible
   * in the locale keep their values (the other languages are not disturbed),
   * and the values stop being a contiguous 1..N. Resubmitting the confirmed
   * order is a 204 no-op with no audit row; a changing reorder writes one
   * GUIDANCE_REORDER row (named with the locale when scoped).
   */
  reorderGuidanceOrder(postIds: number[], locale?: string): Promise<void> {
    const body: ReorderGuidanceRequest = { postIds };
    return lastValueFrom(this.api.put<void>(`/admin/guidance/order${localeQuery(locale)}`, body));
  }

  /**
   * GET /admin/guidance/{id}/translations -> GuidanceTranslationDto[] —
   * the post's translations in locale order (the admin alternates editor;
   * the source of the public detail's `alternates` map). The post's
   * own-locale row is always present. 404 unknown id.
   */
  listGuidanceTranslations(id: number): Promise<GuidanceTranslationDto[]> {
    return lastValueFrom(
      this.api.get<GuidanceTranslationDto[]>(`/admin/guidance/${id}/translations`),
    );
  }

  /**
   * POST /admin/guidance/{id}/translations -> 200 with the created
   * translation. Creates a translation of the post in a NEW locale: the
   * slug is generated from the title when omitted (a given slug must be
   * free WITHIN the locale). 409 the post already has a translation in
   * that locale, or the (locale, slug) pair is taken (naming the slug);
   * 400 validation (title/body required, locale required, the slug shape);
   * 404 unknown id.
   */
  createGuidanceTranslation(
    id: number,
    request: CreateGuidanceTranslationRequest,
  ): Promise<GuidanceTranslationDto> {
    return lastValueFrom(
      this.api.post<GuidanceTranslationDto>(`/admin/guidance/${id}/translations`, request),
    );
  }

  /**
   * PUT /admin/guidance/{id}/translations/{locale} -> 200 with the
   * updated translation. Full replace of the translation named by the PATH
   * locale (the locale never moves here): the slug is KEPT when omitted
   * (a given slug another translation in the locale holds → 409 naming
   * it); the body is re-sanitized server-side (the stored value is the
   * sanitizer output). 400 validation; 404 unknown post or locale.
   */
  updateGuidanceTranslation(
    id: number,
    locale: string,
    request: UpdateGuidanceTranslationRequest,
  ): Promise<GuidanceTranslationDto> {
    return lastValueFrom(
      this.api.put<GuidanceTranslationDto>(`/admin/guidance/${id}/translations/${locale}`, request),
    );
  }

  /**
   * DELETE /admin/guidance/{id}/translations/{locale} -> 204 (no body).
   * Deletes the translation named by the PATH locale. The post's HOME-locale
   * translation cannot be deleted (400 — unpublish or delete the post
   * instead); the post itself and its other translations stay. 404 unknown
   * post or locale. The UI's two-tap confirm precedes the call (there is
   * no confirm query parameter on this endpoint — the confirm is in the UI).
   */
  deleteGuidanceTranslation(id: number, locale: string): Promise<void> {
    return lastValueFrom(this.api.delete<void>(`/admin/guidance/${id}/translations/${locale}`));
  }

  // ------------------------------------------------------------------
  // Media library (crisis-guidance): the asset inventory
  // ------------------------------------------------------------------

  /**
   * GET /admin/media -> MediaAssetDto[] — the asset inventory, newest
   * first, with the serving URL, dimensions, size, upload date and the
   * reused-by-post count (0 for an unused asset — the library is the
   * admin's inventory). Optional `limit` (1..200; absent = no paging) /
   * `offset` page the newest-first order server-side; the un-paged
   * library size comes back as the X-Total-Count header.
   */
  listMediaAssets(options?: AdminListPageOptions): Promise<PagedRows<MediaAssetDto>> {
    return lastValueFrom(
      this.api.getWithHeaders<MediaAssetDto[]>(adminListPagePath('/admin/media', options)),
    ).then((result) => pagedResult(result.body, result.headers));
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

  /**
   * The site texts (site_texts): save the admin's edits. A blank `value`
   * resets that (key, locale) to the shipped default (the server deletes
   * the row); a blank `url` on a link key resets to the shipped default
   * URL. The server 400s unknown keys, non-https URLs, urls on non-link
   * keys and oversized values — the admin page surfaces the message.
   */
  putSiteTexts(entries: SiteTextEntryDto[]): Promise<void> {
    return lastValueFrom(this.api.put<void>('/admin/site-texts', { texts: entries }));
  }
}

/**
 * The list query string: fixed order (status, source, q), only the fields
 * actually set appear (no trailing `&`, no empty values). `q` is a free
 * name/address substring — URL-encoded.
 */
/**
 * The optional `?locale=` scope (admin-locale-scope) — empty string when
 * absent (the unscoped, legacy read).
 */
function localeQuery(locale?: string): string {
  return locale ? `?locale=${encodeURIComponent(locale)}` : '';
}

/** The paged admin guidance list's options (absent = omitted from the URL). */
export interface GuidanceAdminListOptions {
  locale?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

/**
 * GET /admin/guidance?locale=&q=&limit=&offset= — fixed param order
 * (locale, q, limit, offset), only the fields actually set appear.
 */
function guidanceListPagePath(options: GuidanceAdminListOptions): string {
  const params: string[] = [];
  if (options.locale) {
    params.push(`locale=${encodeURIComponent(options.locale)}`);
  }
  if (options.q !== undefined && options.q !== '') {
    params.push(`q=${encodeURIComponent(options.q)}`);
  }
  if (options.limit !== undefined) {
    params.push(`limit=${options.limit}`);
  }
  if (options.offset !== undefined) {
    params.push(`offset=${options.offset}`);
  }
  return params.length > 0 ? `/admin/guidance?${params.join('&')}` : '/admin/guidance';
}

/**
 * The paged admin lists' options (absent = omitted from the URL — the
 * endpoint's own default, whole list or default page).
 */
export interface AdminListPageOptions {
  limit?: number;
  offset?: number;
}

/** GET /admin/{audit|users|media}?limit=&offset= — only the fields set. */
function adminListPagePath(base: string, options?: AdminListPageOptions): string {
  const params: string[] = [];
  if (options?.limit !== undefined) {
    params.push(`limit=${options.limit}`);
  }
  if (options?.offset !== undefined) {
    params.push(`offset=${options.offset}`);
  }
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
}

/**
 * GET /admin/reports?shelterId=&excludeDismissed=&limit=&offset= —
 * fixed param order, only the fields actually set appear.
 */
function adminReportsPath(filters?: AdminShelterReportFilters): string {
  const params: string[] = [];
  if (filters?.shelterId !== undefined) {
    params.push(`shelterId=${filters.shelterId}`);
  }
  if (filters?.excludeDismissed) {
    params.push('excludeDismissed=true');
  }
  if (filters?.limit !== undefined) {
    params.push(`limit=${filters.limit}`);
  }
  if (filters?.offset !== undefined) {
    params.push(`offset=${filters.offset}`);
  }
  return params.length > 0 ? `/admin/reports?${params.join('&')}` : '/admin/reports';
}
function pagedResult<T>(body: T[], headers: HttpHeaders): PagedRows<T> {
  return {
    rows: body,
    total: parseTotal(headers.get('X-Total-Count'), body.length),
  };
}

function adminSheltersPath(filters?: AdminShelterFilters): string {
  const params: string[] = [];
  if (filters?.source !== undefined) {
    params.push(`source=${filters.source}`);
  }
  if (filters?.q !== undefined && filters.q !== '') {
    params.push(`q=${encodeURIComponent(filters.q)}`);
  }
  if (filters?.limit !== undefined) {
    params.push(`limit=${filters.limit}`);
  }
  if (filters?.offset !== undefined) {
    params.push(`offset=${filters.offset}`);
  }
  return params.length > 0 ? `/admin/shelters?${params.join('&')}` : '/admin/shelters';
}
