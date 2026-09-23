import { Component, type DebugElement } from '@angular/core';
import { readFileSync } from 'node:fs';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AccountGateway } from '../../gateways/account-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthGateway } from '../../gateways/auth-gateway';
import { AuthStore } from '../../session/auth-store';
import type { MeResponse, ShelterDto, TokenResponse } from '../../core/models';
import { AccountPage } from './account-page';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

const PROFILE: MeResponse = {
  name: 'Kontakt Muutus',
  email: 'kontakt@example.ee',
  phone: '+37250004444',
  levels: [],
  isAdmin: false,
};

/** The ack body of a successful change request (the server's cooldown in seconds). */
const ACK = { resendAvailableAfterSeconds: 60 };

const SHELTER_ROW: ShelterDto = {
  id: 7,
  address: null,
  name: 'Kommunaali Varjend',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'USER',
  createdAt: '2025-09-01T08:00:00Z',
  description: 'Naabruskonna kelder',
  capacity: 12,
  submitterVerified: true, // own shelters: the author is a verified user
  nonexistentReports: 0,
  reportCount: 0, // total (all report types)
  openStatus: null,
  occupancy: null,
  reviewStatus: 'CONFIRMED',
  locationKind: 'PUBLIC',
  lastVerifiedAt: null, // null = never verified
  inaccurate: false, // no moderator mark on this row
};

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
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
  /** The export document; default to an empty document. */
  exportData = vi.fn();
  /** The account erasure (204, empty body). */
  deleteAccount = vi.fn();
  constructor() {
    this.deleteAccount.mockResolvedValue(undefined);
    this.exportData.mockResolvedValue({
      profile: {
        name: 'Kontakt Muutus',
        email: 'kontakt@example.ee',
        phone: '+37250004444',
        levels: [],
      },
      shelters: [],
    });
  }
}

