import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';
import { ApiError } from '../core/api-error';
import { TokenStore } from '../core/token-store';
import { AccountGateway } from '../gateways/account-gateway';
import { AuthGateway } from '../gateways/auth-gateway';
import type { MeResponse, RegisterRequest, TokenResponse } from '../core/models';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };
const ROTATED: TokenResponse = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresIn: 900,
};

const PROFILE: MeResponse = {
  name: 'Test User',
  email: 'test@example.ee',
  phone: '+37250000001',
  levels: [],
  isAdmin: false,
};

const TEINE_PROFILE: MeResponse = {
  name: 'Teine Kasutaja',
  email: 'teine@example.ee',
  phone: '+37250000002',
  levels: ['EMAIL'],
  isAdmin: false,
};

const REGISTER: RegisterRequest = {
  name: 'Test User',
  email: 'test@example.ee',
  phone: '+37250000001',
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

class FakeAccountGateway {
  me = vi.fn();
  updateProfile = vi.fn();
  requestEmailChange = vi.fn();
  confirmEmailChange = vi.fn();
  requestPhoneChange = vi.fn();
  confirmPhoneChange = vi.fn();
}

describe('AuthStore', () => {
  let store: AuthStore;
  let tokens: TokenStore;
  let gateway: FakeAuthGateway;
  let account: FakeAccountGateway;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    account = new FakeAccountGateway();
    account.me.mockResolvedValue(PROFILE);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthGateway, useValue: gateway as unknown as AuthGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
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
      expect(account.me).not.toHaveBeenCalled();
    });

    it('valid refresh token -> silent refresh rotates the pair, authenticates, fetches the profile', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockResolvedValue(ROTATED);

      await store.init();

      expect(gateway.refresh).toHaveBeenCalledTimes(1);
      expect(gateway.refresh).toHaveBeenCalledWith('refresh-1');
      expect(store.initialized()).toBe(true);
      expect(store.authenticated()).toBe(true);
      expect(tokens.access()).toBe('access-2');
      expect(localStorage.getItem('os.refresh')).toBe('refresh-2');
      // boot with a session loads the REAL profile + claims
      expect(account.me).toHaveBeenCalledTimes(1);
      expect(store.name()).toBe('Test User');
      expect(store.email()).toBe('test@example.ee');
      expect(store.phone()).toBe('+37250000001');
    });

    it('profile fetch failure at boot is non-fatal — the session survives', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockResolvedValue(ROTATED);
      account.me.mockRejectedValue(ApiError.fromNetwork());

      await store.init();

      expect(store.authenticated()).toBe(true);
      expect(store.initialized()).toBe(true);
      expect(tokens.access()).toBe('access-2');
      expect(store.name()).toBeNull();
      expect(store.levels()).toEqual([]);
    });

    it('expired/revoked refresh token (401) -> cleared, anonymous', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(expiredRefreshError());

      await store.init();

      expect(store.authenticated()).toBe(false);
      expect(store.initialized()).toBe(true);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
      expect(account.me).not.toHaveBeenCalled();
    });

    it('backend down on boot -> anonymous, keeps the refresh token AND stays retryable (N2)', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(ApiError.fromNetwork());

      await store.init();

      expect(store.authenticated()).toBe(false);
      // A non-401 boot failure must NOT latch initialized — a later
      // guard call retries performInit (the stored token may still be valid).
      expect(store.initialized()).toBe(false);
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1');
    });

    it('a failed boot is retryable — a later init() re-attempts the refresh (N2)', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValueOnce(ApiError.fromNetwork());

      await store.init();
      expect(store.initialized()).toBe(false);
      expect(store.authenticated()).toBe(false);
      expect(gateway.refresh).toHaveBeenCalledTimes(1);

      // Network recovered — the guard's next init() call retries and
      // restores the session from the still-stored token.
      gateway.refresh.mockResolvedValue(ROTATED);
      await store.init();

      expect(store.initialized()).toBe(true);
      expect(store.authenticated()).toBe(true);
      expect(gateway.refresh).toHaveBeenCalledTimes(2);
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
      account.me.mockClear();

      await store.init();

      expect(gateway.refresh).not.toHaveBeenCalled();
      expect(account.me).not.toHaveBeenCalled();
      expect(store.authenticated()).toBe(true);
    });

    it('boot rotation goes through the single-flight refresh() — a concurrent caller shares the run (W13)', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      let resolveRefresh!: (value: TokenResponse) => void;
      gateway.refresh.mockReturnValue(
        new Promise<TokenResponse>((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      // init() starts the boot rotation synchronously (performInit awaits
      // refresh(), which starts doRefresh before returning).
      const boot = store.init();
      expect(gateway.refresh).toHaveBeenCalledTimes(1);

      // A concurrent caller (e.g. a guard's 401 refresh racing the boot)
      // must share the SAME in-flight rotation, not start a second one.
      const concurrent = store.refresh();
      expect(gateway.refresh).toHaveBeenCalledTimes(1);

      resolveRefresh(ROTATED);
      await boot;
      await expect(concurrent).resolves.toBe(true);

      expect(store.initialized()).toBe(true);
      expect(store.authenticated()).toBe(true);
      expect(localStorage.getItem('os.refresh')).toBe('refresh-2');
    });
  });

  describe('login / register', () => {
    it('login stores the pair, authenticates, and fetches the profile', async () => {
      gateway.login.mockResolvedValue(PAIR);

      await store.login('test@example.ee', 's3cret!');

      expect(gateway.login).toHaveBeenCalledWith('test@example.ee', 's3cret!');
      expect(store.authenticated()).toBe(true);
      expect(tokens.access()).toBe('access-1');
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1');
      expect(account.me).toHaveBeenCalledTimes(1);
      expect(store.name()).toBe('Test User');
      expect(store.email()).toBe('test@example.ee');
    });

    it('a failed profile fetch after login is non-fatal — the session is live', async () => {
      gateway.login.mockResolvedValue(PAIR);
      account.me.mockRejectedValue(ApiError.fromNetwork());

      await store.login('test@example.ee', 's3cret!');

      expect(store.authenticated()).toBe(true);
      expect(tokens.access()).toBe('access-1');
      expect(store.name()).toBeNull();
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
      expect(account.me).not.toHaveBeenCalled();
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

    it('failed refresh -> false and the whole session (incl. the profile) is cleared', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(expiredRefreshError());
      gateway.login.mockResolvedValue(PAIR);
      await store.login('test@example.ee', 's3cret!');

      await expect(store.refresh()).resolves.toBe(false);

      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
      expect(store.name()).toBeNull();
      expect(store.levels()).toEqual([]);
    });

    it('is reusable after completion (a later 401 can refresh again)', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockResolvedValueOnce(ROTATED).mockResolvedValueOnce(ROTATED);

      await expect(store.refresh()).resolves.toBe(true);
      await expect(store.refresh()).resolves.toBe(true);
      expect(gateway.refresh).toHaveBeenCalledTimes(2);
    });

    it('a network AND a 5xx refresh failure keep the stored token — only a 401 clears (F3)', async () => {
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValueOnce(ApiError.fromNetwork()).mockRejectedValueOnce(
        ApiError.fromHttp(500, {
          timestamp: 't',
          status: 500,
          error: 'Internal Server Error',
          message: 'boom',
          path: '/auth/refresh',
        }),
      );

      await expect(store.refresh()).resolves.toBe(false);
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1'); // kept
      await expect(store.refresh()).resolves.toBe(false);
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1'); // still kept
      // The access token really did 401 — the session is not "live", but the
      // stored refresh token survives so a retry can recover it.
      expect(store.authenticated()).toBe(false);
    });

    it('retries ONCE with the token another tab rotated in flight, before clearing (F4)', async () => {
      localStorage.setItem('os.refresh', 'refresh-1');
      gateway.refresh.mockImplementation(async (token: string) => {
        if (token === 'refresh-1') {
          // Another tab rotated the SHARED refresh token while our POST was
          // in flight — our presented token now 401s.
          localStorage.setItem('os.refresh', 'refresh-2');
          throw expiredRefreshError();
        }
        return { accessToken: 'access-9', refreshToken: 'refresh-9', expiresIn: 900 };
      });

      await expect(store.refresh()).resolves.toBe(true);

      expect(gateway.refresh).toHaveBeenCalledTimes(2);
      expect(gateway.refresh).toHaveBeenNthCalledWith(1, 'refresh-1');
      expect(gateway.refresh).toHaveBeenNthCalledWith(2, 'refresh-2');
      expect(localStorage.getItem('os.refresh')).toBe('refresh-9');
      expect(store.authenticated()).toBe(true);
    });

    it('clears the session only on the FINAL 401 after a cross-tab retry (F4)', async () => {
      localStorage.setItem('os.refresh', 'refresh-1');
      gateway.refresh.mockImplementation(async (token: string) => {
        if (token === 'refresh-1') {
          localStorage.setItem('os.refresh', 'refresh-2'); // other tab rotated
          throw expiredRefreshError();
        }
        throw expiredRefreshError(); // even the fresh token is dead
      });

      await expect(store.refresh()).resolves.toBe(false);

      expect(gateway.refresh).toHaveBeenCalledTimes(2); // exactly one retry — no loop
      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
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

  describe('real profile + levels (GET /account/me)', () => {
    it('starts unknown and unverified', () => {
      expect(store.name()).toBeNull();
      expect(store.email()).toBeNull();
      expect(store.phone()).toBeNull();
      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('refreshProfile() adopts the fetched profile and claims', async () => {
      account.me.mockResolvedValue({
        ...PROFILE,
        levels: ['EMAIL', 'PHONE'],
      });

      await store.refreshProfile();

      expect(account.me).toHaveBeenCalledTimes(1);
      expect(store.name()).toBe('Test User');
      expect(store.email()).toBe('test@example.ee');
      expect(store.phone()).toBe('+37250000001');
      expect(store.levels()).toEqual(['EMAIL', 'PHONE']);
      expect(store.isVerified()).toBe(true);
    });

    it('a single fetched level (PHONE alone) is enough for isVerified()', async () => {
      account.me.mockResolvedValue({ ...PROFILE, levels: ['PHONE'] });

      await store.refreshProfile();

      expect(store.isVerified()).toBe(true);
    });

    it('refreshProfile() is single-flight — concurrent callers share one request', async () => {
      let resolveMe!: (value: MeResponse) => void;
      account.me.mockReturnValue(
        new Promise<MeResponse>((resolve) => {
          resolveMe = resolve;
        }),
      );

      const first = store.refreshProfile();
      const second = store.refreshProfile();

      expect(account.me).toHaveBeenCalledTimes(1);
      resolveMe(PROFILE);
      await first;
      await second;

      expect(store.name()).toBe('Test User');
    });

    it('a failed refreshProfile() is non-fatal and leaves previous data in place', async () => {
      gateway.login.mockResolvedValue(PAIR);
      await store.login('test@example.ee', 's3cret!');
      expect(store.name()).toBe('Test User');

      account.me.mockRejectedValue(ApiError.fromNetwork());
      await store.refreshProfile();

      expect(store.authenticated()).toBe(true);
      expect(store.name()).toBe('Test User');
      expect(store.isVerified()).toBe(false);
    });

    it('logout resets the profile data', async () => {
      gateway.login.mockResolvedValue(PAIR);
      await store.login('test@example.ee', 's3cret!');
      gateway.logout.mockResolvedValue(undefined);

      await store.logout();

      expect(store.name()).toBeNull();
      expect(store.email()).toBeNull();
      expect(store.phone()).toBeNull();
      expect(store.levels()).toEqual([]);
      expect(store.isAdmin()).toBe(false);
      expect(store.isVerified()).toBe(false);
    });

    // ---- admin flag ----------------------------------------------------------------------

    it('refreshProfile() adopts isAdmin from the profile (always present)', async () => {
      account.me.mockResolvedValue({ ...PROFILE, isAdmin: true });

      await store.refreshProfile();

      expect(store.isAdmin()).toBe(true);

      account.me.mockResolvedValue(PROFILE); // a regular user
      await store.refreshProfile();

      expect(store.isAdmin()).toBe(false);
    });

    it('an admin login starts with isAdmin false until the profile lands, then true', async () => {
      let resolveMe!: (value: MeResponse) => void;
      account.me.mockReturnValue(
        new Promise<MeResponse>((resolve) => {
          resolveMe = resolve;
        }),
      );
      gateway.login.mockResolvedValue(PAIR);

      const login = store.login('admin@example.ee', 's3cret!');
      await vi.waitFor(() => expect(account.me).toHaveBeenCalledTimes(1));
      expect(store.authenticated()).toBe(true);
      expect(store.isAdmin()).toBe(false); // fail-closed while the profile is in flight

      resolveMe({ ...PROFILE, isAdmin: true });
      await login;

      expect(store.isAdmin()).toBe(true);
    });

    it('a fresh login adopts the NEW identity — previous profile does not carry over', async () => {
      account.me.mockResolvedValueOnce(PROFILE).mockResolvedValueOnce({
        name: 'Teine Kasutaja',
        email: 'teine@example.ee',
        phone: '+37250000002',
        levels: [],
        isAdmin: false,
      });
      gateway.login.mockResolvedValue(PAIR);
      await store.login('test@example.ee', 's3cret!');
      expect(store.name()).toBe('Test User');

      await store.login('teine@example.ee', 's3cret!');

      expect(store.name()).toBe('Teine Kasutaja');
      expect(store.email()).toBe('teine@example.ee');
      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('a failed mid-session refresh (session cleared) drops the profile too', async () => {
      gateway.login.mockResolvedValue(PAIR);
      await store.login('test@example.ee', 's3cret!');
      localStorage.setItem('os.refresh', PAIR.refreshToken);
      gateway.refresh.mockRejectedValue(expiredRefreshError());

      await expect(store.refresh()).resolves.toBe(false);

      expect(store.name()).toBeNull();
      expect(store.levels()).toEqual([]);
    });
  });

  describe('session epoch (identity generation)', () => {
    it('an in-flight me() from a previous identity is NOT adopted after logout + login as another user (F1)', async () => {
      let resolveMe!: (value: MeResponse) => void;
      account.me
        .mockReturnValueOnce(
          new Promise<MeResponse>((resolve) => {
            resolveMe = resolve;
          }),
        )
        .mockResolvedValueOnce(TEINE_PROFILE);
      gateway.login.mockResolvedValue(PAIR);
      gateway.logout.mockResolvedValue(undefined);

      // Log in as A — its profile fetch starts and HANGS (still in flight).
      const loginA = store.login('a@example.ee', 's3cret!');
      await vi.waitFor(() => expect(account.me).toHaveBeenCalledTimes(1));

      // Log out (clears the session, bumps the epoch), then log in as B.
      await store.logout();
      await store.login('b@example.ee', 's3cret!');

      // B's profile (the second me() call) was adopted.
      expect(account.me).toHaveBeenCalledTimes(2);
      expect(store.name()).toBe(TEINE_PROFILE.name);
      expect(store.email()).toBe(TEINE_PROFILE.email);

      // NOW A's stale fetch lands — it must be dropped, not painted onto B's
      // fresh session.
      resolveMe(PROFILE);
      await loginA;

      expect(store.name()).toBe(TEINE_PROFILE.name);
      expect(store.email()).toBe(TEINE_PROFILE.email);
      expect(store.levels()).toEqual(['EMAIL']);
      expect(store.authenticated()).toBe(true);
    });

    it('an in-flight refresh that LANDS after logout does not resurrect the session (N1)', async () => {
      gateway.login.mockResolvedValue(PAIR);
      await store.login('a@example.ee', 's3cret!');
      expect(store.authenticated()).toBe(true);
      expect(localStorage.getItem('os.refresh')).toBe('refresh-1');

      let resolveRefresh!: (value: TokenResponse) => void;
      gateway.refresh.mockReturnValue(
        new Promise<TokenResponse>((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      // A 401-driven refresh starts and hangs.
      const refreshing = store.refresh();
      await vi.waitFor(() => expect(gateway.refresh).toHaveBeenCalledTimes(1));

      // The user logs out while the rotate is in flight.
      gateway.logout.mockResolvedValue(undefined);
      await store.logout();
      expect(store.authenticated()).toBe(false);
      expect(localStorage.getItem('os.refresh')).toBeNull();

      // The in-flight rotate lands — its fresh pair must be discarded.
      resolveRefresh(ROTATED);
      await expect(refreshing).resolves.toBe(false);

      expect(store.authenticated()).toBe(false);
      expect(tokens.access()).toBeNull();
      expect(localStorage.getItem('os.refresh')).toBeNull();
    });
  });
});
