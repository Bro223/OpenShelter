import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type { AdminShelterDto } from '../core/models';
import { AdminGateway } from './admin-gateway';

const SHELTER_ROW: AdminShelterDto = {
  id: 7,
  name: 'Kommunaali Varjend',
  address: null,
  source: 'USER',
  status: 'INACTIVE',
  rating: 4.5,
  reviewCount: 2,
  nonexistentReports: 3,
  statusFlag: 'REPORTED_CLOSED',
  occupancy: { band: 'FULL', reportedAt: '2025-09-01T08:00:00Z', reportCount: 2 },
  capacity: 12,
  submitter: 'Kaja K.',
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

  // ---- GET /admin/review-reports ---------------------------------------------------

  it('listReviewReports GETs /admin/review-reports', async () => {
    api.get.mockReturnValue(of([]));

    const rows = await gateway.listReviewReports();

    expect(api.get).toHaveBeenCalledWith('/admin/review-reports');
    expect(rows).toEqual([]);
  });

  // ---- POST /admin/reviews/{id}/hide | /restore --------------------------------------

  it('hideReview POSTs the REVIEW id to /admin/reviews/{id}/hide (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await expect(gateway.hideReview(301)).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/reviews/301/hide');
  });

  it('restoreReview POSTs the REVIEW id to /admin/reviews/{id}/restore (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await expect(gateway.restoreReview(302)).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/reviews/302/restore');
  });

  it('rejects with ApiError on a network failure', async () => {
    const failure = ApiError.fromNetwork();
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.listShelterReports()).rejects.toBe(failure);
  });
});