class FakeShelterGateway {
  list = vi.fn();
  get = vi.fn();
  create = vi.fn();
  /** The embedded contributions panel loads on init — default to empty. */
  mine = vi.fn();
  update = vi.fn();
  remove = vi.fn();
  constructor() {
    this.mine.mockResolvedValue([]);
  }
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

@Component({ template: '<p>stub</p>' })
class Stub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('AccountPage', () => {
  let account: FakeAccountGateway;
  let auth: FakeAuthGateway;
  let shelter: FakeShelterGateway;
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    account = new FakeAccountGateway();
    auth = new FakeAuthGateway();
    shelter = new FakeShelterGateway();
    account.me.mockResolvedValue(PROFILE);
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'map', component: Stub },
          { path: 'account', component: AccountPage },
          { path: 'submit', component: Stub },
        ]),
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
        { provide: AuthGateway, useValue: auth as unknown as AuthGateway },
        { provide: ShelterGateway, useValue: shelter as unknown as ShelterGateway },
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  async function open(): Promise<{
    page: AccountPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // The guard awaits init; with no refresh token init settles anonymous —
    // the page renders because this harness routes without the guard.
    await store.init();
    await store.refreshProfile();
    await router.navigateByUrl('/account');
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(AccountPage));
    if (!debug) {
      throw new Error('AccountPage not rendered');
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<Host>>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  // ---- identity card -------------------------------------------------------

  it('renders the fetched identity (name) in the identity card — no national ID row', async () => {
    const { element } = await open();

    expect(element.textContent).toContain('Identity');
    expect(element.textContent).toContain('Kontakt Muutus');
    expect(element.textContent).not.toContain('National ID');
    expect(element.querySelector('#profile-name')).toBeNull(); // closed form
  });

  // ---- admin badge (admin-moderation D5) ------------------------------------

  it('a regular user sees NO Admin badge next to the name', async () => {
    const { element } = await open();

    expect(element.querySelector('.badge--admin')).toBeNull();
  });

  it('an admin profile gets the Admin badge next to the name (trust-badge style)', async () => {
    account.me.mockResolvedValue({ ...PROFILE, isAdmin: true });
    const { element } = await open();

    const badge = element.querySelector('.badge--admin');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('Admin');
    // It sits on the Name row of the identity card, next to the fetched name.
    const row = badge?.closest('.identity-row');
    expect(row?.textContent).toContain('Kontakt Muutus');
    // The store carries it too (the nav/guard read the same signal).
    expect(store.isAdmin()).toBe(true);
  });

  it('renders the real contact values with per-contact verification labels', async () => {
    const { element } = await open();

    expect(element.textContent).toContain('kontakt@example.ee');
    expect(element.textContent).toContain('+37250004444');
    // Fresh account: both rows offer "Complete verification"
    const ctas = element.querySelectorAll('a[href="/verify"]');
    expect(ctas.length).toBe(2);
    for (const cta of ctas) {
      expect(cta.textContent).toContain('Complete verification');
    }
  });

  it('verified email + unverified phone -> Verified label on the email row only', async () => {
    account.me.mockResolvedValue({ ...PROFILE, levels: ['EMAIL'] });
    const { element } = await open();

    const rows = element.querySelectorAll('.contact-row');
    expect(rows.length).toBe(2);
    // email row: verified label, no CTA
    expect(rows[0]?.textContent).toContain('Verified');
    expect(rows[0]?.querySelector('a[href="/verify"]')).toBeNull();
    // phone row: CTA
    expect(rows[1]?.querySelector('a[href="/verify"]')).not.toBeNull();
    expect(rows[1]?.textContent).toContain('Complete verification');
  });

  it('both contacts verified -> no "Complete verification" actions at all', async () => {
    account.me.mockResolvedValue({ ...PROFILE, levels: ['EMAIL', 'PHONE'] });
    const { element } = await open();

    expect(element.querySelectorAll('a[href="/verify"]').length).toBe(0);
    const rows = element.querySelectorAll('.contact-row');
    expect(rows[0]?.textContent).toContain('Verified');
    expect(rows[1]?.textContent).toContain('Verified');
  });

  it('a failed profile fetch shows the error state; Retry re-fetches', async () => {
    account.me.mockRejectedValue(ApiError.fromNetwork());
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await store.init();
    await store.refreshProfile();
    await router.navigateByUrl('/account');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('could not load your profile');
    expect(element.textContent).not.toContain('kontakt@example.ee');
    expect(element.querySelector('#change-email-new')).toBeNull(); // chrome only

    // Recovery: the backend is back — Retry fetches and the profile renders.
    account.me.mockResolvedValue(PROFILE);
    const page = fixture.debugElement.query(By.directive(AccountPage)).componentInstance;
    await page.retryProfile();
    fixture.detectChanges();

    expect(element.textContent).toContain('Kontakt Muutus');
    expect(element.textContent).toContain('kontakt@example.ee');
  });

  it('Retry shows a pending state while the profile fetch is in flight (N15)', async () => {
    account.me.mockRejectedValue(ApiError.fromNetwork());
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await store.init();
    await store.refreshProfile();
    await router.navigateByUrl('/account');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const page = fixture.debugElement.query(By.directive(AccountPage)).componentInstance;
    const retry = element.querySelector('button') as HTMLButtonElement;
    expect(retry.textContent).toContain('Retry');
    expect(retry.disabled).toBe(false);

    account.me.mockImplementation(
      () => new Promise<MeResponse>(() => {}), // never settles
    );
    const inFlight = page.retryProfile();
    fixture.detectChanges();

    expect(retry.textContent).toContain('Retrying…');
    expect(retry.disabled).toBe(true);
    // Double-click gives no feedback and no second request (single-flight).
    retry.click();
    await fixture.whenStable();
    expect(account.me).toHaveBeenCalledTimes(2); // the initial + this retry only
    void inFlight;
  });

  // ---- identity edit (password-confirmed) ----------------------------------

  it('Edit opens the form pre-filled with the current values', async () => {
    const { page, element, fixture } = await open();

    page.startEdit();
    fixture.detectChanges();

    expect(element.querySelector('#profile-name')).not.toBeNull();
    expect(element.querySelector('#profile-password')).not.toBeNull();
    expect(page.editName.value).toBe('Kontakt Muutus');
    expect(page.editPassword.value).toBe('');
  });

  it('does not submit an empty edit form and shows required errors', async () => {
    const { page, fixture } = await open();
    page.startEdit();
    page.editName.setValue('');
    page.editPassword.setValue('');

    await page.saveProfile();
    fixture.detectChanges();

    expect(account.updateProfile).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('A name is required.');
    expect(text(fixture)).toContain('Your current password is required.');
  });

  it('wires field errors to the controls (aria-invalid + describedby + alert, WCAG 4.1.3)', async () => {
    const { page, element, fixture } = await open();
    page.startEdit();
    page.editName.setValue('');
    page.editPassword.setValue('');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    await page.saveProfile();
    fixture.detectChanges();

    for (const id of ['profile-name', 'profile-password']) {
      const input = element.querySelector(`input#${id}`) as HTMLInputElement;
      expect(input.getAttribute('aria-invalid'), id).toBe('true');
      expect(input.getAttribute('aria-describedby'), id).toBe(`${id}-error`);
      const error = root.querySelector(`#${id}-error`);
      expect(error, id).not.toBeNull();
      expect(error?.getAttribute('role'), id).toBe('alert');
    }

    // The change-panel fields wire the same way (touched + invalid).
    const newEmail = element.querySelector('input#change-email-new') as HTMLInputElement;
    expect(newEmail.getAttribute('aria-invalid')).toBeNull(); // pristine
    page.newEmail.markAsTouched();
    fixture.detectChanges();
    expect(newEmail.getAttribute('aria-invalid')).toBe('true');
    expect(newEmail.getAttribute('aria-describedby')).toBe('change-email-new-error');
    expect(root.querySelector('#change-email-new-error')?.getAttribute('role')).toBe('alert');
  });

  it('successful edit persists via updateProfile, re-fetches, and shows the new values', async () => {
    const { page, element, fixture } = await open();
    page.startEdit();
    page.editName.setValue('Korrektitud Nimi');
    page.editPassword.setValue('s3cret');

    // The backend persists and the re-fetch reflects it.
    const UPDATED: MeResponse = {
      ...PROFILE,
      name: 'Korrektitud Nimi',
    };
    account.updateProfile.mockResolvedValue(UPDATED);
    account.me.mockResolvedValue(UPDATED);

    await page.saveProfile();
    fixture.detectChanges();

    expect(account.updateProfile).toHaveBeenCalledWith({
      name: 'Korrektitud Nimi',
      currentPassword: 's3cret',
    });
    // the form closed, the card shows the server state
    expect(element.querySelector('#profile-password')).toBeNull();
    expect(element.textContent).toContain('Korrektitud Nimi');
    expect(element.textContent).toContain('Your profile has been updated.');
    expect(page.editPassword.value).toBe('');
  });

  it('a wrong current password (401) surfaces the inline error and changes nothing', async () => {
    const { page, element, fixture } = await open();
    page.startEdit();
    page.editPassword.setValue('not-the-password');

    account.updateProfile.mockRejectedValue(
      apiError(401, 'current password is incorrect', '/account/profile'),
    );

    await page.saveProfile();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('current password is incorrect');
    // still in the edit form — the password can be corrected
    expect(element.querySelector('#profile-password')).not.toBeNull();
    // the store is untouched
    expect(store.name()).toBe('Kontakt Muutus');
  });

  it('a validation 400 (blank field) echoes the backend message', async () => {
    const { page, element, fixture } = await open();
    page.startEdit();
    page.editPassword.setValue('s3cret');

    account.updateProfile.mockRejectedValue(
      apiError(400, 'name must not be blank', '/account/profile'),
    );

    await page.saveProfile();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('name must not be blank');
    expect(element.querySelector('#profile-password')).not.toBeNull();
  });

  it('Cancel closes the edit form without calling the gateway', async () => {
    const { page, element, fixture } = await open();
    page.startEdit();
    fixture.detectChanges();

    page.cancelEdit();
    fixture.detectChanges();

    expect(element.querySelector('#profile-name')).toBeNull();
    expect(page.editPassword.value).toBe('');
    expect(account.updateProfile).not.toHaveBeenCalled();
  });

  // ---- contact change panels -----------------------------------------------

  it('renders both change panels with cross-channel proof copy naming the channel', async () => {
    const { element } = await open();

    expect(element.textContent).toContain('Change email address');
    expect(element.textContent).toContain('Change phone number');
    // Changing email is proven via the PHONE; changing phone via the EMAIL.
    expect(element.textContent).toContain('SMS code sent to the phone');
    expect(element.textContent).toContain('email code sent to the email');
    expect(element.querySelector('#change-email-new')).not.toBeNull();
    expect(element.querySelector('#change-phone-new')).not.toBeNull();
  });

  it('email send -> 202: normalises the address and moves to the code phase', async () => {
    const { page, element, fixture } = await open();
    // No surrounding whitespace: Validators.email rejects padded addresses
    // — the gateway must receive the lowercased form.
    page.newEmail.setValue('New@Example.EE');
    account.requestEmailChange.mockResolvedValue(ACK);

    await page.emailSend();
    fixture.detectChanges();

    expect(account.requestEmailChange).toHaveBeenCalledWith('new@example.ee');
    expect(element.querySelector('#change-email-code')).not.toBeNull();
    // The backend pins the target at request time — the target input
    // is locked for the rest of the flow.
    expect((element.querySelector('#change-email-new') as HTMLInputElement).disabled).toBe(true);
    expect(element.textContent).toContain(
      'We sent an SMS code to the phone number on your account.',
    );
    expect(element.textContent).toContain('Confirm new email');
    // The successful send immediately starts the per-change-type cooldown.
    expect(element.textContent).toContain('Resend in 1m 00s');
  });

  it('the code phase locks the phone target input too (F5)', async () => {
    const { page, element, fixture } = await open();
    page.newPhone.setValue('+37250000002');
    account.requestPhoneChange.mockResolvedValue(ACK);

    await page.phoneSend();
    fixture.detectChanges();

    expect((element.querySelector('#change-phone-new') as HTMLInputElement).disabled).toBe(true);
  });

  it('the done state renders the server truth, not the form value (F5)', async () => {
    const { page, element, fixture } = await open();
    // The user types a local phone form; the backend stores E.164.
    page.newPhone.setValue('50000003');
    account.requestPhoneChange.mockResolvedValue(ACK);
    await page.phoneSend();

    page.phoneCode.setValue('654321');
    account.confirmPhoneChange.mockResolvedValue(undefined);
    account.me.mockResolvedValue({ ...PROFILE, phone: '+37250000003' });
    await page.phoneConfirm();
    fixture.detectChanges();

    // The done copy shows the server's E.164, not the raw local form value.
    expect(text(fixture)).toContain('Your phone is now');
    const doneCopy = [...element.querySelectorAll('.panel-copy')].find((p) =>
      p.textContent?.includes('Your phone is now'),
    );
    expect(doneCopy?.querySelector('strong')?.textContent?.trim()).toBe('+37250000003');
  });

  it('startOver clears a stale confirm error (N14)', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(ACK);
    await page.emailSend();

    page.emailCode.setValue('000000');
    account.confirmEmailChange.mockRejectedValue(
      apiError(400, 'invalid code', '/account/email-change/confirm'),
    );
    await page.emailConfirm();
    fixture.detectChanges();
    expect(element.querySelector('.banner--error')).not.toBeNull();

    page.emailStartOver();
    fixture.detectChanges();

    // Back in the form phase with the stale 400 banner gone.
    expect(element.querySelector('.banner--error')).toBeNull();
    expect(element.querySelector('#change-email-code')).toBeNull();
  });

  it('email confirm success re-fetches the profile and shows the new value', async () => {
    const { page, element, fixture } = await open();
    // Session is live first (the page only renders for authenticated users).
    auth.login.mockResolvedValue(PAIR);
    await store.login('kontakt@example.ee', 's3cret');

    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(ACK);
    await page.emailSend();

    page.emailCode.setValue('123456');
    account.confirmEmailChange.mockResolvedValue(undefined);
    // The re-fetch after the change reflects the new contact.
    account.me.mockResolvedValue({ ...PROFILE, email: 'new@example.ee' });
    await page.emailConfirm();
    fixture.detectChanges();

    expect(account.confirmEmailChange).toHaveBeenCalledWith('123456');
    expect(element.textContent).toContain('Your email address has been changed.');
    expect(element.textContent).toContain('new@example.ee');
    // the REAL contact value moved with the re-fetch
    expect(store.email()).toBe('new@example.ee');
    // Contact change never logs anyone out (only a password reset does).
    expect(store.authenticated()).toBe(true);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('a request 400 (same as current) gets the must-differ copy', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('same@example.ee');
    account.requestEmailChange.mockRejectedValue(
      apiError(400, 'new email equals the current email', '/account/email-change/request'),
    );

    await page.emailSend();
    fixture.detectChanges();

    expect(text(fixture)).toContain('the new one must be different');
    // Still on the form — no code phase was entered.
    expect(element.querySelector('#change-email-code')).toBeNull();
  });

  it('an over-length new email is rejected by the inline validator, no 400 shown (M6)', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('a'.repeat(250) + '@example.ee'); // 261 > 255

    await page.emailSend();
    fixture.detectChanges();

    // The request never went out — the maxLength validator blocked it.
    expect(account.requestEmailChange).not.toHaveBeenCalled();
    expect(element.querySelector('.banner--error')).toBeNull();
    const field = element.querySelector('#change-email-new')!.closest('.field') as HTMLElement;
    expect(field?.textContent).toContain('Email must be 255 characters or fewer.');
  });

  it('an over-length new phone is rejected by the inline validator, no 400 shown (M6)', async () => {
    const { page, element, fixture } = await open();
    page.newPhone.setValue('+3725' + '0'.repeat(70)); // 74 > 64

    await page.phoneSend();
    fixture.detectChanges();

    expect(account.requestPhoneChange).not.toHaveBeenCalled();
    expect(element.querySelector('.banner--error')).toBeNull();
    const field = element.querySelector('#change-phone-new')!.closest('.field') as HTMLElement;
    expect(field?.textContent).toContain('Phone must be 64 characters or fewer.');
  });

  it('the email maxLength boundary is exactly 255, and the input pins maxlength="255" (M6)', async () => {
    const { page, element } = await open();
    const input = element.querySelector('#change-email-new') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('255');
    expect(input.maxLength).toBe(255);

    // 255: at the boundary — the maxLength validator must NOT fire (the
    // control may still be invalid on the 254-char cap of the built-in
    // email format, but that is a different validator).
    page.newEmail.setValue('a'.repeat(244) + '@example.ee'); // 255
    expect(page.newEmail.hasError('maxlength')).toBe(false);

    // 256: one over — the boundary trips.
    page.newEmail.setValue('a'.repeat(245) + '@example.ee'); // 256
    expect(page.newEmail.hasError('maxlength')).toBe(true);
  });

  it('a 256-char new email is rejected inline, the request never goes out (M6)', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('a'.repeat(245) + '@example.ee'); // 256 > 255

    await page.emailSend();
    fixture.detectChanges();

    expect(account.requestEmailChange).not.toHaveBeenCalled();
    expect(element.querySelector('.banner--error')).toBeNull();
    const field = element.querySelector('#change-email-new')!.closest('.field') as HTMLElement;
    expect(field?.textContent).toContain('Email must be 255 characters or fewer.');
  });

  it('the phone maxLength boundary is exactly 64, and the input pins maxlength="64" (M6)', async () => {
    const { page, element, fixture } = await open();
    const input = element.querySelector('#change-phone-new') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('64');
    expect(input.maxLength).toBe(64);

    // 64: at the boundary — the control is fully valid, the flow proceeds
    // to the code phase (the phone has no format validator beyond length).
    page.newPhone.setValue('+3725' + '0'.repeat(59)); // 64
    account.requestPhoneChange.mockResolvedValue(ACK);
    await page.phoneSend();
    fixture.detectChanges();

    expect(page.newPhone.hasError('maxlength')).toBe(false);
    expect(account.requestPhoneChange).toHaveBeenCalledTimes(1);
    expect(element.querySelector('#change-phone-code')).not.toBeNull();
  });

  it('a 65-char new phone is rejected inline, the request never goes out (M6)', async () => {
    const { page, element, fixture } = await open();
    page.newPhone.setValue('+3725' + '0'.repeat(60)); // 65 > 64

    await page.phoneSend();
    fixture.detectChanges();

    expect(page.newPhone.hasError('maxlength')).toBe(true);
    expect(account.requestPhoneChange).not.toHaveBeenCalled();
    expect(element.querySelector('.banner--error')).toBeNull();
    const field = element.querySelector('#change-phone-new')!.closest('.field') as HTMLElement;
    expect(field?.textContent).toContain('Phone must be 64 characters or fewer.');
  });

  it('a request 409 (duplicate target) surfaces the backend message inline', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('taken@example.ee');
    account.requestEmailChange.mockRejectedValue(
      apiError(409, 'an account with this email already exists', '/account/email-change/request'),
    );

    await page.emailSend();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('an account with this email already exists');
    expect(text(fixture)).not.toContain('new email equals the current email');
  });

  it('a wrong/expired confirm code (400) shows generic copy, never the backend text', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(ACK);
    await page.emailSend();

    page.emailCode.setValue('000000');
    account.confirmEmailChange.mockRejectedValue(
      apiError(400, 'invalid code', '/account/email-change/confirm'),
    );
    await page.emailConfirm();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('That code is invalid or has expired');
    expect(banner?.textContent).not.toContain('invalid code');
    // Still in the code phase — the user can correct the code.
    expect(element.querySelector('#change-email-code')).not.toBeNull();
  });

  it('blocks a malformed 6-digit code client-side before hitting the gateway', async () => {
    const { page, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(ACK);
    await page.emailSend();

    page.emailCode.setValue('12AB34'); // letters — not a 6-digit OTP
    account.confirmEmailChange.mockResolvedValue(undefined);
    await page.emailConfirm();
    fixture.detectChanges();

    expect(account.confirmEmailChange).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Enter the 6-digit code from the SMS.');
  });

  it('phone flow: request by email code -> confirm updates the phone', async () => {
    const { page, element, fixture } = await open();
    page.newPhone.setValue('+37250000002');
    account.requestPhoneChange.mockResolvedValue(ACK);
    await page.phoneSend();
    fixture.detectChanges();

    expect(account.requestPhoneChange).toHaveBeenCalledWith('+37250000002');
    expect(element.textContent).toContain(
      'We sent an email code to the email address on your account.',
    );

    page.phoneCode.setValue('654321');
    account.confirmPhoneChange.mockResolvedValue(undefined);
    account.me.mockResolvedValue({ ...PROFILE, phone: '+37250000002' });
    await page.phoneConfirm();
    fixture.detectChanges();

    expect(account.confirmPhoneChange).toHaveBeenCalledWith('654321');
    expect(element.textContent).toContain('Your phone number has been changed.');
    expect(element.textContent).toContain('+37250000002');
    expect(store.phone()).toBe('+37250000002');
  });

  it('shows the loading state while a change request is in flight', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    let resolveRequest: (ack: typeof ACK) => void = () => {};
    account.requestEmailChange.mockReturnValue(
      new Promise((resolve) => (resolveRequest = resolve)),
    );

    const inFlight = page.emailSend();
    fixture.detectChanges();

    // The email panel's button shows its loading copy and is disabled
    // (busy() covers the whole page).
    expect(element.textContent).toContain('Sending…');
    for (const b of element.querySelectorAll<HTMLButtonElement>('button')) {
      expect(b.disabled).toBe(true);
    }
    expect(element.querySelector('.banner')).toBeNull();

    resolveRequest(ACK);
    await inFlight;
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Sending…');
  });

  // ---- My contributions (user-contributions) --------------------------------

  it('renders the My contributions panel with the shelter list', async () => {
    shelter.mine.mockResolvedValue([SHELTER_ROW]);
    const { element, fixture } = await open();
    // let the embedded panel's fire-and-forget loads settle, then re-render
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(element.textContent).toContain('My contributions');
    expect(element.textContent).toContain('Kommunaali Varjend');
  });

  it('shows the empty contributions states when the user has nothing', async () => {
    const { element } = await open();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toContain('My contributions');
    expect(element.textContent).toContain("You haven't submitted any shelters yet.");
    expect(element.querySelector('a[href="/submit"]')).not.toBeNull();
  });

  // ---- resend cooldowns (per change type) ----------------------------------

  describe('per-change-type resend cooldown (independent e-mail vs phone)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Under fake timers the shared open() cannot be used: its whenStable()
     *  wait is scheduled as a macrotask and would hang on the frozen clock.
     *  Navigation itself is microtask-based, so detectChanges suffices. */
    async function openInstant() {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      await store.init();
      await store.refreshProfile();
      await router.navigateByUrl('/account');
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      const debug: DebugElement = fixture.debugElement.query(By.directive(AccountPage));
      if (!debug) {
        throw new Error('AccountPage not rendered');
      }
      return {
        page: debug.componentInstance,
        element: debug.nativeElement as HTMLElement,
        fixture,
      };
    }

    function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
      return (
        [...root.querySelectorAll<HTMLButtonElement>('button')].find(
          (b) => (b.textContent ?? '').trim() === text,
        ) ?? null
      );
    }

    it('a successful email send disables its resend button with a live label until expiry', async () => {
      vi.useFakeTimers();
      const { page, element, fixture } = await openInstant();
      page.newEmail.setValue('new@example.ee');
      account.requestEmailChange.mockResolvedValue(ACK);

      await page.emailSend();
      fixture.detectChanges();

      expect(buttonByText(element, 'Resend in 1m 00s')?.disabled).toBe(true);
      // The phone panel is a different change type — its send button stays enabled.
      expect(buttonByText(element, 'Send email code to my email')?.disabled).toBe(false);

      await vi.advanceTimersByTimeAsync(60_000);
      fixture.detectChanges();
      expect(buttonByText(element, 'Resend code')?.disabled).toBe(false);
    });

    it('a 429 with Retry-After runs the countdown on the send button and shows the banner', async () => {
      vi.useFakeTimers();
      const { page, element, fixture } = await openInstant();
      page.newEmail.setValue('new@example.ee');
      account.requestEmailChange.mockRejectedValue(
        toApiError(
          new HttpErrorResponse({
            error: {
              timestamp: 't',
              status: 429,
              error: 'Too Many Requests',
              message: 'cooldown',
              path: '/account/email-change/request',
            },
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': '45' }),
          }),
        ),
      );

      await page.emailSend();
      fixture.detectChanges();

      expect(buttonByText(element, 'Send in 45s')?.disabled).toBe(true);
      expect(text(fixture)).toContain('Too many requests');
      expect(buttonByText(element, 'Send email code to my email')?.disabled).toBe(false);
    });

    it('a phone 429 only cools down the phone panel', async () => {
      vi.useFakeTimers();
      const { page, element, fixture } = await openInstant();
      page.newPhone.setValue('+37250000002');
      account.requestPhoneChange.mockRejectedValue(
        toApiError(
          new HttpErrorResponse({
            error: {
              timestamp: 't',
              status: 429,
              error: 'Too Many Requests',
              message: 'cooldown',
              path: '/account/phone-change/request',
            },
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': '45' }),
          }),
        ),
      );

      await page.phoneSend();
      fixture.detectChanges();

      expect(buttonByText(element, 'Send in 45s')?.disabled).toBe(true);
      expect(buttonByText(element, 'Send SMS code to my phone')?.disabled).toBe(false);
    });
  });

  // ---- your data: export download (legal-recovery) -----------------------------

  describe('your data (export)', () => {
    it('the export button fetches /account/export and downloads a JSON file', async () => {
      const doc = {
        profile: {
          name: 'Kontakt Muutus',
          email: 'kontakt@example.ee',
          phone: '+37250004444',
          levels: [],
        },
        shelters: [],
      };
      account.exportData.mockResolvedValue(doc);
      const createObjectURL = vi.fn(() => 'blob:fake');
      const revokeObjectURL = vi.fn();
      Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
      const clickedRef: { el: HTMLAnchorElement | null } = { el: null };
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clickedRef.el = this;
      });

      const { page, element, fixture } = await open();
      const button = element.querySelector<HTMLButtonElement>('#download-data');
      expect(button).not.toBeNull();

      await page.downloadData();
      fixture.detectChanges();

      expect(account.exportData).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      expect(clickedRef.el).not.toBeNull();
      expect(clickedRef.el?.download).toMatch(/^openshelter-data-export-\d{4}-\d{2}-\d{2}\.json$/);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(text(fixture)).toContain('Your data export has been downloaded.');
      click.mockRestore();
    });

    it('a failed export shows the banner and downloads nothing', async () => {
      account.exportData.mockRejectedValue(apiError(500, 'boom', '/account/export'));
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const { page, fixture } = await open();

      await page.downloadData();
      fixture.detectChanges();

      expect(account.exportData).toHaveBeenCalledTimes(1);
      expect(click).not.toHaveBeenCalled();
      expect(text(fixture)).toContain('Something went wrong. Please try again.');
      click.mockRestore();
    });
  });

  describe('delete account (M4 slice 2)', () => {
    it('the provisioned admin gets no delete controls — only the explanation', async () => {
      // The env-provisioned administrator (kind ADMIN — the profile's
      // isAdmin): the type-to-confirm input and the delete button are
      // ABSENT (the server would refuse the call with 403 anyway), and the
      // panel says why instead.
      account.me.mockResolvedValue({ ...PROFILE, isAdmin: true });
      const { page, element, fixture } = await open();
      expect(store.isAdmin()).toBe(true);

      expect(element.querySelector('#delete-account')).toBeNull();
      expect(element.querySelector('#delete-confirm')).toBeNull();
      expect(text(fixture)).toContain(
        'This account was provisioned by the deployment environment, so it cannot be deleted from the app.',
      );
      // the explanation names the operator action, and calling the flow
      // directly still does nothing (no arming possible without the input)
      expect(text(fixture)).toContain('ADMIN_EMAIL');
      await page.deleteAccount();
      fixture.detectChanges();
      expect(account.deleteAccount).not.toHaveBeenCalled();
    });

    it('an ordinary account still renders the full delete flow', async () => {
      const { element, fixture } = await open();
      expect(store.isAdmin()).toBe(false);
      expect(element.querySelector('#delete-account')).not.toBeNull();
      expect(element.querySelector('#delete-confirm')).not.toBeNull();
      expect(text(fixture)).not.toContain('provisioned by the deployment environment');
    });

    it('the delete button stays disarmed until DELETE is typed', async () => {
      const { page, element, fixture } = await open();
      const button = element.querySelector<HTMLButtonElement>('#delete-account');
      expect(button).not.toBeNull();
      expect(button?.disabled).toBe(true);

      page.deleteConfirm.setValue('del');
      fixture.detectChanges();
      expect(button?.disabled).toBe(true);

      page.deleteConfirm.setValue('DELETE');
      fixture.detectChanges();
      expect(button?.disabled).toBe(false);
    });

    it('a confirmed delete erases the account, ends the session and leaves for the map', async () => {
      const { page, fixture } = await open();
      expect(store.name()).toBe('Kontakt Muutus');
      page.deleteConfirm.setValue('DELETE');
      fixture.detectChanges();

      await page.deleteAccount();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(account.deleteAccount).toHaveBeenCalledTimes(1);
      expect(store.name()).toBeNull(); // the local session is cleared
      expect(router.url).toBe('/map');
    });

    it('a failed delete shows the banner and keeps the session', async () => {
      account.deleteAccount.mockRejectedValue(apiError(500, 'boom', '/account'));
      const { page, fixture } = await open();
      page.deleteConfirm.setValue('DELETE');
      fixture.detectChanges();

      await page.deleteAccount();
      fixture.detectChanges();

      expect(store.name()).toBe('Kontakt Muutus'); // session intact
      expect(router.url).toBe('/account');
      expect(text(fixture)).toContain('Something went wrong. Please try again.');
    });

    it('an untyped confirm is a no-op — no request, no logout', async () => {
      const { page, fixture } = await open();

      await page.deleteAccount();
      fixture.detectChanges();

      expect(account.deleteAccount).not.toHaveBeenCalled();
      expect(store.name()).toBe('Kontakt Muutus');
      expect(router.url).toBe('/account');
    });
  });
});

