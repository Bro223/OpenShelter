/**
 * Case table for `parseLocationInput` — the single client-side authority for
 * "text -> coordinates" (openspec change `shelter-location-input`).
 *
 * THIS TABLE IS THE SHARED FIXTURE SET: the backend's MapsUrlCoordinatesTest
 * must mirror these cases (design decision 4 — same fixtures, both sides).
 * Every case is named on purpose; do not merge or rename rows casually.
 *
 * Expected values:
 *   { lat, lng, swapped? }  -> success (exact numbers; DMS rows use the same
 *                              degree/minute/second arithmetic, so toEqual holds)
 *   { reason, detail? }     -> the specific failure reason
 */
import {
  isGooShortLink,
  normalizeShortLinkUrl,
  parseLocationInput,
  type ParseLocationResult,
} from './location-input';

type ExpectedPair = { lat: number; lng: number; swapped?: boolean };
type ExpectedFailure = {
  reason: 'no-pair' | 'out-of-bounds' | 'invalid' | 'decimal-comma';
  /** When set, the parser's internal detail must match EXACTLY (n2/H4). */
  detail?: string;
};

type Expected = (ExpectedPair & { detail?: string }) | ExpectedFailure;

const DMS_59_26_13_N = 59 + 26 / 60 + 13 / 3600; // 59.436944…
const DMS_24_45_12_E = 24 + 45 / 60 + 12 / 3600; // 24.753333…
const DMS_59_26_N = 59 + 26 / 60; // 59.433333…
const DMS_24_45_E = 24 + 45 / 60; // 24.75
const DMS_59_26_18_N = 59 + 26.18 / 60; // 59.436333…
const DMS_24_45_2_E = 24 + 45.2 / 60; // 24.753333…

