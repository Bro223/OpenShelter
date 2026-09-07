import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';
import { ApiError } from './api-error';
import { TokenStore } from './token-store';
import { AccountGateway } from '../gateways/account-gateway';
import { AuthGateway } from '../gateways/auth-gateway';
import type { MeResponse, RegisterRequest, TokenResponse } from './models';

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
  nationalIdCode: '49901019999',
  levels: [],
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
      expect(store.nationalIdCode()).toBe('49901019999');
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
      account.me.mockClear();

      await store.init();

      expect(gateway.refresh).not.toHaveBeenCalled();
      expect(account.me).not.toHaveBeenCalled();
      expect(store.authenticated()).toBe(true);
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
      expect(store.nationalIdCode()).toBeNull();
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
      expect(store.nationalIdCode()).toBe('49901019999');
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
      expect(store.nationalIdCode()).toBeNull();
      expect(store.levels()).toEqual([]);
      expect(store.isVerified()).toBe(false);
    });

    it('a fresh login adopts the NEW identity — previous profile does not carry over', async () => {
      account.me.mockResolvedValueOnce(PROFILE).mockResolvedValueOnce({
        name: 'Teine Kasutaja',
        email: 'teine@example.ee',
        phone: '+37250000002',
        nationalIdCode: '49901019998',
        levels: [],
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
});
