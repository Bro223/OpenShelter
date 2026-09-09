import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import type { LocationResolved } from '../core/models';
import { GeoGateway } from './geo-gateway';

/** A resolved short link (maps.app.goo.gl -> Google Maps with an in-Estonia pair). */
const RESOLVED: LocationResolved = { latitude: 59.43703, longitude: 24.75353 };

/** Hand-written fake ApiClient — the gateway must only pick path + body (01-TASK.md §8). */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('GeoGateway', () => {
  let gateway: GeoGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(GeoGateway);
  });

  it('resolve POSTs {url} to /api/geo/resolve and returns the typed pair', async () => {
    api.post.mockReturnValue(of(RESOLVED));

    const result = await gateway.resolve('https://maps.app.goo.gl/AbC123');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/geo/resolve', {
      url: 'https://maps.app.goo.gl/AbC123',
    });
    expect(result).toEqual(RESOLVED);
  });

  it('rejects with ApiError when the link carries no coordinates (400 generic)', async () => {
    const failure = ApiError.fromHttp(
      400,
      {
        timestamp: '2025-09-10T08:00:00Z',
        status: 400,
        error: 'Bad Request',
        message: 'could not find coordinates in the provided link',
        path: '/api/geo/resolve',
      },
      '/api/geo/resolve',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.resolve('https://maps.app.goo.gl/xyz')).rejects.toBe(failure);
  });

  it('rejects with ApiError when the per-IP rate limit is hit (429)', async () => {
    const failure = ApiError.fromHttp(
      429,
      {
        timestamp: '2025-09-10T08:00:00Z',
        status: 429,
        error: 'Too Many Requests',
        message: 'too many resolve requests, slow down',
        path: '/api/geo/resolve',
      },
      '/api/geo/resolve',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.resolve('https://maps.app.goo.gl/xyz')).rejects.toBe(failure);
  });

  it('rejects with ApiError when the upstream redirect chain fails (502 generic)', async () => {
    const failure = ApiError.fromHttp(
      502,
      {
        timestamp: '2025-09-10T08:00:00Z',
        status: 502,
        error: 'Bad Gateway',
        message: 'could not resolve the link right now, please retry',
        path: '/api/geo/resolve',
      },
      '/api/geo/resolve',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.resolve('https://maps.app.goo.gl/xyz')).rejects.toBe(failure);
  });

  it('rejects with ApiError when unauthenticated (401)', async () => {
    const failure = ApiError.fromHttp(
      401,
      {
        timestamp: '2025-09-10T08:00:00Z',
        status: 401,
        error: 'Unauthorized',
        message: 'missing or invalid token',
        path: '/api/geo/resolve',
      },
      '/api/geo/resolve',
    );
    api.post.mockReturnValue(throwError(() => failure));

    await expect(gateway.resolve('https://maps.app.goo.gl/xyz')).rejects.toBe(failure);
  });
});