// ---------------------------------------------------------------------------
// 360px viewport (M13, mobile-responsive-polish): no page-level horizontal
// overflow on the proof notes (wave 15 changed their boundary today — the
// 3px left accent border is gone, the subtle background fill is the note's
// boundary now; the boundary itself is pinned in design-tokens.spec.ts,
// this is the 360px half). jsdom cannot measure a 360px viewport (no layout
// engine), so — like the M13 pins in shelter-detail-page.spec.ts — the
// mechanism is pinned against the stylesheet. 360px viewport − 2 × 20px
// .shell-body padding (page-shell.scss) = 320px of content on /account.
// ---------------------------------------------------------------------------
describe('no page-level horizontal overflow at 360px (M13 mechanism)', () => {
  it('the proof note is a full-width wrapping block — no fixed width, no nowrap: the channel-proof line wraps inside the 320px content column instead of outgrowing the viewport', () => {
    const scss = readFileSync(
      `${process.cwd()}/src/app/features/account/account-page.scss`,
      'utf8',
    );
    const note = scss.match(/\.proof-note \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(note, 'the proof note rule must exist').not.toEqual('');
    expect(
      note,
      'a fixed px width past 320px is wider than the 360px content — the note is a plain block of its column',
    ).not.toMatch(/^\s*width:\s*\d/m);
    expect(
      note,
      'the note text is a translated string in three locales — a nowrap would make the longest one the page-level overflow',
    ).not.toMatch(/white-space:\s*nowrap/);
  });
});
