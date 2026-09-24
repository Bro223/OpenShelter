import { Component, type DebugElement } from '@angular/core';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AuthGateway } from '../../gateways/auth-gateway';
import { I18nService } from '../../core/i18n/i18n.service';
import { ApiError, toApiError } from '../../core/api-error';
import { ResetPage } from './reset-page';

/** The ack body of a successful send (the server's cooldown in seconds). */
const ACK = { resendAvailableAfterSeconds: 60 };

/** Hand-written fake gateway — the page never sees HTTP. */
class FakeAuthGateway {
  register = vi.fn();
  login = vi.fn();
  refresh = vi.fn();
  logout = vi.fn();
  requestPasswordReset = vi.fn();
  resetPassword = vi.fn();
}

@Component({ template: '<p>login stub</p>' })
class LoginStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('ResetPage', () => {
  let gateway: FakeAuthGateway;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'login', component: LoginStub },
          { path: 'reset', component: ResetPage },
        ]),
        { provide: AuthGateway, useValue: gateway as unknown as AuthGateway },
      ],
    });
    router = TestBed.inject(Router);
  });

  async function open(
    url: string,
  ): Promise<{ page: ResetPage; fixture: ReturnType<typeof TestBed.createComponent<Host>> }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(ResetPage));
    if (!debug) {
      throw new Error('ResetPage not rendered');
    }
    return { page: debug.componentInstance, fixture };
  }

  /** Drives the request step and lands the page in the sent state. */
  async function request(
    page: ResetPage,
    fixture: ReturnType<typeof TestBed.createComponent<Host>>,
    email = 'test@example.ee',
  ) {
    page.requestForm.setValue({ email });
    gateway.requestPasswordReset.mockResolvedValue(ACK);
    await page.requestReset();
    fixture.detectChanges();
  }

  describe('request state', () => {
    it('sends the email to the gateway', async () => {
      const { page, fixture } = await open('/reset');

      await request(page, fixture);

      expect(gateway.requestPasswordReset).toHaveBeenCalledWith('test@example.ee');
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Check your inbox');
    });

    it('always shows the SAME anti-enumeration message — never the email', async () => {
      const { page, fixture } = await open('/reset');

      await request(page, fixture);

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('If an account exists for that email, a 6-digit code has been sent');
      expect(text).not.toContain('test@example.ee');
    });

    it('does not send an empty or invalid email', async () => {
      const { page, fixture } = await open('/reset');

      await page.requestReset();
      fixture.detectChanges();

      expect(gateway.requestPasswordReset).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'A valid email is required.',
      );
    });
  });

  describe('sent state (code + new password, in-page)', () => {
    it('confirms with email + code + password and navigates to /login?reset=ok', async () => {
      const { page, fixture } = await open('/reset');
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '123456',
        password: 'new-secret',
        passwordAgain: 'new-secret',
      });
      gateway.resetPassword.mockResolvedValue(undefined);

      await page.confirmReset();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(gateway.resetPassword).toHaveBeenCalledWith('test@example.ee', '123456', 'new-secret');
      expect(router.url).toBe('/login?reset=ok');
    });

    it('on 400 shows the generic banner and keeps the form usable', async () => {
      const { page, fixture } = await open('/reset');
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '654321',
        password: 'new-secret',
        passwordAgain: 'new-secret',
      });
      gateway.resetPassword.mockRejectedValue(
        ApiError.fromHttp(400, {
          timestamp: 't',
          status: 400,
          error: 'Bad Request',
          message: 'invalid or expired reset code',
          path: '/auth/password-reset/confirm',
        }),
      );

      await page.confirmReset();
      fixture.detectChanges();

      const banner = (fixture.nativeElement as HTMLElement).querySelector(
        '.banner--error',
      ) as HTMLElement | null;
      expect(banner?.textContent).toContain('invalid or has expired');
      // never echoes the backend message (or anything that reveals internals)
      expect(banner?.textContent).not.toContain('reset code');
      expect(page.mode()).toBe('sent');
      expect((fixture.nativeElement as HTMLElement).querySelector('#reset-code')).not.toBeNull();
      expect(router.url).toBe('/reset');
    });

    it('blocks a password mismatch without calling the gateway', async () => {
      const { page, fixture } = await open('/reset');
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '123456',
        password: 'one-secret',
        passwordAgain: 'other-secret',
      });
      page.confirmForm.markAllAsTouched();

      await page.confirmReset();
      fixture.detectChanges();

      expect(gateway.resetPassword).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'The passwords do not match.',
      );
    });

    it('exposes field errors to assistive tech (aria-invalid + describedby + alert, WCAG 4.1.3)', async () => {
      const { page, fixture } = await open('/reset');
      const root = fixture.nativeElement as HTMLElement;

      // Request step: the empty email is wired to its error line.
      await page.requestReset();
      fixture.detectChanges();
      const requestEmail = root.querySelector('input#reset-email') as HTMLInputElement;
      expect(requestEmail.getAttribute('aria-invalid')).toBe('true');
      expect(requestEmail.getAttribute('aria-describedby')).toBe('reset-email-error');
      expect(root.querySelector('#reset-email-error')?.getAttribute('role')).toBe('alert');

      // Sent step: the field NOTE is the description while the code is valid.
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '123456',
        password: 'one-secret',
        passwordAgain: 'one-secret',
      });
      fixture.detectChanges();
      const code = root.querySelector('input#reset-code') as HTMLInputElement;
      expect(code.getAttribute('aria-invalid')).toBeNull();
      expect(code.getAttribute('aria-describedby')).toBe('reset-code-note');

      // Mismatch (both filled, different): the alert region carries it.
      // setValue + FIRST markAllAsTouched mirrors the real input-event flow
      // that drives change detection on this OnPush page.
      page.confirmForm.setValue({
        code: '123456',
        password: 'one-secret',
        passwordAgain: 'other-secret',
      });
      page.confirmForm.markAllAsTouched();
      await page.confirmReset();
      fixture.detectChanges();
      const again = root.querySelector('input#reset-password-again') as HTMLInputElement;
      expect(again.getAttribute('aria-invalid')).toBe('true');
      expect(again.getAttribute('aria-describedby')).toBe('reset-password-again-error');
      const region = root.querySelector('#reset-password-again-error');
      expect(region?.getAttribute('role')).toBe('alert');
      expect(region?.textContent).toContain('The passwords do not match.');
      expect(region?.textContent).not.toContain('Please repeat the password.');

      // Empty repeat field: BOTH errors are visible at once — ONE region
      // holds both, and the input still points at it.
      page.confirmForm.controls.passwordAgain.setValue('');
      await page.confirmReset();
      fixture.detectChanges();
      expect(region?.textContent).toContain('Please repeat the password.');
      expect(region?.textContent).toContain('The passwords do not match.');
      expect(again.getAttribute('aria-invalid')).toBe('true');
      expect(again.getAttribute('aria-describedby')).toBe('reset-password-again-error');
    });

    it('blocks a non-6-digit code without calling the gateway', async () => {
      const { page, fixture } = await open('/reset');
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '12345',
        password: 'new-secret',
        passwordAgain: 'new-secret',
      });
      page.confirmForm.markAllAsTouched();

      await page.confirmReset();
      fixture.detectChanges();

      expect(gateway.resetPassword).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Enter the 6-digit code from the email.',
      );
    });

    it('blocks a password shorter than 8 characters (mirrors the server @Size(min = 8))', async () => {
      const { page, fixture } = await open('/reset');
      // The field-error copy for the length rule lives behind the
      // 'authPage.reset.newPasswordTooShort' key, which the i18n lane adds
      // to the catalog this wave (see report). The site-texts seam
      // installs that exact copy here, so the assertion holds both before
      // and after the key lands (override value === catalog value).
      TestBed.inject(I18nService).setSiteTexts({
        en: {
          'authPage.reset.newPasswordTooShort': {
            value: 'Password must be at least 8 characters long.',
          },
        },
        et: {},
        ru: {},
      });
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '123456',
        password: 'short',
        passwordAgain: 'short',
      });
      page.confirmForm.markAllAsTouched();

      await page.confirmReset();
      fixture.detectChanges();

      expect(gateway.resetPassword).not.toHaveBeenCalled();
      expect(page.confirmForm.controls.password.hasError('minlength')).toBe(true);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      // The length line — not the "required" line — is what shows for a
      // short (non-blank) password.
      expect(text).toContain('Password must be at least 8 characters long.');
      expect(text).not.toContain('Password is required.');
      // Boundary: exactly 8 characters is valid again.
      page.confirmForm.controls.password.setValue('12345678');
      expect(page.confirmForm.controls.password.hasError('minlength')).toBe(false);
      expect(page.confirmForm.invalid).toBe(false);
    });

    it('resends the code with the same email', async () => {
      const { page, fixture } = await open('/reset');
      await request(page, fixture);

      await page.resendCode();
      fixture.detectChanges();

      expect(gateway.requestPasswordReset).toHaveBeenCalledTimes(2);
      expect(gateway.requestPasswordReset).toHaveBeenLastCalledWith('test@example.ee');
      expect(page.mode()).toBe('sent');
    });

    it('does not confirm before a request has captured an email', async () => {
      const { page } = await open('/reset');
      page.confirmForm.setValue({
        code: '123456',
        password: 'new-secret',
        passwordAgain: 'new-secret',
      });

      await page.confirmReset();

      expect(gateway.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('resend cooldown (the server cooldown on the button)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Under fake timers the shared open() cannot be used: its whenStable()
     *  wait is scheduled as a macrotask and would hang on the frozen clock.
     *  Navigation itself is microtask-based, so detectChanges suffices. */
    async function openInstant() {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      await router.navigateByUrl('/reset');
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      const debug: DebugElement = fixture.debugElement.query(By.directive(ResetPage));
      if (!debug) {
        throw new Error('ResetPage not rendered');
      }
      return { page: debug.componentInstance, fixture };
    }

    function buttonByText(
      fixture: ReturnType<typeof TestBed.createComponent<Host>>,
      text: string,
    ): HTMLButtonElement | null {
      const root = fixture.nativeElement as HTMLElement;
      return (
        [...root.querySelectorAll<HTMLButtonElement>('button')].find(
          (b) => (b.textContent ?? '').trim() === text,
        ) ?? null
      );
    }

    it('a successful send disables the resend button with a live label until it expires', async () => {
      vi.useFakeTimers();
      const { page, fixture } = await openInstant();

      await request(page, fixture);

      expect(buttonByText(fixture, 'Resend in 1m 00s')?.disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(59_000);
      fixture.detectChanges();
      expect(buttonByText(fixture, 'Resend in 1s')?.disabled).toBe(true);

      // Expired — the button is back as a plain resend.
      await vi.advanceTimersByTimeAsync(1000);
      fixture.detectChanges();
      expect(buttonByText(fixture, 'Resend code')?.disabled).toBe(false);
    });

    it('a 429 with Retry-After runs the countdown on the send button and shows the banner', async () => {
      vi.useFakeTimers();
      const { page, fixture } = await openInstant();
      gateway.requestPasswordReset.mockRejectedValue(
        toApiError(
          new HttpErrorResponse({
            error: {
              timestamp: 't',
              status: 429,
              error: 'Too Many Requests',
              message: 'slow down',
              path: '/auth/password-reset/request',
            },
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': '45' }),
          }),
        ),
      );
      page.requestForm.setValue({ email: 'test@example.ee' });

      await page.requestReset();
      fixture.detectChanges();

      // The existing banner copy...
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Too many attempts');
      // ...and the send button runs the 45 s cooldown instead of a bare retry.
      expect(buttonByText(fixture, 'Send in 45s')?.disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(45_000);
      fixture.detectChanges();
      expect(buttonByText(fixture, 'Email me a reset code')?.disabled).toBe(false);
    });

    it('a 429 on CONFIRM runs the resend countdown from Retry-After and shows the rate-limit copy', async () => {
      vi.useFakeTimers();
      const { page, fixture } = await openInstant();
      await request(page, fixture);
      page.confirmForm.setValue({
        code: '123456',
        password: 'new-secret',
        passwordAgain: 'new-secret',
      });

      gateway.resetPassword.mockRejectedValue(
        toApiError(
          new HttpErrorResponse({
            error: {
              timestamp: 't',
              status: 429,
              error: 'Too Many Requests',
              message: 'slow down',
              path: '/auth/password-reset/confirm',
            },
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': '45' }),
          }),
        ),
      );

      await page.confirmReset();
      fixture.detectChanges();

      // The rate-limit copy (not the bad-code copy)...
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Too many attempts');
      expect(text).not.toContain('invalid or has expired');
      // ...and the resend button runs the 45 s cooldown instead of a bare
      // retry.
      expect(buttonByText(fixture, 'Resend in 45s')?.disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(45_000);
      fixture.detectChanges();
      expect(buttonByText(fixture, 'Resend code')?.disabled).toBe(false);
    });

    it('a 429 on resend restarts the countdown from Retry-After', async () => {
      vi.useFakeTimers();
      const { page, fixture } = await openInstant();
      await request(page, fixture);
      expect(buttonByText(fixture, 'Resend in 1m 00s')).not.toBeNull();

      gateway.requestPasswordReset.mockRejectedValue(
        toApiError(
          new HttpErrorResponse({
            error: {
              timestamp: 't',
              status: 429,
              error: 'Too Many Requests',
              message: 'cooldown',
              path: '/auth/password-reset/request',
            },
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': '45' }),
          }),
        ),
      );

      await page.resendCode();
      fixture.detectChanges();

      expect(buttonByText(fixture, 'Resend in 45s')?.disabled).toBe(true);
    });
  });
});
