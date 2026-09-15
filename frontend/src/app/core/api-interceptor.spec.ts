import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../session/auth-store';
import { TokenStore } from './token-store';
import { apiInterceptor } from './api-interceptor';

/** Fake stores — the interceptor must talk to them, not to the real network. */
function makeFakeTokens() {
  return {
    access: vi.fn(),
    refresh: vi.fn(),
    setTokens: vi.fn(),
    clear: vi.fn(),
  };
}

function makeFakeAuthStore() {
  return { refresh: vi.fn() };
}

/** Let pending microtasks (async refresh promises) settle. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let fakeTokens: ReturnType<typeof makeFakeTokens>;
  let fakeAuth: ReturnType<typeof makeFakeAuthStore>;

  beforeEach(() => {
    fakeTokens = makeFakeTokens();
    fakeAuth = makeFakeAuthStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStore, useValue: fakeTokens as unknown as TokenStore },
        { provide: AuthStore, useValue: fakeAuth as unknown as AuthStore },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches Authorization: Bearer when an access token is present', () => {
    fakeTokens.access.mockReturnValue('access-1');

    http.get('/api/me').subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/me'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('sends no Authorization header for anonymous calls', () => {
    fakeTokens.access.mockReturnValue(null);

    http.get('/api/shelters').subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/api/shelters'));
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('never attaches a Bearer to /auth/login or /auth/refresh', () => {
    fakeTokens.access.mockReturnValue('access-1');

    http.post('/auth/login', { emailOrPhone: 'a', password: 'b' }).subscribe({ error: () => {} });
    const login = httpMock.expectOne((r) => r.url.endsWith('/auth/login'));
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush({}, { status: 401, statusText: 'Unauthorized' });

    http.post('/auth/refresh', { refreshToken: 'r' }).subscribe({ error: () => {} });
    const refresh = httpMock.expectOne((r) => r.url.endsWith('/auth/refresh'));
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('does not refresh on a 401 from /auth/login or /auth/refresh (callers own those)', () => {
    fakeTokens.access.mockReturnValue('access-1');

    let error: unknown;
    http
      .post('/auth/login', { emailOrPhone: 'a', password: 'b' })
      .subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne((r) => r.url.endsWith('/auth/login'))
      .flush(
        {
          timestamp: 't',
          status: 401,
          error: 'Unauthorized',
          message: 'invalid credentials',
          path: '/auth/login',
        },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(fakeAuth.refresh).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(HttpErrorResponse);
  });

  it('on a mid-session 401: refreshes once, retries with the new token, delivers the response', async () => {
    fakeTokens.access.mockReturnValueOnce('access-1').mockReturnValue('access-2');
    fakeAuth.refresh.mockResolvedValue(true);

    let body: unknown;
    http.get('/api/me').subscribe((value) => (body = value));

    const first = httpMock.expectOne((r) => r.url.endsWith('/api/me'));
    expect(first.request.headers.get('Authorization')).toBe('Bearer access-1');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();
    const retried = httpMock.expectOne((r) => r.url.endsWith('/api/me'));
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-2');
    expect(fakeAuth.refresh).toHaveBeenCalledTimes(1);
    retried.flush({ ok: true });

    expect(body).toEqual({ ok: true });
  });

  it("two parallel 401s each trigger one refresh call, and both requests retry with the new token (dedup is AuthStore's job, proven in auth-store.spec)", async () => {
    fakeTokens.access.mockReturnValue('access-1');
    fakeAuth.refresh.mockResolvedValue(true);
    // access() is called twice per request (attach + retry) — keep returning a token.

    const results: unknown[] = [];
    http.get('/a').subscribe({ next: (v) => results.push(v), error: () => results.push('err-a') });
    http.get('/b').subscribe({ next: (v) => results.push(v), error: () => results.push('err-b') });

    httpMock
      .expectOne((r) => r.url.endsWith('/a'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne((r) => r.url.endsWith('/b'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();
    httpMock.expectOne((r) => r.url.endsWith('/a')).flush({ a: 1 });
    httpMock.expectOne((r) => r.url.endsWith('/b')).flush({ b: 1 });

    // The fake store does NOT dedupe — the interceptor calls refresh once
    // per 401. Single-flight dedup itself is proven in auth-store.spec.ts.
    expect(fakeAuth.refresh).toHaveBeenCalledTimes(2);
    expect(results).toEqual([{ a: 1 }, { b: 1 }]);
  });

  it('on refresh failure: surfaces the original 401 and redirects to /login?session=expired', async () => {
    fakeTokens.access.mockReturnValue('access-1');
    fakeAuth.refresh.mockResolvedValue(false);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let error: unknown;
    http.get('/api/me').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne((r) => r.url.endsWith('/api/me'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();

    expect(fakeAuth.refresh).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { session: 'expired' } });
  });

  it('network errors (status 0) pass through untouched — no refresh attempt', () => {
    fakeTokens.access.mockReturnValue('access-1');

    let error: unknown;
    http.get('/api/me').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne((r) => r.url.endsWith('/api/me')).error(new ErrorEvent('error'));

    expect(fakeAuth.refresh).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(0);
  });

  it('a 401 from /account/profile is a BUSINESS error (wrong current password) — no refresh dance, propagates to the page (F2)', async () => {
    fakeTokens.access.mockReturnValue('access-1');

    let error: unknown;
    http
      .put('/account/profile', { name: 'N', currentPassword: 'typo' })
      .subscribe({ error: (e) => (error = e) });

    const req = httpMock.expectOne((r) => r.url.endsWith('/account/profile'));
    // /account/profile is an authenticated endpoint — it DOES get the Bearer.
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush(
      {
        timestamp: 't',
        status: 401,
        error: 'Unauthorized',
        message: 'current password is incorrect',
        path: '/account/profile',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    // No wasted token rotation, no /login bounce — the account page renders
    // the backend message (bannerMessage kind 'profile' echoes it).
    expect(fakeAuth.refresh).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
  });

  it('a 401 on the POST-REFRESH RETRY redirects to /login?session=expired, rethrows, and does NOT loop (N3)', async () => {
    fakeTokens.access.mockReturnValueOnce('access-1').mockReturnValue('access-2');
    fakeAuth.refresh.mockResolvedValue(true);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let error: unknown;
    http.get('/api/me').subscribe({ error: (e) => (error = e) });

    const first = httpMock.expectOne((r) => r.url.endsWith('/api/me'));
    expect(first.request.headers.get('Authorization')).toBe('Bearer access-1');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();
    const retried = httpMock.expectOne((r) => r.url.endsWith('/api/me'));
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-2');
    // The freshly rotated token is ALSO rejected — the session is dead.
    retried.flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();

    // The page gets its error state (the 401 is rethrown)…
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
    // …and the user is told why they land on login.
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { session: 'expired' } });
    // No infinite loop: the retry bypasses this interceptor, so the
    // post-refresh 401 never triggers a second refresh.
    expect(fakeAuth.refresh).toHaveBeenCalledTimes(1);
  });
});
