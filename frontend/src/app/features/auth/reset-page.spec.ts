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

  describe('request state', () => {
    it('sends the email to the gateway', async () => {
      const { page, fixture } = await open('/reset');
      page.requestForm.setValue({ email: 'test@example.ee' });
      gateway.requestPasswordReset.mockResolvedValue(undefined);

      await page.requestReset();
      fixture.detectChanges();

      expect(gateway.requestPasswordReset).toHaveBeenCalledWith('test@example.ee');
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Check your inbox');
    });

    it('always shows the SAME anti-enumeration message — never the email', async () => {
      const { page, fixture } = await open('/reset');
      page.requestForm.setValue({ email: 'test@example.ee' });
      gateway.requestPasswordReset.mockResolvedValue(undefined);

      await page.requestReset();
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('If an account exists for that email');
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

  describe('confirm state (?token=…)', () => {
    it('shows the confirm form when a token is present', async () => {
      const { page, fixture } = await open('/reset?token=abc123');
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Choose a new password');
      expect(page.mode()).toBe('confirm');
    });

    it('resets the password and navigates to /login', async () => {
      const { page, fixture } = await open('/reset?token=abc123');
      page.confirmForm.setValue({ password: 'new-secret', passwordAgain: 'new-secret' });
      gateway.resetPassword.mockResolvedValue(undefined);

      await page.confirmReset();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(gateway.resetPassword).toHaveBeenCalledWith('abc123', 'new-secret');
      expect(router.url).toBe('/login?reset=ok');
    });

    it('blocks a password mismatch without calling the gateway', async () => {
      const { page, fixture } = await open('/reset?token=abc123');
      page.confirmForm.setValue({ password: 'one-secret', passwordAgain: 'other-secret' });
      page.confirmForm.markAllAsTouched();

      await page.confirmReset();
      fixture.detectChanges();

      expect(gateway.resetPassword).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'The passwords do not match.',
      );
    });

    it('explains an invalid/expired token on 400 (never echoes backend internals)', async () => {
      const { page, fixture } = await open('/reset?token=abc123');
      page.confirmForm.setValue({ password: 'new-secret', passwordAgain: 'new-secret' });
      gateway.resetPassword.mockRejectedValue(
        ApiError.fromHttp(400, {
          timestamp: 't',
          status: 400,
          error: 'Bad Request',
          message: 'token expired',
          path: '/auth/password-reset/confirm',
        }),
      );

      await page.confirmReset();
      fixture.detectChanges();

      const banner = (fixture.nativeElement as HTMLElement).querySelector(
        '.banner',
      ) as HTMLElement | null;
      expect(banner?.textContent).toContain('This reset link is invalid or has expired');
      expect(banner?.textContent).not.toContain('token expired');
      expect(router.url).toBe('/reset?token=abc123');
    });
  });
});
