import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { DataSourceDto } from '../core/models';
import { DataSourceGateway } from './data-source-gateway';

/** Hand-written fake ApiClient — the gateway must only pick the path. */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

const DS: DataSourceDto = {
  sourceName: 'Päästeamet',
  officialUrl: 'https://www.rescue.ee/et/juhend/avaandmed/avalikud-varjumiskohad',
  lastImport: {
    at: '2026-09-13T06:30:00Z',
    status: 'OK',
    sourceVersion: 'Sun, 06 Sep 2026 21:02:21 GMT',
    recordsAdded: 0,
    recordsUpdated: 303,
    recordsRemoved: 0,
  },
};

describe('DataSourceGateway', () => {
  let gateway: DataSourceGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(DataSourceGateway);
  });

  it('GETs /api/data-source and returns the provenance payload', async () => {
    api.get.mockReturnValue(of(DS));

    const ds = await gateway.fetch();

    expect(api.get).toHaveBeenCalledWith('/api/data-source');
    expect(ds).toEqual(DS);
  });

  it('resolves to null on API failure (the footer line just hides)', async () => {
    api.get.mockReturnValue(throwError(() => new Error('nope')));

    await expect(gateway.fetch()).resolves.toBeNull();
  });
});
