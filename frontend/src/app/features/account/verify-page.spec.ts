import { Component, type DebugElement } from '@angular/core';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AccountGateway } from '../../gateways/account-gateway';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthGateway } from '../../gateways/auth-gateway';
import { VerifyGateway } from '../../gateways/verify-gateway';
import { AuthStore } from '../../session/auth-store';
import type { MeResponse } from '../../core/models';
import { VerifyPage } from './verify-page';

const PROFILE: MeResponse = {
  name: 'Test User',
  email: 'test@example.ee',
  phone: '+37250000001',
  nationalIdCode: '49901019999',
  levels: [],
  isAdmin: false,
};

/** The ack body of a successful code send (the server's cooldown in seconds). */
const ACK = { resendAvailableAfterSeconds: 60 };

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
}

class FakeVerifyGateway {
  request = vi.fn();
  confirm = vi.fn();
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('VerifyPage', () => {
  let verifyGateway: FakeVerifyGateway;
  let authGateway: FakeAuthGateway;
  let account: FakeAccountGateway;
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    verifyGateway = new FakeVerifyGateway();
    authGateway = new FakeAuthGateway();
    account = new FakeAccountGateway();
    account.me.mockResolvedValue(PROFILE);
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'verify', component: VerifyPage },
        ]),
        { provide: VerifyGateway, useValue: verifyGateway as unknown as VerifyGateway },
        { provide: AuthGateway, useValue: authGateway as unknown as AuthGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  async function open(): Promise<{
    page: VerifyPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl('/verify');
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(VerifyPage));
    if (!debug) {
      throw new Error('VerifyPage not rendered');
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<Host>>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('offers EMAIL and PHONE only — SMART_ID stays hidden (backend stub)', async () => {
    const { element } = await open();

    expect(element.textContent).toContain('Send code to my email');
    expect(element.textContent).toContain('Text code to my phone');
    expect(element.textContent).toContain('Not verified · email');
    expect(element.textContent).not.toContain('SMART');
    expect(element.querySelector('#verify-code-email')).toBeNull();
  });

  it('request(EMAIL) -> 202 moves that panel into the code-entry phase', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockResolvedValue(ACK);

    await page.request('EMAIL');
    fixture.detectChanges();

    expect(verifyGateway.request).toHaveBeenCalledWith('EMAIL');
    const input = element.querySelector('#verify-code-email') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    // The 8-char format lives in the placeholder + error hint, not static text.
    expect(input?.placeholder).toBe('8-character code');
    expect(element.querySelector('label[for="verify-code-email"]')).not.toBeNull();
    expect(element.textContent).toContain('Verify');
    // The successful send immediately starts the per-channel cooldown.
    expect(element.textContent).toContain('Resend in 1m 00s');
    expect(text(fixture)).toContain('Text code to my phone');
  });

  it('does not call confirm while the code is malformed (format mirrors the backend)', async () => {
    const { page, fixture } = await open();
    verifyGateway.request.mockResolvedValue(ACK);
    await page.request('PHONE');
    fixture.detectChanges();
    page.codes.PHONE.setValue('12345'); // 5 digits, not 6
    verifyGateway.confirm.mockResolvedValue(undefined);

    await page.confirm('PHONE');
    fixture.detectChanges();

    expect(verifyGateway.confirm).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Enter the 6-digit code from the SMS.');
  });

  it('confirm success re-fetches the profile — the panel disappears', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockResolvedValue(ACK);
    verifyGateway.confirm.mockResolvedValue(undefined);
    await page.request('EMAIL');
    fixture.detectChanges();
    // The backend now holds the claim — the re-fetched profile reflects it.
    account.me.mockResolvedValue({ ...PROFILE, levels: ['EMAIL'] });

    page.codes.EMAIL.setValue('AB12CD34');
    await page.confirm('EMAIL');
    fixture.detectChanges();

    expect(verifyGateway.confirm).toHaveBeenCalledWith('EMAIL', 'AB12CD34');
    expect(account.me).toHaveBeenCalledTimes(1); // refreshProfile after confirm
    expect(store.levels()).toContain('EMAIL');
    expect(store.isVerified()).toBe(true);
    expect(element.textContent).not.toContain('Send code to my email');
    expect(element.textContent).toContain('Text code to my phone');
    expect(element.textContent).toContain('Your email is verified.');
  });

  it('a 409 on request means already verified — re-fetches the profile, informs, never errors', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockRejectedValue(
      apiError(409, 'already verified: PHONE', '/verify/request'),
    );
    // The server says the claim exists — the re-fetched profile carries it.
    account.me.mockResolvedValue({ ...PROFILE, levels: ['PHONE'] });

    await page.request('PHONE');
    fixture.detectChanges();

    expect(account.me).toHaveBeenCalledTimes(1); // refreshProfile after 409
    expect(store.levels()).toContain('PHONE');
    expect(verifyGateway.confirm).not.toHaveBeenCalled();
    expect(element.textContent).toContain('already verified');
    expect(element.querySelector('.banner--error')).toBeNull();
    expect(element.textContent).not.toContain('Text code to my phone');
  });

  it('a 429 maps to the verify rate-limit copy (cooldown/daily cap, no retry)', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockRejectedValue(
      apiError(429, 'too many verification requests', '/verify/request'),
    );

    await page.request('EMAIL');
    fixture.detectChanges();

    expect(element.textContent).toContain('Too many codes have been requested');
  });

  it('a wrong/expired code (400) shows generic copy — never the backend text', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockResolvedValue(ACK);
    await page.request('EMAIL');
    fixture.detectChanges();

    page.codes.EMAIL.setValue('ZZZZZZZZ');
    verifyGateway.confirm.mockRejectedValue(
      apiError(400, 'invalid or expired verification code', '/verify/confirm'),
    );
    await page.confirm('EMAIL');
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('That code is invalid or has expired');
    expect(banner?.textContent).not.toContain('invalid or expired verification code');
    expect(store.levels()).not.toContain('EMAIL');
  });

  it('shows the loading state while a code request is in flight', async () => {
    const { page, element, fixture } = await open();
    let resolveRequest: (ack: typeof ACK) => void = () => {};
    verifyGateway.request.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));

    const inFlight = page.request('EMAIL');
    fixture.detectChanges();

    // The requesting button shows its loading copy and every panel action is
    // disabled while the request is in flight (no double sends, no error).
    expect(element.textContent).toContain('Sending…');
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(b.disabled).toBe(true);
    }
    expect(element.querySelector('.banner')).toBeNull();

    resolveRequest(ACK);
    await inFlight;
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Sending…');
  });

  it('resend hits request() again from the code phase', async () => {
    const { page } = await open();
    verifyGateway.request.mockResolvedValue(ACK);
    await page.request('EMAIL');
    verifyGateway.request.mockClear();

    await page.request('EMAIL'); // the resend button calls the same method

    expect(verifyGateway.request).toHaveBeenCalledTimes(1);
    expect(verifyGateway.request).toHaveBeenCalledWith('EMAIL');
  });

  it('shows the fully-verified panel once the fetched profile has both levels', async () => {
    account.me.mockResolvedValue({ ...PROFILE, levels: ['EMAIL', 'PHONE'] });
    await store.refreshProfile();
    const { element } = await open();

    expect(element.textContent).toContain("You're fully verified");
    expect(element.textContent).not.toContain('Send code to my email');
  });

  describe('per-channel resend cooldown (independent e-mail vs phone)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Under fake timers the shared open() cannot be used: its whenStable()
     *  wait is scheduled as a macrotask and would hang on the frozen clock.
     *  Navigation itself is microtask-based, so detectChanges suffices. */
    async function openInstant() {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      await router.navigateByUrl('/verify');
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      const debug: DebugElement = fixture.debugElement.query(By.directive(VerifyPage));
      if (!debug) {
        throw new Error('VerifyPage not rendered');
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

    it('a successful send runs the per-channel countdown on the resend button', async () => {
      vi.useFakeTimers();
      const { page, element, fixture } = await openInstant();
      verifyGateway.request.mockResolvedValue(ACK);

      await page.request('EMAIL');
      fixture.detectChanges();

      // The EMAIL panel resends from the countdown...
      expect(buttonByText(element, 'Resend in 1m 00s')?.disabled).toBe(true);
      // ...while the PHONE channel is untouched — its send button stays enabled.
      expect(buttonByText(element, 'Text code to my phone')?.disabled).toBe(false);

      await vi.advanceTimersByTimeAsync(60_000);
      fixture.detectChanges();
      expect(buttonByText(element, 'Resend code')?.disabled).toBe(false);
    });

    it('a 429 with Retry-After runs the countdown on the idle send button', async () => {
      vi.useFakeTimers();
      const { page, element, fixture } = await openInstant();
      verifyGateway.request.mockRejectedValue(
        toApiError(
          new HttpErrorResponse({
            error: {
              timestamp: 't',
              status: 429,
              error: 'Too Many Requests',
              message: 'cooldown',
              path: '/verify/request',
            },
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': '45' }),
          }),
        ),
      );

      await page.request('EMAIL');
      fixture.detectChanges();

      // Still the idle phase (no code was sent) — the send button waits out
      // the 45 s and the banner keeps its generic copy.
      expect(buttonByText(element, 'Send in 45s')?.disabled).toBe(true);
      expect(element.textContent).toContain('Too many codes have been requested');
      expect(buttonByText(element, 'Text code to my phone')?.disabled).toBe(false);

      await vi.advanceTimersByTimeAsync(45_000);
      fixture.detectChanges();
      expect(buttonByText(element, 'Send code to my email')?.disabled).toBe(false);
    });

    it('a 409 starts no countdown — the already-verified handling is unchanged', async () => {
      vi.useFakeTimers();
      const { page, element, fixture } = await openInstant();
      verifyGateway.request.mockRejectedValue(
        apiError(409, 'already verified: EMAIL', '/verify/request'),
      );
      account.me.mockResolvedValue({ ...PROFILE, levels: ['EMAIL'] });

      await page.request('EMAIL');
      fixture.detectChanges();

      expect(element.textContent).toContain('already verified');
      // The PHONE channel's button never showed a countdown.
      expect(buttonByText(element, 'Text code to my phone')?.disabled).toBe(false);
    });
  });
});
