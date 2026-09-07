import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../core/api-client';
import { AccountGateway } from './account-gateway';

/** Hand-written fake ApiClient — the gateway must only pick paths + bodies. */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('AccountGateway', () => {
  let gateway: AccountGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(AccountGateway);
  });

  it('requestEmailChange POSTs {newEmail} to /account/email-change/request', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.requestEmailChange('new@example.ee');

    expect(api.post).toHaveBeenCalledWith('/account/email-change/request', {
      newEmail: 'new@example.ee',
    });
  });

  it('confirmEmailChange POSTs {code} to /account/email-change/confirm', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.confirmEmailChange('123456');

    expect(api.post).toHaveBeenCalledWith('/account/email-change/confirm', { code: '123456' });
  });

  it('requestPhoneChange POSTs {newPhone} to /account/phone-change/request', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.requestPhoneChange('+37250000002');

    expect(api.post).toHaveBeenCalledWith('/account/phone-change/request', {
      newPhone: '+37250000002',
    });
  });

  it('confirmPhoneChange POSTs {code} to /account/phone-change/confirm', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.confirmPhoneChange('654321');

    expect(api.post).toHaveBeenCalledWith('/account/phone-change/confirm', { code: '654321' });
  });

  it('me GETs the real profile from /account/me', async () => {
    const profile = {
      name: 'Aino Test',
      email: 'aino@example.ee',
      phone: '+37250000002',
      nationalIdCode: '50001020002',
      levels: ['EMAIL'],
    };
    api.get.mockReturnValue(of(profile));

    const result = await gateway.me();

    expect(api.get).toHaveBeenCalledWith('/account/me');
    expect(result).toEqual(profile);
  });

  it('updateProfile PUTs the profile request and returns the fresh MeResponse', async () => {
    const request = {
      name: 'Aino Test',
      nationalIdCode: '50001020002',
      currentPassword: 'correct-horse',
    };
    const fresh = { ...request, email: 'aino@example.ee', phone: '+37250000002', levels: [] };
    api.put.mockReturnValue(of(fresh));

    const result = await gateway.updateProfile(request);

    expect(api.put).toHaveBeenCalledWith('/account/profile', request);
    expect(result).toEqual(fresh);
  });
});
