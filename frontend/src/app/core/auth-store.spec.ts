import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';
import { ApiError } from './api-error';
import { TokenStore } from './token-store';
import { AuthGateway } from '../gateways/auth-gateway';
import type { RegisterRequest, TokenResponse } from './models';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };
const ROTATED: TokenResponse = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresIn: 900,
};

const REGISTER: RegisterRequest = {
  name: 'Test User',
  email: 'test@example.ee',
  phone: '+37250000001',
  nationalIdCode: '49901019999',
  password: 's3cret!',
};

function expiredRefreshError(): ApiError {
  return ApiError.fromHttp(
    401,
    {
      timestamp: '2025-09-05T10:00:00Z',
      status: 401,
      error: 'Unauthorized',
      message: 'expired',
      path: '/auth/refresh',
    },
    '/auth/refresh',
  );
}

/** Hand-written fake gateway (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeAuthGateway {
  register = vi.fn();
  login = vi.fn();
  refresh = vi.fn();
  logout = vi.fn();
  requestPasswordReset = vi.fn();
  resetPassword = vi.fn();
}

describe('AuthStore', () => {
  let store: AuthStore;
  let tokens: TokenStore;
  let gateway: FakeAuthGateway;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthGateway, useValue: gateway as unknown as AuthGateway }],
    });
    store = TestBed.inject(AuthStore);
    tokens = TestBed.inject(TokenStore);
  });

  describe('init()', () => {
    it('no refresh token -> anonymous, initialized, no network call', async () => {
      await store.init();
      expect(store.initialized()).toBe(true);
      expect(store.authenticated()).toBe(false);
      expect(gateway.refresh).not.toHaveBeenCalled();
    });

    it('valid refresh token -> silent refresh rotates the pair and authenticates', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockResolvedValue(ROTATED);

      await store.init();

      expect(gateway.refresh).toHaveBeenCalledTimes(1);
      expect(gateway.refresh).toHaveBeenCalledWith('refresh-1');
      expect(store.initialized()).toBe(true);
      expect(store.authenticated()).toBe(true);
      expect(tokens.access()).toBe('access-2');
      expect(localStorage.getItem('os.refresh')).toBe('refresh-2');
    });

    it('expired/revoked refresh token (401) -> cleared, anonymous', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(expiredRefreshError());

      await store.init();

      expect(store.authenticated()).toBe(false);
      expect(store.initialized()).toBe(true);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
    });

    it('backend down on boot -> anonymous but keeps the refresh token for the next boot', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(ApiError.fromNetwork());

      await store.init();

      expect(store.authenticated()).toBe(false);
      expect(store.initialized()).toBe(true);
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1');
    });

    it('is single-flight — concurrent init() callers share one boot refresh', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      let resolveRefresh!: (value: TokenResponse) => void;
      gateway.refresh.mockReturnValue(
        new Promise<TokenResponse>((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      const first = store.init();
      const second = store.init();

      expect(gateway.refresh).toHaveBeenCalledTimes(1);
      resolveRefresh(ROTATED);
      await first;
      await second;

      expect(store.authenticated()).toBe(true);
      expect(store.initialized()).toBe(true);
    });

    it('is a no-op once already initialized', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockResolvedValue(ROTATED);
      await store.init();
      gateway.refresh.mockClear();

      await store.init();

      expect(gateway.refresh).not.toHaveBeenCalled();
      expect(store.authenticated()).toBe(true);
    });
  });

  describe('login / register', () => {
    it('login stores the pair and authenticates', async () => {
      gateway.login.mockResolvedValue(PAIR);

      await store.login('test@example.ee', 's3cret!');

      expect(gateway.login).toHaveBeenCalledWith('test@example.ee', 's3cret!');
      expect(store.authenticated()).toBe(true);
      expect(tokens.access()).toBe('access-1');
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1');
    });

    it('login failure propagates the ApiError and leaves the store anonymous', async () => {
      gateway.login.mockRejectedValue(
        ApiError.fromHttp(401, {
          timestamp: 't',
          status: 401,
          error: 'Unauthorized',
          message: 'invalid credentials',
          path: '/auth/login',
        }),
      );

      await expect(store.login('test@example.ee', 'wrong')).rejects.toMatchObject({ status: 401 });
      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
    });

    it('register forwards the request (no session is created)', async () => {
      gateway.register.mockResolvedValue(undefined);

      await store.register(REGISTER);

      expect(gateway.register).toHaveBeenCalledWith(REGISTER);
      expect(store.authenticated()).toBe(false);
      expect(gateway.login).not.toHaveBeenCalled();
    });

    it('register 409 (duplicate email) propagates as ApiError', async () => {
      const conflict = ApiError.fromHttp(409, {
        timestamp: 't',
        status: 409,
        error: 'Conflict',
        message: 'email already registered',
        path: '/auth/register',
      });
      gateway.register.mockRejectedValue(conflict);

      await expect(store.register(REGISTER)).rejects.toBe(conflict);
    });
  });

  describe('refresh() single-flight', () => {
    it('two concurrent callers trigger exactly ONE refresh and share the result', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      let resolveRefresh!: (value: TokenResponse) => void;
      gateway.refresh.mockReturnValue(
        new Promise<TokenResponse>((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      const first = store.refresh();
      const second = store.refresh();

      expect(first).toBe(second); // the same in-flight promise
      expect(gateway.refresh).toHaveBeenCalledTimes(1);

      resolveRefresh(ROTATED);
      await expect(first).resolves.toBe(true);
      await expect(second).resolves.toBe(true);

      expect(store.authenticated()).toBe(true);
      expect(tokens.access()).toBe('access-2');
      expect(localStorage.getItem('os.refresh')).toBe('refresh-2');
    });

    it('no refresh token -> false without calling the gateway', async () => {
      await expect(store.refresh()).resolves.toBe(false);
      expect(gateway.refresh).not.toHaveBeenCalled();
    });

    it('failed refresh -> false and the whole session is cleared', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(expiredRefreshError());

      await expect(store.refresh()).resolves.toBe(false);

      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
    });

    it('is reusable after completion (a later 401 can refresh again)', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockResolvedValueOnce(ROTATED).mockResolvedValueOnce(ROTATED);

      await expect(store.refresh()).resolves.toBe(true);
      await expect(store.refresh()).resolves.toBe(true);
      expect(gateway.refresh).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout()', () => {
    it('revokes the refresh token server-side, then clears local state', async () => {
      tokens.setTokens('access-1', 'refresh-1');
      gateway.logout.mockResolvedValue(undefined);

      await store.logout();

      expect(gateway.logout).toHaveBeenCalledWith('refresh-1');
      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
    });

    it('clears local state even when the server revoke fails (network)', async () => {
      tokens.setTokens('access-1', 'refresh-1');
      gateway.logout.mockRejectedValue(ApiError.fromNetwork());

      await store.logout();

      expect(gateway.logout).toHaveBeenCalledWith('refresh-1');
      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
    });
  });

  describe('verification levels (M3)', () => {
    it('starts empty and unverified', () => {
      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('addLevel(EMAIL) records the level and isVerified() turns true', () => {
      store.addLevel('EMAIL');

      expect(store.levels()).toEqual(['EMAIL']);
      expect(store.isVerified()).toBe(true);
    });

    it('a single level (PHONE alone) is enough for isVerified()', () => {
      store.addLevel('PHONE');

      expect(store.isVerified()).toBe(true);
    });

    it('addLevel dedupes — re-adding an existing level does not grow the list', () => {
      store.addLevel('EMAIL');
      store.addLevel('EMAIL');

      expect(store.levels()).toEqual(['EMAIL']);
    });

    it('SMART_ID is never added (the backend rejects it as a stub)', () => {
      store.addLevel('SMART_ID');

      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('logout resets the optimistic levels', async () => {
      store.addLevel('EMAIL');
      gateway.logout.mockResolvedValue(undefined);

      await store.logout();

      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('a fresh login starts a fresh identity — levels do not carry over', async () => {
      store.addLevel('EMAIL');
      gateway.login.mockResolvedValue(PAIR);

      await store.login('other@example.ee', 's3cret!');

      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('a failed mid-session refresh (session cleared) also drops the levels', async () => {
      store.addLevel('EMAIL');
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(expiredRefreshError());

      await expect(store.refresh()).resolves.toBe(false);

      expect(store.levels()).toEqual([]);
    });
  });
});
