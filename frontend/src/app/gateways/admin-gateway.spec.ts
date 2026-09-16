import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type {
  AdminGuidancePostDto,
  AdminShelterDto,
  CreateGuidancePostRequest,
  MediaAssetDto,
  UpdateGuidancePostRequest,
} from '../core/models';
import { AdminGateway } from './admin-gateway';

const SHELTER_ROW: AdminShelterDto = {
  id: 7,
  name: 'Kommunaali Varjend',
  address: null,
  source: 'USER',
  status: 'INACTIVE',
  nonexistentReports: 3,
  occupancy: { band: 'FULL', reportedAt: '2025-09-01T08:00:00Z', reportCount: 2 },
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

  it('listShelters GETs the bare /admin/shelters without filters', async () => {
    api.get.mockReturnValue(of([SHELTER_ROW]));

    const rows = await gateway.listShelters();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/shelters');
    expect(rows).toEqual([SHELTER_ROW]);
  });

  it('listShelters appends only the filters that are set, in a fixed order', async () => {
    api.get.mockReturnValue(of([]));

    await gateway.listShelters({ status: 'INACTIVE', source: 'USER', q: 'kelder' });

    expect(api.get).toHaveBeenCalledWith('/admin/shelters?status=INACTIVE&source=USER&q=kelder');
  });

  it('listShelters URL-encodes the q substring and skips empty values', async () => {
    api.get.mockReturnValue(of([]));

    await gateway.listShelters({ q: 'a b & c' });

    expect(api.get).toHaveBeenCalledWith('/admin/shelters?q=a%20b%20%26%20c');

    api.get.mockClear();
    await gateway.listShelters({ q: '' });
    expect(api.get).toHaveBeenCalledWith('/admin/shelters');
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
    api.get.mockReturnValue(throwError(() => failure));

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

  it('listShelterReports GETs the bare queue', async () => {
    api.get.mockReturnValue(of([]));

    await gateway.listShelterReports();

    expect(api.get).toHaveBeenCalledWith('/admin/reports');
  });

  it('listShelterReports narrows by shelterId when given', async () => {
    api.get.mockReturnValue(of([]));

    await gateway.listShelterReports(7);

    expect(api.get).toHaveBeenCalledWith('/admin/reports?shelterId=7');
  });

  it('dismissShelterReport POSTs the row id and resolves with no body (idempotent 204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await expect(gateway.dismissShelterReport(101)).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/reports/101/dismiss');
  });

  it('rejects with ApiError on a network failure', async () => {
    const failure = ApiError.fromNetwork();
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.listShelterReports()).rejects.toBe(failure);
  });

  // ---- POST /admin/shelters/{id}/review | GET /admin/audit (community-review-queue) ----

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

  it('listAudit GETs the newest-100 moderation actions', async () => {
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
    api.get.mockReturnValue(of([row]));

    const rows = await gateway.listAudit();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/audit');
    expect(rows).toEqual([row]);
  });

  // ---- GET /admin/alerts (abuse-limits) ----

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

  it('listUsers GETs the bare /admin/users', async () => {
    const row = {
      id: 301,
      name: 'Siht',
      email: 'siht@example.ee',
      kind: 'REGISTERED' as const,
      suspendedAt: null,
    };
    api.get.mockReturnValue(of([row]));

    const rows = await gateway.listUsers();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/users');
    expect(rows).toEqual([row]);
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

  // ---- GET /admin/guidance (crisis-guidance D3/D8) ------------------------

  const GUIDANCE_ROW: AdminGuidancePostDto = {
    id: 11,
    slug: 'varjumine-droonirunnaku-ajal',
    title: 'Varjumine droonirünnaku ajal',
    bodyHtml: '<p>Pöördu peavarjendisse.</p>',
    locale: 'et',
    status: 'PUBLISHED',
    pinned: true,
    heroImageId: 5,
    heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
    heroImageAlt: 'Kelder, vaade sissepääsust',
    createdBy: 1,
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
  };

  it('listGuidancePosts GETs the bare /admin/guidance (drafts included, server order)', async () => {
    api.get.mockReturnValue(of([GUIDANCE_ROW]));

    const rows = await gateway.listGuidancePosts();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/guidance');
    expect(rows).toEqual([GUIDANCE_ROW]);
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
    api.post.mockReturnValue(of({ ...GUIDANCE_ROW, heroImageId: null, heroImageUrl: null, heroImageAlt: null }));

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

  // ---- GET /admin/media (crisis-guidance D8) --------------------------------

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

  it('listMediaAssets GETs the bare /admin/media (newest first, with usage counts)', async () => {
    api.get.mockReturnValue(of([MEDIA_ROW]));

    const rows = await gateway.listMediaAssets();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/admin/media');
    expect(rows).toEqual([MEDIA_ROW]);
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
