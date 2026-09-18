import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ApiClient } from '../core/api-client';
import { I18nService } from '../core/i18n/i18n.service';
import type { GuidancePostDto } from '../core/models';
import { GuidanceGateway } from './guidance-gateway';

const POST: GuidancePostDto = {
  slug: 'water-and-heating',
  title: 'Water and heating in the first days',
  bodyHtml: '<p>Boil tap water until the authority says otherwise.</p>',
  heroImageUrl: null,
  heroImageAlt: null,
  pinned: true,
  locale: 'en',
  publishedAt: '2025-09-01T08:00:00Z',
  updatedAt: '2025-09-02T09:00:00Z',
};

const POST_NO_BODY: GuidancePostDto = {
  // The public index rows never carry the body; only the detail request does.
  ...POST,
  slug: 'power-outages',
  title: 'Power outages',
  bodyHtml: null,
  pinned: false,
};

/** Hand-written fake ApiClient — the gateway must only pick paths (01-TASK.md §8). */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('GuidanceGateway', () => {
  let gateway: GuidanceGateway;
  let api: FakeApiClient;
  let i18n: I18nService;

  beforeEach(() => {
    localStorage.clear();
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    i18n = TestBed.inject(I18nService);
    gateway = TestBed.inject(GuidanceGateway);
  });

  it('list() GETs /api/guidance with the ACTIVE locale and returns the typed rows', async () => {
    api.get.mockReturnValue(of([POST, POST_NO_BODY]));

    const rows = await gateway.list();

    // The default (stored) locale is 'en' — the value comes from the
    // I18nService signal, never a hard-coded string here.
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/guidance?locale=en');
    expect(rows).toEqual([POST, POST_NO_BODY]);
  });

  it('list() supports an empty result set (nothing published yet)', async () => {
    api.get.mockReturnValue(of([]));

    const rows = await gateway.list();

    expect(api.get).toHaveBeenCalledWith('/api/guidance?locale=en');
    expect(rows).toEqual([]);
  });

  it('getBySlug(slug) GETs /api/guidance/{slug} with the ACTIVE locale and returns one typed row', async () => {
    api.get.mockReturnValue(of(POST));

    const row = await gateway.getBySlug('water-and-heating');

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/guidance/water-and-heating?locale=en');
    expect(row).toEqual(POST);
  });

  it('sends the NEW locale after the language switcher changes it', async () => {
    api.get.mockReturnValue(of(POST));

    i18n.setLocale('et');
    await gateway.list();
    expect(api.get).toHaveBeenLastCalledWith('/api/guidance?locale=et');

    await gateway.getBySlug('water-and-heating');
    expect(api.get).toHaveBeenLastCalledWith('/api/guidance/water-and-heating?locale=et');

    // And back — the value is the signal's CURRENT value on every call.
    i18n.setLocale('en');
    await gateway.list();
    expect(api.get).toHaveBeenLastCalledWith('/api/guidance?locale=en');
  });

  it('getBySlug rejects with ApiError for an unknown slug (404)', async () => {
    const failure = ApiError.fromHttp(
      404,
      {
        timestamp: 't',
        status: 404,
        error: 'Not Found',
        message: 'Post not found',
        path: '/api/guidance/missing?locale=en',
      },
      '/api/guidance/missing?locale=en',
    );
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.getBySlug('missing')).rejects.toBe(failure);
  });

  it('list() rejects with ApiError on a server failure (500)', async () => {
    const failure = ApiError.fromHttp(
      500,
      {
        timestamp: 't',
        status: 500,
        error: 'Internal Server Error',
        message: 'boom',
        path: '/api/guidance',
      },
      '/api/guidance',
    );
    api.get.mockReturnValue(throwError(() => failure));

    await expect(gateway.list()).rejects.toBe(failure);
  });
});
