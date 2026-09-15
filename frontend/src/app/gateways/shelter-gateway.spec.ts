import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type { ShelterDto, ShelterSourceFilter, ShelterTrustFilter } from '../core/models';
import { ShelterGateway } from './shelter-gateway';

const REGISTRY_ROW: ShelterDto = {
  id: 1,
  address: 'Tornimäe 1, Tallinn',
  name: 'Tallinn Central Shelter',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'PAASETEAMET',
  createdAt: '2025-09-01T08:00:00Z',
  description: null,
  capacity: null,
  submitterVerified: false, // registry rows have no creator (D3)
  nonexistentReports: 0,
  reportCount: 0, // total (all report types)
  openStatus: null,
  occupancy: null,
  reviewStatus: 'CONFIRMED', // registry backfill (D3)
  locationKind: 'PUBLIC',
  lastVerifiedAt: null, // null — no import run in this fixture
  inaccurate: false, // no moderator mark in this fixture
};

const USER_ROW: ShelterDto = {
  ...REGISTRY_ROW,
  id: 7,
  address: null,
  name: 'Community Cellar',
  source: 'USER',
  description: 'Neighbourhood basement',
  capacity: 12,
  submitterVerified: true, // creator has a completed verification
};

/** Hand-written fake ApiClient — the gateway must only pick paths (01-TASK.md §8). */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('ShelterGateway', () => {
  let gateway: ShelterGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(ShelterGateway);
  });

  it.each([
    ['ALL', '/api/shelters?source=ALL'],
    ['REGISTRY', '/api/shelters?source=REGISTRY'],
    ['USER', '/api/shelters?source=USER'],
  ] as const)('list(%s) GETs %s and returns the typed rows', async (source, path) => {
    api.get.mockReturnValue(of([REGISTRY_ROW, USER_ROW]));

    const rows = await gateway.list(source);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(path);
    expect(rows).toEqual([REGISTRY_ROW, USER_ROW]);
  });

  it('list supports an empty result set (no shelters for the filter)', async () => {
    api.get.mockReturnValue(of([]));

    const rows = await gateway.list('USER');

    expect(api.get).toHaveBeenCalledWith('/api/shelters?source=USER');
    expect(rows).toEqual([]);
  });

  // ---- trust filters (shelter-trust-and-reports D5) ------------------------

  it.each([
    ['ALL', { hasCapacity: true }, '/api/shelters?source=ALL&hasCapacity=true'],
    ['USER', { hasCapacity: true }, '/api/shelters?source=USER&hasCapacity=true'],
    ['REGISTRY', { hasCapacity: true }, '/api/shelters?source=REGISTRY&hasCapacity=true'],
  ] as [ShelterSourceFilter, ShelterTrustFilter, string][])(
    'list composes %j for %s into %s',
    async (source, trust, path) => {
      api.get.mockReturnValue(of([REGISTRY_ROW]));

      await gateway.list(source, trust);

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(path);
    },
  );

  it('list omits inactive trust filters (false/undefined -> no param)', async () => {
    api.get.mockReturnValue(of([REGISTRY_ROW]));

    await gateway.list('ALL', { hasCapacity: false });

    // `source` is always sent; nothing else is active.
    expect(api.get).toHaveBeenCalledWith('/api/shelters?source=ALL');
  });

  it('get(id) GETs /api/shelters/{id} and returns one typed row', async () => {
    api.get.mockReturnValue(of(USER_ROW));

    const row = await gateway.get(7);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/shelters/7');
    expect(row).toEqual(USER_ROW);
  });

  it('list rejects with ApiError when the request fails', async () => {
    const failure = ApiError.fromNetwork();
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.list('ALL')).rejects.toBe(failure);
  });

  it('get rejects with ApiError when the shelter is missing (404)', async () => {
    const failure = ApiError.fromHttp(
      404,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 404,
        error: 'Not Found',
        message: 'Shelter not found',
        path: '/api/shelters/999',
      },
      '/api/shelters/999',
    );
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.get(999)).rejects.toBe(failure);
  });

  it('create POSTs the typed request body to /api/shelters and returns the new row', async () => {
    api.post.mockReturnValue(of(USER_ROW));

    const row = await gateway.create({
      name: 'Community Cellar',
      latitude: 59.437,
      longitude: 24.754,
      description: 'Neighbourhood basement',
      capacity: 12,
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/shelters', {
      name: 'Community Cellar',
      latitude: 59.437,
      longitude: 24.754,
      description: 'Neighbourhood basement',
      capacity: 12,
    });
    expect(row).toEqual(USER_ROW);
  });

  it('create rejects with ApiError when the backend rejects the point (400)', async () => {
    const failure = ApiError.fromHttp(
      400,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 400,
        error: 'Bad Request',
        message: 'shelter location must be inside Estonia',
        path: '/api/shelters',
      },
      '/api/shelters',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(
      gateway.create({ name: 'Open Water', latitude: 54.5, longitude: 25.0 }),
    ).rejects.toBe(failure);
  });

  it("mine GETs /api/shelters/mine and returns the caller's typed rows", async () => {
    api.get.mockReturnValue(of([USER_ROW]));

    const rows = await gateway.mine();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/shelters/mine');
    expect(rows).toEqual([USER_ROW]);
  });

  it('mine supports an empty result set (no shelters submitted yet)', async () => {
    api.get.mockReturnValue(of([]));

    const rows = await gateway.mine();

    expect(api.get).toHaveBeenCalledWith('/api/shelters/mine');
    expect(rows).toEqual([]);
  });

  it('replyInfoRequest POSTs the answer to /api/shelters/{id}/info-request/reply and resolves with no body (204)', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.replyInfoRequest(7, 'Jah, avatud on.');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/shelters/7/info-request/reply', {
      message: 'Jah, avatud on.',
    });
  });

  it('update PUTs the typed body to /api/shelters/{id} and returns the fresh row', async () => {
    api.put.mockReturnValue(of({ ...USER_ROW, name: 'Renamed Cellar', capacity: 20 }));

    const row = await gateway.update(7, {
      name: 'Renamed Cellar',
      latitude: 59.44,
      longitude: 24.76,
      description: 'Renovated',
      capacity: 20,
    });

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/api/shelters/7', {
      name: 'Renamed Cellar',
      latitude: 59.44,
      longitude: 24.76,
      description: 'Renovated',
      capacity: 20,
    });
    expect(row).toEqual({ ...USER_ROW, name: 'Renamed Cellar', capacity: 20 });
  });

  it('update rejects with ApiError when not the author (403)', async () => {
    const failure = ApiError.fromHttp(
      403,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 403,
        error: 'Forbidden',
        message: 'only the author may modify this shelter',
        path: '/api/shelters/7',
      },
      '/api/shelters/7',
    );
    api.put.mockReturnValue(throwError(() => failure));

    await expect(gateway.update(7, { name: 'X', latitude: 59.44, longitude: 24.76 })).rejects.toBe(
      failure,
    );
  });

  it('remove DELETEs /api/shelters/{id} and resolves void (204)', async () => {
    api.delete.mockReturnValue(of(undefined));

    await expect(gateway.remove(7)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith('/api/shelters/7');
  });

  // ---- trust layer (shelter-trust-and-reports D1/D4) ------------------------

  it('report POSTs the typed body and answers the damp flag (M9)', async () => {
    api.post.mockReturnValue(of({ damped: false }));

    await expect(gateway.report(7, { type: 'NON_EXISTENT' })).resolves.toEqual({
      damped: false,
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/shelters/7/reports', { type: 'NON_EXISTENT' });
  });

  it('report carries the free-text detail for OTHER', async () => {
    api.post.mockReturnValue(of({ damped: false }));

    await expect(
      gateway.report(7, { type: 'OTHER', detail: 'The cellar entrance is bricked up' }),
    ).resolves.toEqual({ damped: false });
    expect(api.post).toHaveBeenCalledWith('/api/shelters/7/reports', {
      type: 'OTHER',
      detail: 'The cellar entrance is bricked up',
    });
  });

  it('report rejects with ApiError on a duplicate (409)', async () => {
    const failure = ApiError.fromHttp(
      409,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'you have already reported this shelter with this report type',
        path: '/api/shelters/7/reports',
      },
      '/api/shelters/7/reports',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.report(7, { type: 'CLOSED' })).rejects.toBe(failure);
  });

  it('report rejects with ApiError for an unverified account (403)', async () => {
    const failure = ApiError.fromHttp(
      403,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 403,
        error: 'Forbidden',
        message: 'reports require a verified account',
        path: '/api/shelters/7/reports',
      },
      '/api/shelters/7/reports',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.report(7, { type: 'OTHER' })).rejects.toBe(failure);
  });

  it('reportOccupancy PUTs the band body to /api/shelters/{id}/occupancy', async () => {
    api.put.mockReturnValue(of(undefined));

    await expect(gateway.reportOccupancy(7, 'FULL')).resolves.toBeUndefined();
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/api/shelters/7/occupancy', { band: 'FULL' });
  });

  it('reportOccupancy rejects with ApiError on a failed upsert (404)', async () => {
    const failure = ApiError.fromHttp(
      404,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 404,
        error: 'Not Found',
        message: 'shelter not found',
        path: '/api/shelters/999/occupancy',
      },
      '/api/shelters/999/occupancy',
    );
    api.put.mockReturnValue(throwError(() => failure));

    await expect(gateway.reportOccupancy(999, 'SPACE')).rejects.toBe(failure);
  });

  it('putOpenStatus PUTs the state body to /api/shelters/{id}/open-status', async () => {
    api.put.mockReturnValue(of(undefined));

    await expect(gateway.putOpenStatus(7, 'CLOSED')).resolves.toBeUndefined();
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/api/shelters/7/open-status', { state: 'CLOSED' });
  });

  it('putOpenStatus rejects with ApiError on an unknown shelter (404)', async () => {
    const failure = ApiError.fromHttp(
      404,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 404,
        error: 'Not Found',
        message: 'shelter not found',
        path: '/api/shelters/999/open-status',
      },
      '/api/shelters/999/open-status',
    );
    api.put.mockReturnValue(throwError(() => failure));

    await expect(gateway.putOpenStatus(999, 'OPEN')).rejects.toBe(failure);
  });

  it('putOpenStatus rejects with ApiError for an unverified account (403)', async () => {
    const failure = ApiError.fromHttp(
      403,
      {
        timestamp: '2025-09-05T10:00:00Z',
        status: 403,
        error: 'Forbidden',
        message: 'open-status reports require a verified account',
        path: '/api/shelters/7/open-status',
      },
      '/api/shelters/7/open-status',
    );
    api.put.mockReturnValue(throwError(() => failure));

    await expect(gateway.putOpenStatus(7, 'OPEN')).rejects.toBe(failure);
  });
});
