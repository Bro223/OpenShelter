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

  it('requestEmailChange POSTs {newEmail} to /account/email-change/request and returns the cooldown ack', async () => {
    api.post.mockReturnValue(of({ resendAvailableAfterSeconds: 60 }));

    const ack = await gateway.requestEmailChange('new@example.ee');

    expect(api.post).toHaveBeenCalledWith('/account/email-change/request', {
      newEmail: 'new@example.ee',
    });
    expect(ack).toEqual({ resendAvailableAfterSeconds: 60 });
  });

  it('confirmEmailChange POSTs {code} to /account/email-change/confirm', async () => {
    api.post.mockReturnValue(of(undefined));

    await gateway.confirmEmailChange('123456');

    expect(api.post).toHaveBeenCalledWith('/account/email-change/confirm', { code: '123456' });
  });

  it('requestPhoneChange POSTs {newPhone} to /account/phone-change/request and returns the cooldown ack', async () => {
    api.post.mockReturnValue(of({ resendAvailableAfterSeconds: 60 }));

    const ack = await gateway.requestPhoneChange('+37250000002');

    expect(api.post).toHaveBeenCalledWith('/account/phone-change/request', {
      newPhone: '+37250000002',
    });
    expect(ack).toEqual({ resendAvailableAfterSeconds: 60 });
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
      currentPassword: 'correct-horse',
    };
    const fresh = { ...request, email: 'aino@example.ee', phone: '+37250000002', levels: [] };
    api.put.mockReturnValue(of(fresh));

    const result = await gateway.updateProfile(request);

    expect(api.put).toHaveBeenCalledWith('/account/profile', request);
    expect(result).toEqual(fresh);
  });

  it("myReviews GETs the caller's reviews across shelters from /account/reviews/mine", async () => {
    const rows = [
      {
        shelterId: 7,
        shelterName: 'Community Cellar',
        rating: 5,
        comment: 'Suurepärane',
        createdAt: '2025-09-01T08:00:00Z',
        updatedAt: '2025-09-02T09:30:00Z',
      },
      {
        shelterId: 12,
        shelterName: 'Teine varjend',
        rating: 3,
        comment: null,
        createdAt: '2025-09-03T10:00:00Z',
        updatedAt: '2025-09-03T10:00:00Z',
      },
    ];
    api.get.mockReturnValue(of(rows));

    const result = await gateway.myReviews();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/account/reviews/mine');
    expect(result).toEqual(rows);
  });

  it('myReviews supports an empty result set (no reviews yet)', async () => {
    api.get.mockReturnValue(of([]));

    const result = await gateway.myReviews();

    expect(api.get).toHaveBeenCalledWith('/account/reviews/mine');
    expect(result).toEqual([]);
  });

  it('exportData GETs /account/export and returns the document (M4 slice 1)', async () => {
    const doc = {
      profile: {
        name: 'Kontakt Muutus',
        email: 'kontakt@example.ee',
        phone: '+37250004444',
        levels: [],
      },
      shelters: [],
      reviews: [],
    };
    api.get.mockReturnValue(of(doc));

    const result = await gateway.exportData();

    expect(api.get).toHaveBeenCalledWith('/account/export');
    expect(result).toEqual(doc);
  });

  it('deleteAccount DELETEs /account (M4 slice 2)', async () => {
    api.delete.mockReturnValue(of(undefined));

    await gateway.deleteAccount();

    expect(api.delete).toHaveBeenCalledWith('/account');
  });
});
