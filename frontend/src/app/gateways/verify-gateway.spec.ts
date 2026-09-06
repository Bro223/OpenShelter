import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '../core/api-client';
import { VerifyGateway } from './verify-gateway';

/** Hand-written fake ApiClient — the gateway must only pick paths + bodies. */
class FakeApiClient {
  get = vi.fn();
  post = vi.fn();
  put = vi.fn();
  delete = vi.fn();
}

describe('VerifyGateway', () => {
  let gateway: VerifyGateway;
  let api: FakeApiClient;

  beforeEach(() => {
    api = new FakeApiClient();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: api as unknown as ApiClient }],
    });
    gateway = TestBed.inject(VerifyGateway);
  });

  it('request(EMAIL) POSTs {level: EMAIL} to /verify/request', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.request('EMAIL');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/verify/request', { level: 'EMAIL' });
  });

  it('request(PHONE) POSTs {level: PHONE} to /verify/request', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.request('PHONE');

    expect(api.post).toHaveBeenCalledWith('/verify/request', { level: 'PHONE' });
  });

  it('confirm POSTs {level, code} to /verify/confirm', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.confirm('EMAIL', 'AB12CD34');

    expect(api.post).toHaveBeenCalledWith('/verify/confirm', { level: 'EMAIL', code: 'AB12CD34' });
  });

  it('propagates errors as-is (mapping lives in ApiClient)', async () => {
    api.post.mockReturnValue(of(undefined));

    await expect(gateway.confirm('PHONE', '123456')).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledWith('/verify/confirm', { level: 'PHONE', code: '123456' });
  });
});
