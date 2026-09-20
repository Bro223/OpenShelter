import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { SiteTextsByLocale } from '../core/i18n/site-texts';
import { SiteTextsGateway } from './site-texts-gateway';

/** Hand-written fake ApiClient — the gateway must only pick the path. */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

const TEXTS: SiteTextsByLocale = {
  en: {
    'a11y.popup.title': { value: 'Accessibility' },
    'nav.map': { value: 'Map' },
  },
  et: {
    'a11y.popup.title': { value: 'Kasutussõbralikkus' },
    'nav.map': { value: 'Kaart' },
  },
  ru: {
    'a11y.popup.title': { value: 'Доступность' },
    'nav.map': { value: 'Карта' },
  },
};

describe('SiteTextsGateway', () => {
  let gateway: SiteTextsGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(SiteTextsGateway);
  });

  it('GETs /api/site-texts and returns the overrides for all three locales', async () => {
    api.get.mockReturnValue(of(TEXTS));

    const texts = await gateway.fetch();

    expect(api.get).toHaveBeenCalledWith('/api/site-texts');
    expect(texts).toEqual(TEXTS);
  });

  it('resolves to null on API failure (the shipped i18n catalog stands)', async () => {
    api.get.mockReturnValue(throwError(() => new Error('nope')));

    await expect(gateway.fetch()).resolves.toBeNull();
  });

  it('resolves to null on network failure (the overlay is never a blocker)', async () => {
    api.get.mockReturnValue(
      throwError(() => new TypeError('Network error when attempting to fetch resource.')),
    );

    await expect(gateway.fetch()).resolves.toBeNull();
  });
});
