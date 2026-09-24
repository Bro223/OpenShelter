import { TestBed } from '@angular/core/testing';
import { HttpHeaders } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type {
  AdminGuidancePostDto,
  AdminShelterDto,
  CreateGuidancePostRequest,
  CreateGuidanceTranslationRequest,
  GuidanceTranslationDto,
  MediaAssetDto,
  UpdateGuidancePostRequest,
  UpdateGuidanceTranslationRequest,
} from '../core/models';
import { AdminGateway } from './admin-gateway';

const SHELTER_ROW: AdminShelterDto = {
  id: 7,
  name: 'Kommunaali Varjend',
  address: null,
  source: 'USER',
  status: 'INACTIVE',
  nonexistentReports: 3,
  occupancy: { band: 'FULL', lastReportedAt: '2025-09-01T08:00:00Z', reportCount: 2 },
  capacity: 12,
  submitter: 'Kaja K.',
  reviewStatus: 'NEW',
  reviewNote: null,
  locationKind: 'PUBLIC',
  // INACTIVE + NEW + only 3 reports: the derivation falls through to the
  // trust-state value (below the auto-hide threshold).
  infoRequest: null, // no moderator question on this row
  inaccurate: false, // no mark on this row
};

/** Hand-written fake ApiClient — the gateway must only pick paths/bodies (01-TASK.md §8). */
class FakeApiClient {
  get = vi.fn();
  getWithHeaders = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('AdminGateway', () => {
  let gateway: AdminGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(AdminGateway);
  });

  // ---- GET /admin/shelters -----------------------------------------------------

  it('listShelters GETs the bare /admin/shelters and reads the total from the header', async () => {
    // The header says 25 even though the page carries one row — the total
    // must come from X-Total-Count, not the page length.
    api.getWithHeaders.mockReturnValue(
      of({ body: [SHELTER_ROW], headers: new HttpHeaders({ 'X-Total-Count': '25' }) }),
    );

    const paged = await gateway.listShelters();

    expect(api.getWithHeaders).toHaveBeenCalledTimes(1);
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/shelters');
    expect(paged).toEqual({ rows: [SHELTER_ROW], total: 25 });
  });

  it('listShelters appends only the filters that are set, in a fixed order (page params last)', async () => {
    api.getWithHeaders.mockReturnValue(of({ body: [], headers: new HttpHeaders() }));

    await gateway.listShelters({
      source: 'USER',
      q: 'kelder',
      limit: 10,
      offset: 20,
    });

    expect(api.getWithHeaders).toHaveBeenCalledWith(
      '/admin/shelters?source=USER&q=kelder&limit=10&offset=20',
    );
  });

  it('listShelters URL-encodes the q substring and skips empty values', async () => {
    api.getWithHeaders.mockReturnValue(of({ body: [], headers: new HttpHeaders() }));

    await gateway.listShelters({ q: 'a b & c' });

    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/shelters?q=a%20b%20%26%20c');

    api.getWithHeaders.mockClear();
    await gateway.listShelters({ q: '' });
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/shelters');
  });

  it('listShelters falls back to the page length when the total header is absent', async () => {
    api.getWithHeaders.mockReturnValue(of({ body: [SHELTER_ROW], headers: new HttpHeaders() }));

    const paged = await gateway.listShelters();

    expect(paged).toEqual({ rows: [SHELTER_ROW], total: 1 });
  });

