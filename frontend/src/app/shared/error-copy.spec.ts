import { ApiError } from '../core/api-error';
import { bannerMessage, COPY, type ErrorKind } from './error-copy';

/**
 * Direct table spec of the bannerMessage status × kind matrix (N22).
 * Every branch in shared/error-copy.ts is pinned here; when a branch is
 * added, add its rows.
 *
 * The anti-enumeration contract is pinned explicitly: a login 401 ALWAYS
 * gets the fixed copy, whatever the backend message says.
 */

const KINDS: ErrorKind[] = [
  'login',
  'register',
  'reset',
  'verify',
  'account',
  'profile',
  'shelter',
];

/** Build a real ApiError from a uniform backend ErrorResponse body. */
function apiError(status: number, message: string): ApiError {
  return ApiError.fromHttp(
    status,
    { timestamp: '2026-09-08T10:00:00Z', status, error: 'Reason', message, path: '/x' },
    '/x',
  );
}

type Row = { status: number; kind: ErrorKind; message: string; expected: string };

const rows: Row[] = [
  // ---- 429: verify + account have dedicated copy, everything else generic
  { status: 429, kind: 'login', message: 'slow down', expected: COPY.rateLimited },
  { status: 429, kind: 'register', message: 'slow down', expected: COPY.rateLimited },
  { status: 429, kind: 'reset', message: 'slow down', expected: COPY.rateLimited },
  { status: 429, kind: 'verify', message: 'slow down', expected: COPY.verifyRateLimited },
  { status: 429, kind: 'account', message: 'slow down', expected: COPY.accountRateLimited },
  { status: 429, kind: 'profile', message: 'slow down', expected: COPY.rateLimited },
  { status: 429, kind: 'shelter', message: 'slow down', expected: COPY.rateLimited },

  // ---- 401: login is anti-enumeration (never echoes); profile echoes the
  // backend text ("current password is incorrect" IS the user-facing text);
  // all other kinds echo the backend message with a generic fallback.
  { status: 401, kind: 'login', message: 'invalid credentials', expected: COPY.invalidCredentials },
  { status: 401, kind: 'login', message: 'user does not exist', expected: COPY.invalidCredentials },
  { status: 401, kind: 'login', message: '', expected: COPY.invalidCredentials },
  {
    status: 401,
    kind: 'register',
    message: 'authentication required',
    expected: 'authentication required',
  },
  {
    status: 401,
    kind: 'reset',
    message: 'authentication required',
    expected: 'authentication required',
  },
  {
    status: 401,
    kind: 'verify',
    message: 'authentication required',
    expected: 'authentication required',
  },
  {
    status: 401,
    kind: 'account',
    message: 'authentication required',
    expected: 'authentication required',
  },
  {
    status: 401,
    kind: 'profile',
    message: 'current password is incorrect',
    expected: 'current password is incorrect',
  },
  { status: 401, kind: 'profile', message: '', expected: COPY.unauthorized },
  {
    status: 401,
    kind: 'shelter',
    message: 'authentication required',
    expected: 'authentication required',
  },
  { status: 401, kind: 'shelter', message: '', expected: COPY.unauthorized },

  // ---- 400: reset/verify/account are fixed copy (no backend internals);
  // profile/login/register/shelter echo the validation message with fallback.
  {
    status: 400,
    kind: 'login',
    message: 'phone may not be blank',
    expected: 'phone may not be blank',
  },
  {
    status: 400,
    kind: 'register',
    message: 'phone may not be blank',
    expected: 'phone may not be blank',
  },
  {
    status: 400,
    kind: 'reset',
    message: 'wrong/expired/used/over-limit — indistinguishable',
    expected: COPY.resetBadCode,
  },
  {
    status: 400,
    kind: 'verify',
    message: 'whatever the backend says',
    expected: COPY.verifyBadCode,
  },
  {
    status: 400,
    kind: 'account',
    message: 'whatever the backend says',
    expected: COPY.accountBadCode,
  },
  {
    status: 400,
    kind: 'profile',
    message: 'name may not be blank',
    expected: 'name may not be blank',
  },
  { status: 400, kind: 'profile', message: '', expected: 'Please check your input and try again.' },
  {
    status: 400,
    kind: 'shelter',
    message: 'name may not be blank',
    expected: 'name may not be blank',
  },
  { status: 400, kind: 'shelter', message: '', expected: 'Please check your input and try again.' },

  // ---- 409: every kind echoes the backend message, with a fixed fallback.
  ...KINDS.map((kind): Row => ({
    status: 409,
    kind,
    message: 'email already registered',
    expected: 'email already registered',
  })),
  ...KINDS.map((kind): Row => ({
    status: 409,
    kind,
    message: '',
    expected: 'That value is already in use.',
  })),

  // ---- 5xx: always the fixed generic copy, NEVER the body (N6).
  ...KINDS.map((kind): Row => ({ status: 500, kind, message: 'boom', expected: COPY.serverError })),
  ...KINDS.map((kind): Row => ({ status: 502, kind, message: 'boom', expected: COPY.serverError })),
  ...KINDS.map((kind): Row => ({ status: 503, kind, message: 'boom', expected: COPY.serverError })),

  // ---- default (unhandled status < 500): echo with generic fallback.
  { status: 418, kind: 'shelter', message: 'teapot', expected: 'teapot' },
  { status: 418, kind: 'shelter', message: '', expected: COPY.serverError },
];

describe('bannerMessage — status × kind matrix', () => {
  it.each(rows)('status $status × kind $kind', ({ status, kind, message, expected }) => {
    expect(bannerMessage(apiError(status, message), kind)).toBe(expected);
  });

  it('N6: a 5xx with a NON-JSON body (reverse-proxy HTML) is never echoed into the banner', () => {
    const html =
      '<html><head><title>502 Bad Gateway</title></head><body><center>nginx</center></body></html>';
    // A non-JSON string body becomes ApiError.message verbatim — the copy
    // layer must still refuse to surface it for status >= 500.
    const err = ApiError.fromHttp(502, html, 'http://localhost:8080/api/shelters');
    expect(err.message).toContain('<html'); // the raw body IS in the error…
    for (const kind of KINDS) {
      const copy = bannerMessage(err, kind);
      expect(copy).toBe(COPY.serverError);
      expect(copy).not.toContain('<html');
      expect(copy).not.toContain('nginx');
    }
  });

  describe('network + non-ApiError input', () => {
    it('a network error (backend unreachable) shows the network copy for every kind', () => {
      const offline = ApiError.fromNetwork();
      for (const kind of KINDS) {
        expect(bannerMessage(offline, kind)).toBe(offline.message);
      }
    });

    it('a non-ApiError throw maps to the network copy (toApiError fallback)', () => {
      const offline = ApiError.fromNetwork();
      for (const kind of KINDS) {
        expect(bannerMessage(new Error('boom'), kind)).toBe(offline.message);
      }
    });
  });
});