const CASES: ReadonlyArray<{ name: string; input: string; expected: Expected }> = [
  // --- plain decimal strings (comma / semicolon / space, labels) -------------
  { name: 'plain-comma-space', input: '59.4370, 24.7535', expected: { lat: 59.437, lng: 24.7535 } },
  {
    name: 'plain-comma-no-space',
    input: '59.4370,24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  { name: 'plain-semicolon', input: '59.4370; 24.7535', expected: { lat: 59.437, lng: 24.7535 } },
  {
    name: 'plain-space-separated',
    input: '59.4370 24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'plain-swapped-order-auto-swap',
    input: '24.7535, 59.4370',
    expected: { lat: 59.437, lng: 24.7535, swapped: true },
  },
  {
    name: 'plain-lat-lng-labels',
    input: 'lat: 59.4370, lng: 24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'plain-labels-mixed-case',
    input: 'Lat 59.4370, LNG 24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'plain-extra-numbers-ignored',
    input: '59.437, 24.7535, 17',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  { name: 'plain-integer-coords', input: '59 24', expected: { lat: 59, lng: 24 } },
  // --- Estonian decimal-comma (H4): the comma is the decimal mark, never a
  //     separator. Refused with its own reason — the value is never
  //     guessed/converted (the page renders the "use a decimal point" copy).
  {
    name: 'decimal-comma-pair',
    input: '58,25 24,9',
    expected: { reason: 'decimal-comma' },
  },
  {
    name: 'decimal-comma-full-precision',
    input: '59,4370 24,7535',
    expected: { reason: 'decimal-comma' },
  },
  {
    // Mixed comma-decimal + point-decimal: the point wins — the decimal-
    // comma guard does NOT fire, the plain scan takes the (59, 4370)
    // separator pair, and the bbox gate rejects it. (The comma-as-separator
    // SUCCESS regression pin is 'plain-comma-space' above.)
    name: 'decimal-comma-mixed-with-point',
    input: '59,4370 24.75',
    expected: { reason: 'out-of-bounds' },
  },
  {
    name: 'plain-bbox-min-edge-inclusive',
    input: '57.5, 21.5',
    expected: { lat: 57.5, lng: 21.5 },
  },
  {
    name: 'plain-bbox-max-edge-inclusive',
    input: '59.7, 28.2',
    expected: { lat: 59.7, lng: 28.2 },
  },
  {
    name: 'plain-out-of-bounds-both-orders',
    input: '54.5, 25.0',
    expected: { reason: 'out-of-bounds' },
  },
  {
    name: 'plain-just-outside-bbox',
    input: '57.49, 25.0',
    expected: { reason: 'out-of-bounds' },
  },
  { name: 'plain-single-number-no-pair', input: '59.4370', expected: { reason: 'no-pair' } },
  { name: 'plain-empty-string', input: '', expected: { reason: 'no-pair' } },
  { name: 'plain-whitespace-only', input: '   ', expected: { reason: 'no-pair' } },
  {
    name: 'plain-garbage-text-no-pair',
    input: 'somewhere in a basement',
    expected: { reason: 'no-pair' },
  },
  {
    name: 'plain-labels-without-pair-invalid',
    input: 'lat: 59.4',
    expected: { reason: 'invalid' },
  },
  {
    name: 'plain-decimals-with-hemisphere-letters',
    input: '59.4370N 24.7535E',
    expected: { lat: 59.437, lng: 24.7535 },
  },

  // --- DMS strings -------------------------------------------------------------
  {
    name: 'dms-full-deg-min-sec',
    input: `59°26'13"N 24°45'12"E`,
    expected: { lat: DMS_59_26_13_N, lng: DMS_24_45_12_E },
  },
  {
    name: 'dms-with-spaces',
    input: `59° 26' 13" N, 24° 45' 12" E`,
    expected: { lat: DMS_59_26_13_N, lng: DMS_24_45_12_E },
  },
  {
    name: 'dms-minutes-only',
    input: `59°26'N 24°45'E`,
    expected: { lat: DMS_59_26_N, lng: DMS_24_45_E },
  },
  {
    name: 'dms-decimal-minutes',
    input: `59°26.18'N 24°45.2'E`,
    expected: { lat: DMS_59_26_18_N, lng: DMS_24_45_2_E },
  },
  {
    name: 'dms-lowercase-hemispheres',
    input: `59°26'13"n 24°45'12"e`,
    expected: { lat: DMS_59_26_13_N, lng: DMS_24_45_12_E },
  },
  {
    name: 'dms-lng-first-hemispheres-authoritative-no-swap-flag',
    input: `24°45'12"E 59°26'13"N`,
    expected: { lat: DMS_59_26_13_N, lng: DMS_24_45_12_E },
  },
  {
    name: 'dms-no-hemispheres-lng-first-numeric-swap',
    input: `24°45' 59°26'`,
    expected: { lat: DMS_59_26_N, lng: DMS_24_45_E, swapped: true },
  },
  {
    name: 'dms-southern-hemisphere-out-of-bounds-never-swapped',
    input: '59°S 24°E',
    expected: { reason: 'out-of-bounds' },
  },
  {
    name: 'dms-lone-latitude-invalid',
    input: `59°26'13"N`,
    expected: {
      reason: 'invalid',
      detail: 'a single DMS value is not a coordinate pair',
    },
  },
  { name: 'dms-bare-degree-invalid', input: '59°', expected: { reason: 'invalid' } },
  {
    // n2: a DMS value + a plain decimal is a TWO-value input — "a single DMS
    // value" misdescribes it; the mix gets its own message. Rejection stays.
    name: 'dms-plus-decimal-mix',
    input: `59°26'13"N 24.7535`,
    expected: {
      reason: 'invalid',
      detail: 'mix of DMS and decimal — use one format for both values',
    },
  },

  // --- map URLs (long-form; never fetched client-side) -------------------------
  {
    name: 'url-google-place-at-coords',
    input: 'https://www.google.com/maps/place/@59.43703,24.75353,17z',
    expected: { lat: 59.43703, lng: 24.75353 },
  },
  {
    name: 'url-google-q-coords',
    input: 'https://maps.google.com/maps?q=59.4370,24.7535&z=14',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'url-google-at-in-path',
    input: 'https://www.google.com/maps/@59.437,24.753/',
    expected: { lat: 59.437, lng: 24.753 },
  },
  {
    name: 'url-google-share-bang-format',
    input: 'https://www.google.com/maps!3d59.437!4d24.753',
    expected: { lat: 59.437, lng: 24.753 },
  },
  {
    name: 'url-google-daddr',
    input: 'https://www.google.com/maps/daddr=59.437,24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'url-google-saddr',
    input: 'https://www.google.com/maps?saddr=59.4,24.7',
    expected: { lat: 59.4, lng: 24.7 },
  },
  {
    name: 'url-google-q-swapped-order',
    input: 'https://maps.google.com/maps?q=24.7535,59.4370',
    expected: { lat: 59.437, lng: 24.7535, swapped: true },
  },
  {
    name: 'url-google-q-place-name-no-pair',
    input: 'https://www.google.com/maps?q=Kalamaja+Tallinn',
    expected: { reason: 'no-pair' },
  },
  {
    name: 'url-apple-ll',
    input: 'https://maps.apple.com/?ll=59.437,24.7535&q=Place',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'url-bing-q',
    input: 'https://www.bing.com/maps?q=59.437,24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    name: 'url-generic-decimal-pair-fallback',
    input: 'https://example.com/place/59.437,24.7535',
    expected: { lat: 59.437, lng: 24.7535 },
  },
  {
    // H4 URL guard: comma-decimals in the coordinate-carrying part of the
    // URL (path + query; the scheme+host is always dotted) with no
    // point-decimal -> decimal-comma, not a silent (58, 25) pin.
    name: 'url-generic-decimal-comma',
    input: 'https://example.com/place/58,25/24,9',
    expected: { reason: 'decimal-comma' },
  },
  {
    name: 'url-out-of-bounds-paris',
    input: 'https://www.google.com/maps/@48.85,2.35/',
    expected: { reason: 'out-of-bounds' },
  },
  {
    name: 'url-short-link-is-not-parsed-client-side',
    input: 'https://maps.app.goo.gl/abc123',
    expected: { reason: 'no-pair' },
  },
];

describe('parseLocationInput (shared fixture table)', () => {
  it.each(CASES.map((c) => [c.name, c.input, c.expected] as const))(
    '%s',
    (name: string, input: string, expected: Expected) => {
      const result = parseLocationInput(input);
      if ('lat' in expected) {
        expect(result, name).toEqual({
          latitude: expected.lat,
          longitude: expected.lng,
          ...(expected.swapped === true ? { swapped: true } : {}),
        });
      } else {
        expect(result, name).toMatchObject({ reason: expected.reason });
        if (expected.detail !== undefined) {
          expect((result as { detail?: string }).detail, name).toBe(expected.detail);
        }
        expect('latitude' in result, name).toBe(false);
      }
    },
  );

  it('covers at least 30 named cases (tasks.md requirement)', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(CASES.map((c) => c.name)).size).toBe(CASES.length);
  });
});

