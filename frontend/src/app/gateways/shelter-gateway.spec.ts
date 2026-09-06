import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type { ShelterDto } from '../core/models';
import { ShelterGateway } from './shelter-gateway';

const REGISTRY_ROW: ShelterDto = {
  id: 1,
  address: 'Tornimäe 1, Tallinn',
  name: 'Tallinn Central Shelter',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'PAASETEAMET',
  averageRating: 4.5,
  reviewCount: 2,
  createdAt: '2025-09-01T08:00:00Z',
  description: null,
  capacity: null,
};

const USER_ROW: ShelterDto = {
  ...REGISTRY_ROW,
  id: 7,
  address: null,
  name: 'Community Cellar',
  source: 'USER',
  averageRating: null,
  reviewCount: 0,
  description: 'Neighbourhood basement',
  capacity: 12,
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
});
