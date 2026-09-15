import { TestBed } from '@angular/core/testing';
import { ApiError } from '../core/api-error';
import { GeocodeGateway } from './geocode-gateway';

/**
 * One realistic Nominatim jsonv2 row — lat/lon are STRINGS exactly as the
 * service sends them, plus the extra jsonv2 fields the gateway must ignore.
 */
const ROW = {
  display_name: 'Lossi 2, 81001 Tartu, Tartumaa, Estonia',
  lat: '59.43703',
  lon: '24.75353',
  type: 'house',
  place_id: 434605,
  licence: 'https://www.openstreetmap.org/copyright',
  osm_type: 'way',
  osm_id: 35121559,
  class: 'building',
  addresstype: 'house',
  importance: 0.5,
};

const URL_BASE = 'https://nominatim.openstreetmap.org/search';

/** A 200 Nominatim response carrying the given jsonv2 rows. */
function okResponse(rows: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => rows,
  } as unknown as Response;
}

/** An HTTP error response (429 throttling, 500, …). */
function errorResponse(status: number, body = ''): Response {
  return {
    ok: false,
    status,
    text: async () => body,
  } as unknown as Response;
}

describe('GeocodeGateway', () => {
  let gateway: GeocodeGateway;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    // A fresh instance per test — the spacing state is per-instance.
    gateway = TestBed.inject(GeocodeGateway);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('builds the Nominatim URL with jsonv2/limit/countrycodes and an encoded q', async () => {
    fetchMock.mockResolvedValue(okResponse([ROW]));

    const results = await gateway.search('lossi 2, tartu');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${URL_BASE}?format=jsonv2&limit=5&countrycodes=ee&q=lossi%202%2C%20tartu`,
    );
    expect(results).toEqual([
      {
        displayName: 'Lossi 2, 81001 Tartu, Tartumaa, Estonia',
        latitude: 59.43703,
        longitude: 24.75353,
        type: 'house',
      },
    ]);
  });

  it('parses the string lat/lon of jsonv2 into numbers and drops malformed rows', async () => {
    fetchMock.mockResolvedValue(
      okResponse([
        ROW,
        { display_name: 'Broken, Tartu, Estonia', lat: 'not-a-number', lon: '24.75' },
        { lat: '58.9', lon: '25.2' }, // no display_name
        { display_name: '', lat: '58.9', lon: '25.2' }, // empty display_name
      ]),
    );

    const results = await gateway.search('tartu');

    // Exactly the one fully-formed row survives — numbers, not strings.
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      displayName: ROW.display_name,
      latitude: 59.43703,
      longitude: 24.75353,
      type: 'house',
    });
    expect(typeof results[0].latitude).toBe('number');
    expect(typeof results[0].longitude).toBe('number');
  });

  it('caps the results at five even if the service over-delivers', async () => {
    fetchMock.mockResolvedValue(okResponse(Array.from({ length: 7 }, () => ROW)));

    const results = await gateway.search('tartu');

    expect(results).toHaveLength(5);
  });

  it('spaces consecutive requests by at least 1000 ms (the second waits out the window)', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(okResponse([ROW]));

    const first = gateway.search('lossi 2, tartu');
    await vi.advanceTimersByTimeAsync(0);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Immediately after the first fired — inside the 1000 ms window.
    const second = gateway.search('tähtveres tn 4');
    expect(fetchMock).toHaveBeenCalledTimes(1); // the second request has NOT fired yet

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2); // the window elapsed — now it fires
    await second;

    // Both URLs carry their own encoded query (ä → %C3%A4, space → %20).
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${URL_BASE}?format=jsonv2&limit=5&countrycodes=ee&q=lossi%202%2C%20tartu`,
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${URL_BASE}?format=jsonv2&limit=5&countrycodes=ee&q=t%C3%A4htveres%20tn%204`,
    );
  });

  it('a 429 from the service rejects with an ApiError of status 429', async () => {
    fetchMock.mockResolvedValue(errorResponse(429, 'too many requests'));

    const attempt = gateway.search('lossi 2, tartu');

    await expect(attempt).rejects.toBeInstanceOf(ApiError);
    const failure = await attempt.catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(429);
  });

  it('a network failure (fetch rejects) rejects with a network ApiError (status 0)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const attempt = gateway.search('lossi 2, tartu');

    await expect(attempt).rejects.toBeInstanceOf(ApiError);
    const failure = await attempt.catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(0);
    expect((failure as ApiError).isNetworkError).toBe(true);
  });

  it('a failed search does not poison the queue — the next search still runs', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429)).mockResolvedValueOnce(okResponse([ROW]));

    await expect(gateway.search('first')).rejects.toBeInstanceOf(ApiError);
    // Immediately after the failure — the next call waits out the spacing
    // window (fake timers) and then succeeds.
    vi.useFakeTimers();
    const next = gateway.search('second');
    await vi.advanceTimersByTimeAsync(1000);
    await next;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
