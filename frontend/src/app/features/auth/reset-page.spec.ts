import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AuthGateway } from '../../gateways/auth-gateway';
import { ApiError } from '../../core/api-error';
import { ResetPage } from './reset-page';

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
    gateway.requestPasswordReset.mockResolvedValue(undefined);
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
});
