import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthGateway } from '../../gateways/auth-gateway';
import { AccountGateway } from '../../gateways/account-gateway';
import { AuthStore } from '../../core/auth-store';
import type { TokenResponse } from '../../core/models';
import { ContactChangePage } from './contact-change-page';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

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
  requestEmailChange = vi.fn();
  confirmEmailChange = vi.fn();
  requestPhoneChange = vi.fn();
  confirmPhoneChange = vi.fn();
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

@Component({ template: '<p>stub</p>' })
class Stub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('ContactChangePage', () => {
  let account: FakeAccountGateway;
  let auth: FakeAuthGateway;
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    account = new FakeAccountGateway();
    auth = new FakeAuthGateway();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'map', component: Stub },
          { path: 'account', component: ContactChangePage },
        ]),
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
        { provide: AuthGateway, useValue: auth as unknown as AuthGateway },
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  async function open(): Promise<{
    page: ContactChangePage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl('/account');
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(ContactChangePage));
    if (!debug) {
      throw new Error('ContactChangePage not rendered');
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<Host>>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders both change panels with cross-channel proof copy naming the channel', async () => {
    const { element } = await open();

    expect(element.textContent).toContain('Email address');
    expect(element.textContent).toContain('Phone number');
    // Changing email is proven via the PHONE; changing phone via the EMAIL.
    const emailPanel = element.querySelector('.change-panel');
    expect(emailPanel?.textContent).toContain('SMS code sent to the phone');
    expect(element.textContent).toContain('email code sent to the email');
    expect(element.querySelector('#change-email-new')).not.toBeNull();
    expect(element.querySelector('#change-phone-new')).not.toBeNull();
  });

  it('points unverified users at /verify', async () => {
    const { element } = await open();
    expect(element.querySelector('a[href="/verify"]')).not.toBeNull();
  });

  it('email send -> 202: normalises the address and moves to the code phase', async () => {
    const { page, element, fixture } = await open();
    // No surrounding whitespace: Validators.email rejects padded addresses
    // (M2 finding) — the gateway must receive the lowercased form.
    page.newEmail.setValue('New@Example.EE');
    account.requestEmailChange.mockResolvedValue(undefined);

    await page.emailSend();
    fixture.detectChanges();

    expect(account.requestEmailChange).toHaveBeenCalledWith('new@example.ee');
    expect(element.querySelector('#change-email-code')).not.toBeNull();
    expect(element.textContent).toContain(
      'We sent an SMS code to the phone number on your account.',
    );
    expect(element.textContent).toContain('Confirm new email');
    expect(element.textContent).toContain('Resend code');
  });

  it('does not send an invalid (blank / bad-format) new email', async () => {
    const { page, fixture } = await open();
    page.newEmail.setValue('not-an-email');
    account.requestEmailChange.mockResolvedValue(undefined);

    await page.emailSend();
    fixture.detectChanges();

    expect(account.requestEmailChange).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('A valid email is required.');
  });

  it('email confirm success shows the new value and does NOT revoke the session', async () => {
    const { page, element, fixture } = await open();
    // Session is live first.
    auth.login.mockResolvedValue(PAIR);
    await store.login('old@example.ee', 'secret');

    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(undefined);
    await page.emailSend();

    page.emailCode.setValue('123456');
    account.confirmEmailChange.mockResolvedValue(undefined);
    await page.emailConfirm();
    fixture.detectChanges();

    expect(account.confirmEmailChange).toHaveBeenCalledWith('123456');
    expect(element.textContent).toContain('Your email address has been changed.');
    expect(element.textContent).toContain('new@example.ee');
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

  it('a request 429 maps to the account rate-limit copy', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('slow@example.ee');
    account.requestEmailChange.mockRejectedValue(
      apiError(429, 'too many requests', '/account/email-change/request'),
    );

    await page.emailSend();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('Too many requests');
    // Still on the form — no code phase was entered.
    expect(element.querySelector('#change-email-code')).toBeNull();
  });

  it('blocks a malformed 6-digit code client-side before hitting the gateway', async () => {
    const { page, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(undefined);
    await page.emailSend();

    page.emailCode.setValue('12AB34'); // letters — not a 6-digit OTP
    account.confirmEmailChange.mockResolvedValue(undefined);
    await page.emailConfirm();
    fixture.detectChanges();

    expect(account.confirmEmailChange).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Enter the 6-digit code from the SMS.');
  });

  it('a wrong/expired confirm code (400) shows generic copy, never the backend text', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(undefined);
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

  it('cancel returns to the form and clears the code entry', async () => {
    const { page, element, fixture } = await open();
    page.newEmail.setValue('new@example.ee');
    account.requestEmailChange.mockResolvedValue(undefined);
    await page.emailSend();
    fixture.detectChanges();
    expect(element.querySelector('#change-email-code')).not.toBeNull();

    page.emailStartOver();
    fixture.detectChanges();

    expect(element.querySelector('#change-email-code')).toBeNull();
    expect(page.emailCode.value).toBe('');
  });

  it('phone flow: request by email code -> confirm updates the phone', async () => {
    const { page, element, fixture } = await open();
    page.newPhone.setValue('+37250000002');
    account.requestPhoneChange.mockResolvedValue(undefined);
    await page.phoneSend();
    fixture.detectChanges();

    expect(account.requestPhoneChange).toHaveBeenCalledWith('+37250000002');
    expect(element.textContent).toContain(
      'We sent an email code to the email address on your account.',
    );

    page.phoneCode.setValue('654321');
    account.confirmPhoneChange.mockResolvedValue(undefined);
    await page.phoneConfirm();
    fixture.detectChanges();

    expect(account.confirmPhoneChange).toHaveBeenCalledWith('654321');
    expect(element.textContent).toContain('Your phone number has been changed.');
    expect(element.textContent).toContain('+37250000002');
  });

  it('duplicate phone target -> 409 backend message shown', async () => {
    const { page, element, fixture } = await open();
    page.newPhone.setValue('+37250000001');
    account.requestPhoneChange.mockRejectedValue(
      apiError(409, 'an account with this phone already exists', '/account/phone-change/request'),
    );

    await page.phoneSend();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('an account with this phone already exists');
    expect(element.querySelector('#change-phone-code')).toBeNull();
  });
});
