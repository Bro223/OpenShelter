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
});