  it('listShelters rejects with ApiError when the caller is not admin (403)', async () => {
    const failure = ApiError.fromHttp(
      403,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 403,
        error: 'Forbidden',
        message: 'admin access required',
        path: '/admin/shelters',
      },
      '/admin/shelters',
    );
    api.getWithHeaders.mockReturnValue(throwError(() => failure));

    await expect(gateway.listShelters()).rejects.toBe(failure);
  });

  // ---- POST /admin/shelters/{id}/status ----------------------------------------

  it('setShelterStatus POSTs the status body and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await expect(gateway.setShelterStatus(7, 'INACTIVE')).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/status', { status: 'INACTIVE' });
  });

  it('setShelterStatus rejects with the 409 when the row is registry-owned', async () => {
    const failure = ApiError.fromHttp(
      409,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'registry rows are import-owned',
        path: '/admin/shelters/9/status',
      },
      '/admin/shelters/9/status',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.setShelterStatus(9, 'ACTIVE')).rejects.toBe(failure);
  });

  // ---- DELETE /admin/shelters/{id} ---------------------------------------------

  it('deleteShelter issues DELETE /admin/shelters/{id} and resolves with no body (204)', async () => {
    api.delete.mockReturnValue(of(undefined));

    const result = await gateway.deleteShelter(7);

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/admin/shelters/7');
    expect(result).toBeUndefined();
  });

  it('deleteShelter rejects with ApiError on an unknown shelter (404)', async () => {
    const failure = ApiError.fromHttp(
      404,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 404,
        error: 'Not Found',
        message: 'shelter not found',
        path: '/admin/shelters/999',
      },
      '/admin/shelters/999',
    );
    api.delete.mockReturnValue(throwError(() => failure));

    await expect(gateway.deleteShelter(999)).rejects.toBe(failure);
  });

  // ---- GET /admin/reports ---------------------------------------------------------

  it('listShelterReports GETs the bare queue and reads the total from the header', async () => {
    // The header says 4 even though the page carries no row — the total
    // must come from X-Total-Count, not the page length.
    api.getWithHeaders.mockReturnValue(
      of({ body: [], headers: new HttpHeaders({ 'X-Total-Count': '4' }) }),
    );

    const paged = await gateway.listShelterReports();

    expect(api.getWithHeaders).toHaveBeenCalledTimes(1);
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/reports');
    expect(paged).toEqual({ rows: [], total: 4 });
  });

  it('listShelterReports appends only the filters that are set, in a fixed order (page params last)', async () => {
    api.getWithHeaders.mockReturnValue(of({ body: [], headers: new HttpHeaders() }));

    await gateway.listShelterReports({
      shelterId: 7,
      excludeDismissed: true,
      limit: 10,
      offset: 20,
    });

    expect(api.getWithHeaders).toHaveBeenCalledWith(
      '/admin/reports?shelterId=7&excludeDismissed=true&limit=10&offset=20',
    );

    // The default scope: excludeDismissed=false is the ABSENCE of the
    // param (the omit-defaults convention — 'All' hides nothing).
    api.getWithHeaders.mockClear();
    await gateway.listShelterReports({ excludeDismissed: false, limit: 20, offset: 0 });
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/reports?limit=20&offset=0');
  });

  it('dismissShelterReport POSTs the row id and resolves with no body (idempotent 204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await expect(gateway.dismissShelterReport(101)).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/reports/101/dismiss');
  });

  it('rejects with ApiError on a network failure', async () => {
    const failure = ApiError.fromNetwork();
    api.getWithHeaders.mockReturnValue(throwError(() => failure));

    await expect(gateway.listShelterReports()).rejects.toBe(failure);
  });

  // ---- POST /admin/shelters/{id}/review | GET /admin/audit -------------------------

  it('reviewShelter POSTs the review action to /admin/shelters/{id}/review', async () => {
    api.post.mockReturnValue(of({ ok: true }));

    const res = await gateway.reviewShelter(7, { action: 'CONFIRM' });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/review', { action: 'CONFIRM' });
    expect(res).toEqual({ ok: true });
  });

  it('reviewShelter includes the optional reason in the body', async () => {
    api.post.mockReturnValue(of({ ok: true }));

    await gateway.reviewShelter(7, { action: 'REJECT', reason: 'Could not verify' });

    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/review', {
      action: 'REJECT',
      reason: 'Could not verify',
    });
  });

  it('reviewShelter rejects with the 409 concurrency conflict', async () => {
    const failure = ApiError.fromHttp(
      409,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'shelter state changed, reload',
        path: '/admin/shelters/7/review',
      },
      '/admin/shelters/7/review',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.reviewShelter(7, { action: 'CONFIRM' })).rejects.toBe(failure);
  });

  it('listAudit GETs the paged moderation trail (newest first) and reads the total from the header', async () => {
    const row = {
      id: 9001,
      createdAt: '2026-07-18T12:00:00Z',
      moderatorName: 'Anu T.',
      shelterId: 7,
      shelterName: 'Community Cellar',
      action: 'CONFIRM' as const,
      previousStatus: 'NEW' as const,
      newStatus: 'CONFIRMED' as const,
      reason: null,
    };
    api.getWithHeaders.mockReturnValue(
      of({ body: [row], headers: new HttpHeaders({ 'X-Total-Count': '137' }) }),
    );

    const paged = await gateway.listAudit({ limit: 20, offset: 0 });

    expect(api.getWithHeaders).toHaveBeenCalledTimes(1);
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/audit?limit=20&offset=0');
    expect(paged).toEqual({ rows: [row], total: 137 });
  });

  // ---- GET /admin/alerts -------------------------------------------------------------

  it('listAlerts GETs the default newest-50 alert ring', async () => {
    const row = {
      id: 41,
      kind: 'submission-daily-cap' as const,
      subject: 'user:77',
      detail: 'Daily shelter-submission cap reached (429)',
      retryAfterSeconds: 8321,
      at: '2026-09-13T08:00:00Z',
    };
    api.get.mockReturnValue(of([row]));

    const rows = await gateway.listAlerts();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/alerts');
    expect(rows).toEqual([row]);
  });

  it('listAlerts appends the limit query when given', async () => {
    api.get.mockReturnValue(of([]));

    await gateway.listAlerts(10);

    expect(api.get).toHaveBeenCalledWith('/admin/alerts?limit=10');
  });

  // ---- user suspension ------------------------------------------------------

  it('listUsers GETs the paged /admin/users and reads the total from the header', async () => {
    const row = {
      id: 301,
      name: 'Siht',
      email: 'siht@example.ee',
      kind: 'REGISTERED' as const,
      suspendedAt: null,
    };
    api.getWithHeaders.mockReturnValue(
      of({ body: [row], headers: new HttpHeaders({ 'X-Total-Count': '42' }) }),
    );

    const paged = await gateway.listUsers({ limit: 20, offset: 0 });

    expect(api.getWithHeaders).toHaveBeenCalledTimes(1);
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/users?limit=20&offset=0');
    expect(paged).toEqual({ rows: [row], total: 42 });
  });

  it('suspendUser POSTs /admin/users/{id}/suspend and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.suspendUser(301);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/users/301/suspend');
  });

  it('unsuspendUser POSTs /admin/users/{id}/unsuspend and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.unsuspendUser(301);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/users/301/unsuspend');
  });

  // ---- GET /admin/shelters/{id}/history ----

  it('listShelterHistory GETs /admin/shelters/{id}/history (ascending, server-parsed)', async () => {
    const events = [
      {
        id: 1,
        shelterName: 'Kommunaali Varjend',
        actorName: 'Kaja K.',
        action: 'CREATED' as const,
        changes: [],
        createdAt: '2026-09-01T09:00:00Z',
      },
      {
        id: 2,
        shelterName: 'Kommunaali Varjend',
        actorName: 'Kaja K.',
        action: 'EDITED' as const,
        changes: [{ field: 'capacity', from: null, to: '12' }],
        createdAt: '2026-09-02T09:00:00Z',
      },
    ];
    api.get.mockReturnValue(of(events));

    const rows = await gateway.listShelterHistory(7);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/shelters/7/history');
    expect(rows).toEqual(events);
  });

  // ---- POST /admin/shelters/{id}/request-info ----

  it('requestInfo POSTs the message to /admin/shelters/{id}/request-info and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.requestInfo(7, 'Kas varjund on avatud?');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/request-info', {
      message: 'Kas varjund on avatud?',
    });
  });

  // ---- POST /admin/shelters/{id}/mark-inaccurate + clear-inaccurate ----

  it('markInaccurate POSTs the reason to /admin/shelters/{id}/mark-inaccurate and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.markInaccurate(7, 'Uks on suletud');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/mark-inaccurate', {
      reason: 'Uks on suletud',
    });
  });

  it('markInaccurate without a reason POSTs no body (the audit row stores NULL)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.markInaccurate(7);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/mark-inaccurate', undefined);
  });

  it('clearInaccurate POSTs to /admin/shelters/{id}/clear-inaccurate and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.clearInaccurate(7);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/shelters/7/clear-inaccurate');
  });

  // ---- GET /admin/guidance ----------------------------------------------------------------

  const GUIDANCE_ROW: AdminGuidancePostDto = {
    id: 11,
    slug: 'varjumine-droonirunnaku-ajal',
    title: 'Varjumine droonirünnaku ajal',
    bodyHtml: '<p>Pöördu peavarjendisse.</p>',
    locale: 'et',
    homeLocale: 'et',
    status: 'PUBLISHED',
    pinned: true,
    sortOrder: 1,
    heroImageId: 5,
    heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
    heroImageAlt: 'Kelder, vaade sissepääsust',
    heroImportUrl: null,
    createdBy: 1,
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
  };

  it('getGuidancePost with a locale GETs /admin/guidance/{id}?locale= (the locale-scoped detail)', async () => {
    api.get.mockReturnValue(of(GUIDANCE_ROW));

    const row = await gateway.getGuidancePost(11, 'ru');

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/guidance/11?locale=ru');
    expect(row).toEqual(GUIDANCE_ROW);
  });

  it('getGuidancePost GETs /admin/guidance/{id} (the id-keyed detail)', async () => {
    api.get.mockReturnValue(of(GUIDANCE_ROW));

    const row = await gateway.getGuidancePost(11);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/guidance/11');
    expect(row).toEqual(GUIDANCE_ROW);
  });

  // ---- POST /admin/guidance ------------------------------------------------

  const CREATE_REQUEST: CreateGuidancePostRequest = {
    title: 'Varjumine droonirünnaku ajal',
    body: '<p>Pöördu peavarjendisse.</p>',
    locale: 'et',
    pinned: true,
    heroImageId: 5,
    heroImageAlt: 'Kelder, vaade sissepääsust',
    status: 'DRAFT',
  };

  it('createGuidancePost POSTs the body to /admin/guidance and resolves with the created post (200)', async () => {
    api.post.mockReturnValue(of(GUIDANCE_ROW));

    const row = await gateway.createGuidancePost(CREATE_REQUEST);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/guidance', CREATE_REQUEST);
    expect(row).toEqual(GUIDANCE_ROW);
  });

  it('createGuidancePost omits blank slug/locale and sends null hero fields (no hero)', async () => {
    api.post.mockReturnValue(
      of({ ...GUIDANCE_ROW, heroImageId: null, heroImageUrl: null, heroImageAlt: null }),
    );

    await gateway.createGuidancePost({
      title: 'Uus post',
      body: '<p>Keha</p>',
      pinned: false,
      heroImageId: null,
      heroImageAlt: null,
      status: 'PUBLISHED',
    });

    expect(api.post).toHaveBeenCalledWith('/admin/guidance', {
      title: 'Uus post',
      body: '<p>Keha</p>',
      pinned: false,
      heroImageId: null,
      heroImageAlt: null,
      status: 'PUBLISHED',
    });
  });

  it('createGuidancePost rejects with the 409 when the slug is already held (naming the slug)', async () => {
    const failure = ApiError.fromHttp(
      409,
      {
        timestamp: '2026-09-05T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'slug "varjumine" is already in use',
        path: '/admin/guidance',
      },
      '/admin/guidance',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.createGuidancePost(CREATE_REQUEST)).rejects.toBe(failure);
  });

  // ---- PUT /admin/guidance/{id} --------------------------------------------

  const UPDATE_REQUEST: UpdateGuidancePostRequest = {
    title: 'Varjumine droonirünnaku ajal',
    slug: 'varjumine',
    body: '<p>Uus keha</p>',
    locale: 'et',
    pinned: false,
    heroImageId: null,
    heroImageAlt: null,
  };

  it('updateGuidancePost PUTs the full-replace body to /admin/guidance/{id} (no status field) and resolves with the updated post (200)', async () => {
    api.put.mockReturnValue(of({ ...GUIDANCE_ROW, title: UPDATE_REQUEST.title, pinned: false }));

    const row = await gateway.updateGuidancePost(11, UPDATE_REQUEST);

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/admin/guidance/11', UPDATE_REQUEST);
    expect(row).toEqual({ ...GUIDANCE_ROW, title: UPDATE_REQUEST.title, pinned: false });
  });

  // ---- POST /admin/guidance/{id}/publish + unpublish -----------------------

  it('publishGuidancePost POSTs /admin/guidance/{id}/publish and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.publishGuidancePost(11);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/guidance/11/publish');
  });

  it('unpublishGuidancePost POSTs /admin/guidance/{id}/unpublish and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.unpublishGuidancePost(11);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/guidance/11/unpublish');
  });

  // ---- DELETE /admin/guidance/{id} (confirm REQUIRED) -----------------------

  it('deleteGuidancePost DELETEs /admin/guidance/{id}?confirm=true and resolves with no body (204)', async () => {
    api.delete.mockReturnValue(of(undefined));

    await gateway.deleteGuidancePost(11);

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/admin/guidance/11?confirm=true');
  });

  // ---- translations (bilingual-guidance) ------------------------------------

  const TRANSLATION_ROW: GuidanceTranslationDto = {
    id: 401,
    postId: 11,
    locale: 'en',
    slug: 'sheltering-during-a-drone-strike',
    title: 'Sheltering during a drone strike',
    bodyHtml: '<p>Move to the main shelter.</p>',
    heroImageAlt: 'Basement, view from the entrance',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
  };

  const CREATE_TRANSLATION_REQUEST: CreateGuidanceTranslationRequest = {
    locale: 'et',
    title: 'Varjumine droonirünnaku ajal',
    body: '<p>Pöördu peavarjendisse.</p>',
    heroImageAlt: 'Kelder, vaade sissepääsust',
  };

  const UPDATE_TRANSLATION_REQUEST: UpdateGuidanceTranslationRequest = {
    title: 'Varjumine droonirünnaku ajal – uuendatud',
    body: '<p>Pöördu peavarjendisse kohe.</p>',
    heroImageAlt: null,
  };

  it('listGuidanceTranslations GETs /admin/guidance/{id}/translations (locale order, home row always present)', async () => {
    api.get.mockReturnValue(of([TRANSLATION_ROW]));

    const rows = await gateway.listGuidanceTranslations(11);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/guidance/11/translations');
    expect(rows).toEqual([TRANSLATION_ROW]);
  });

  it('createGuidanceTranslation POSTs the body to /admin/guidance/{id}/translations and resolves with the created row (200)', async () => {
    api.post.mockReturnValue(
      of({ ...TRANSLATION_ROW, id: 402, locale: 'et', slug: 'varjumine-droonirunnaku-ajal' }),
    );

    const row = await gateway.createGuidanceTranslation(11, CREATE_TRANSLATION_REQUEST);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      '/admin/guidance/11/translations',
      CREATE_TRANSLATION_REQUEST,
    );
    expect(row.locale).toBe('et');
  });

  it('createGuidanceTranslation rejects with the 409 when the post already has a translation in the locale', async () => {
    const failure = ApiError.fromHttp(
      409,
      {
        timestamp: 't',
        status: 409,
        error: 'Conflict',
        message: 'the post already has a translation in locale et',
        path: '/admin/guidance/11/translations',
      },
      '/admin/guidance/11/translations',
    );
    api.post.mockReturnValue(throwError(() => failure));

    let caught: unknown = null;
    try {
      await gateway.createGuidanceTranslation(11, CREATE_TRANSLATION_REQUEST);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
  });

  it('updateGuidanceTranslation PUTs the full-replace body to /admin/guidance/{id}/translations/{locale} (the locale is the path key) and resolves with the updated row (200)', async () => {
    api.put.mockReturnValue(of({ ...TRANSLATION_ROW, title: UPDATE_TRANSLATION_REQUEST.title }));

    const row = await gateway.updateGuidanceTranslation(11, 'en', UPDATE_TRANSLATION_REQUEST);

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(
      '/admin/guidance/11/translations/en',
      UPDATE_TRANSLATION_REQUEST,
    );
    expect(row.title).toBe(UPDATE_TRANSLATION_REQUEST.title);
  });

  it('deleteGuidanceTranslation DELETEs /admin/guidance/{id}/translations/{locale} and resolves with no body (204; no confirm parameter)', async () => {
    api.delete.mockReturnValue(of(undefined));

    await gateway.deleteGuidanceTranslation(11, 'et');

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/admin/guidance/11/translations/et');
  });

  it("deleteGuidanceTranslation rejects with the 400 when the locale is the post's home locale", async () => {
    const failure = ApiError.fromHttp(
      400,
      {
        timestamp: 't',
        status: 400,
        error: 'Bad Request',
        message: "the post's own-locale translation cannot be deleted",
        path: '/admin/guidance/11/translations/en',
      },
      '/admin/guidance/11/translations/en',
    );
    api.delete.mockReturnValue(throwError(() => failure));

    let caught: unknown = null;
    try {
      await gateway.deleteGuidanceTranslation(11, 'en');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
  });

  // ---- GET /admin/media ---------------------------------------------------------------------

  const MEDIA_ROW: MediaAssetDto = {
    id: 5,
    url: '/api/media/0123456789abcdef0123456789abcdef.jpg',
    storedFilename: '0123456789abcdef0123456789abcdef.jpg',
    originalFilename: 'kelder.jpg',
    contentType: 'image/jpeg',
    width: 1600,
    height: 900,
    sizeBytes: 204800,
    createdAt: '2026-09-01T09:00:00Z',
    reusedBy: 1,
  };

  it('listMediaAssets GETs the paged /admin/media (newest first, with usage counts) and reads the total from the header', async () => {
    api.getWithHeaders.mockReturnValue(
      of({ body: [MEDIA_ROW], headers: new HttpHeaders({ 'X-Total-Count': '7' }) }),
    );

    const paged = await gateway.listMediaAssets({ limit: 20, offset: 0 });

    expect(api.getWithHeaders).toHaveBeenCalledTimes(1);
    expect(api.getWithHeaders).toHaveBeenCalledWith('/admin/media?limit=20&offset=0');
    expect(paged).toEqual({ rows: [MEDIA_ROW], total: 7 });
  });

  // ---- POST /admin/media (multipart) ----------------------------------------

  it('uploadMediaAsset POSTs a FormData with the file part to /admin/media and resolves with the stored asset (201)', async () => {
    api.post.mockReturnValue(of(MEDIA_ROW));
    const file = new File(['jpeg-bytes'], 'kelder.jpg', { type: 'image/jpeg' });

    const asset = await gateway.uploadMediaAsset(file);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/media', expect.any(FormData));
    const form = (api.post.mock.calls[0]?.[1] as FormData | undefined) ?? new FormData();
    expect(form.get('file')).toBe(file);
    expect(asset).toEqual(MEDIA_ROW);
  });

  it('uploadMediaAsset rejects with the 413 when the file is over the cap (the message names the cap)', async () => {
    const failure = ApiError.fromHttp(
      413,
      {
        timestamp: '2026-09-05T10:00:00Z',
        status: 413,
        error: 'Payload Too Large',
        message: 'image exceeds the 5 MB cap',
        path: '/admin/media',
      },
      '/admin/media',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(
      gateway.uploadMediaAsset(new File(['x'.repeat(10)], 'big.jpg', { type: 'image/jpeg' })),
    ).rejects.toBe(failure);
  });

  // ---- DELETE /admin/media/{id} (409 in-use -> confirm=true) ----------------

  it('deleteMediaAsset without confirm DELETEs the bare /admin/media/{id} and resolves with the pre-delete snapshot (200)', async () => {
    api.delete.mockReturnValue(of(MEDIA_ROW));

    const deleted = await gateway.deleteMediaAsset(5, false);

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/admin/media/5');
    expect(deleted).toEqual(MEDIA_ROW);
  });

  it('deleteMediaAsset with confirm DELETEs /admin/media/{id}?confirm=true (the in-use re-issue)', async () => {
    api.delete.mockReturnValue(of(MEDIA_ROW));

    const deleted = await gateway.deleteMediaAsset(5, true);

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/admin/media/5?confirm=true');
    expect(deleted).toEqual(MEDIA_ROW);
  });

  it('deleteMediaAsset rejects with the 409 when the asset is still referenced (naming the posts)', async () => {
    const failure = ApiError.fromHttp(
      409,
      {
        timestamp: '2026-09-05T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'still used by Guidance post "Varjumine" (varjumine)',
        path: '/admin/media/5',
      },
      '/admin/media/5',
    );
    api.delete.mockReturnValue(throwError(() => failure));

    await expect(gateway.deleteMediaAsset(5, false)).rejects.toBe(failure);
  });
});
