import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthGateway } from './auth-gateway';
import { ApiClient } from '../core/api-client';
import type { RegisterRequest, TokenResponse } from '../core/models';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

/** Hand-written fake ApiClient — the gateway must only pick paths + bodies. */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('AuthGateway', () => {
  let gateway: AuthGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(AuthGateway);
  });

  it('register POSTs RegisterRequest to /auth/register', async () => {
    api.post.mockReturnValue(of(undefined));
    const body: RegisterRequest = {
      name: 'Test User',
      email: 'test@example.ee',
      phone: '+37250000001',
      nationalIdCode: '49901019999',
      password: 's3cret!',
    };

    await gateway.register(body);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/register', body);
  });

  it('login POSTs {emailOrPhone, password} to /auth/login and returns the typed pair', async () => {
    api.post.mockReturnValue(of(PAIR));

    const pair = await gateway.login('test@example.ee', 's3cret!');

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      emailOrPhone: 'test@example.ee',
      password: 's3cret!',
    });
    expect(pair).toEqual(PAIR);
  });

  it('refresh POSTs {refreshToken} to /auth/refresh and returns the rotated pair', async () => {
    api.post.mockReturnValue(of(ROTATED_PAIR));

    const pair = await gateway.refresh('refresh-1');

    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-1' });
    expect(pair).toEqual(ROTATED_PAIR);
  });

  it('logout POSTs {refreshToken} to /auth/logout', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.logout('refresh-1');

    expect(api.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-1' });
  });

  it('requestPasswordReset POSTs {email} to /auth/password-reset/request', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.requestPasswordReset('test@example.ee');

    expect(api.post).toHaveBeenCalledWith('/auth/password-reset/request', {
      email: 'test@example.ee',
    });
  });

  it('resetPassword POSTs {token, newPassword} to /auth/password-reset/confirm', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.resetPassword('tok-123', 'new-secret');

    expect(api.post).toHaveBeenCalledWith('/auth/password-reset/confirm', {
      token: 'tok-123',
      newPassword: 'new-secret',
    });
  });
});

const ROTATED_PAIR: TokenResponse = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresIn: 900,
};