describe('isGooShortLink', () => {
  it.each([
    ['with-https', 'https://maps.app.goo.gl/AbC123', true],
    ['with-http', 'http://maps.app.goo.gl/AbC123', true],
    ['bare-host', 'maps.app.goo.gl/AbC123', true],
    ['with-trailing-slash', 'https://maps.app.goo.gl/AbC123/', true],
    ['query-string', 'https://maps.app.goo.gl/AbC123?x=1', true],
    ['other-host', 'https://maps.example.com/AbC123', false],
    ['no-path', 'https://maps.app.goo.gl', false],
    ['garbage', 'not a link at all', false],
    ['empty', '', false],
  ] as const)('%s', (_name, input, expected) => {
    expect(isGooShortLink(input)).toBe(expected);
  });
});

describe('normalizeShortLinkUrl', () => {
  it('keeps an existing scheme', () => {
    expect(normalizeShortLinkUrl('https://maps.app.goo.gl/abc')).toBe(
      'https://maps.app.goo.gl/abc',
    );
    expect(normalizeShortLinkUrl('http://maps.app.goo.gl/abc')).toBe('http://maps.app.goo.gl/abc');
  });

  it('prepends https:// to a bare host and trims surrounding whitespace', () => {
    expect(normalizeShortLinkUrl('  maps.app.goo.gl/abc  ')).toBe('https://maps.app.goo.gl/abc');
  });
});

describe('ParseLocationResult type shape (compile-time contract for the backend mirror)', () => {
  it('success and failure are distinguishable by the latitude key', () => {
    const ok: ParseLocationResult = parseLocationInput('59.437, 24.7535');
    const bad: ParseLocationResult = parseLocationInput('nope');
    if ('latitude' in ok) {
      expect(ok.latitude).toBeCloseTo(59.437);
    } else {
      throw new Error('expected a pair');
    }
    if ('reason' in bad) {
      expect(bad.reason).toBe('no-pair');
    } else {
      throw new Error('expected a failure');
    }
  });
});
