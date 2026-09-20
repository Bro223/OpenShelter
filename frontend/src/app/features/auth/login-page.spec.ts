import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AccountGateway } from '../../gateways/account-gateway';
import { AuthGateway } from '../../gateways/auth-gateway';
import { ApiError } from '../../core/api-error';
import type { MeResponse, TokenResponse } from '../../core/models';
import { LoginPage } from './login-page';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

const PROFILE: MeResponse = {
  name: 'Test User',
  email: 'user@example.ee',
  phone: '+37250000001',
  levels: [],
  isAdmin: false,
};

/** Hand-written fake gateway — the pages never see HTTP. */
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

@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ template: '<p>protected stub</p>' })
class ProtectedStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('LoginPage', () => {
  let gateway: FakeAuthGateway;
  let account: FakeAccountGateway;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    account = new FakeAccountGateway();
    account.me.mockResolvedValue(PROFILE);
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'protected', component: ProtectedStub },
          { path: 'login', component: LoginPage },
        ]),
        { provide: AuthGateway, useValue: gateway as unknown as AuthGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
    });
    router = TestBed.inject(Router);
  });

  async function open(url: string): Promise<{
    page: LoginPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(LoginPage));
    if (!debug) {
      throw new Error('LoginPage not rendered at ' + router.url);
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  function bannerText(element: HTMLElement): string {
    return element.querySelector('.banner')?.textContent ?? '';
  }

  it('renders the login form with real labels', async () => {
    const { element } = await open('/login');
    expect(element.querySelector('label[for="login-contact"]')?.textContent).toContain(
      'Email or phone',
    );
    expect(element.querySelector('label[for="login-password"]')?.textContent).toContain('Password');
    expect(element.querySelector('input#login-password')?.getAttribute('type')).toBe('password');
  });

  it('does not submit an empty form and shows required errors', async () => {
    const { page, fixture } = await open('/login');

    await page.submit();
    fixture.detectChanges();

    expect(gateway.login).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Email or phone is required.',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Password is required.');
  });

  it('exposes invalid fields to assistive tech (aria-invalid + describedby + alert, WCAG 4.1.3)', async () => {
    const { page, element, fixture } = await open('/login');
    const root = fixture.nativeElement as HTMLElement;

    // A fresh form carries no error markers at all (no stale aria state).
    for (const id of ['login-contact', 'login-password']) {
      const input = element.querySelector(`input#${id}`) as HTMLInputElement;
      expect(input.getAttribute('aria-invalid'), id).toBeNull();
      expect(input.getAttribute('aria-describedby'), id).toBeNull();
    }

    await page.submit();
    fixture.detectChanges();

    // Both empty fields now carry the programmatic markers...
    for (const id of ['login-contact', 'login-password']) {
      const input = element.querySelector(`input#${id}`) as HTMLInputElement;
      expect(input.getAttribute('aria-invalid'), id).toBe('true');
      expect(input.getAttribute('aria-describedby'), id).toBe(`${id}-error`);
      // ...and the referenced element IS the error line — a live region.
      const error = root.querySelector(`#${id}-error`);
      expect(error, id).not.toBeNull();
      expect(error?.getAttribute('role'), id).toBe('alert');
      expect(error?.classList.contains('field-error'), id).toBe(true);
    }
    expect(root.querySelector('#login-contact-error')?.textContent).toContain(
      'Email or phone is required.',
    );

    // Fixing a field clears its markers and removes the error line.
    page.form.controls.emailOrPhone.setValue('user@example.ee');
    fixture.detectChanges();
    const contact = element.querySelector('input#login-contact') as HTMLInputElement;
    expect(contact.getAttribute('aria-invalid')).toBeNull();
    expect(contact.getAttribute('aria-describedby')).toBeNull();
    expect(root.querySelector('#login-contact-error')).toBeNull();
  });

  it('logs in and returns to the map', async () => {
    const { page, fixture } = await open('/login');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'secret' });
    gateway.login.mockResolvedValue(PAIR);

    await page.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gateway.login).toHaveBeenCalledWith('user@example.ee', 'secret');
    expect(router.url).toBe('/map');
  });

  it('honours a safe returnUrl on success', async () => {
    const { page, fixture } = await open('/login?returnUrl=/protected');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'secret' });
    gateway.login.mockResolvedValue(PAIR);

    await page.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/protected');
  });

  it('never sends the user to an external returnUrl', async () => {
    const { page, fixture } = await open('/login?returnUrl=https://evil.example');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'secret' });
    gateway.login.mockResolvedValue(PAIR);

    await page.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/map');
  });

  it('shows the loading state while the login request is in flight', async () => {
    const { page, element, fixture } = await open('/login');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'secret' });
    let resolveLogin: (pair: TokenResponse) => void = () => {};
    gateway.login.mockReturnValue(
      new Promise<TokenResponse>((resolve) => (resolveLogin = resolve)),
    );

    const inFlight = page.submit();
    fixture.detectChanges();

    const button = element.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.textContent).toContain('Logging in…');
    expect(button.disabled).toBe(true);
    expect(element.querySelector('.banner')).toBeNull(); // no error while loading

    resolveLogin(PAIR);
    await inFlight;
    await fixture.whenStable();
    fixture.detectChanges();
    // Success navigates to /map (LoginPage is replaced — the old button
    // reference would be stale detached DOM).
    expect(router.url).toBe('/map');
  });

  it('shows a GENERIC banner for a 401 (anti-enumeration — no backend detail)', async () => {
    const { page, fixture } = await open('/login');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'wrong' });
    gateway.login.mockRejectedValue(
      ApiError.fromHttp(401, {
        timestamp: 't',
        status: 401,
        error: 'Unauthorized',
        message: 'invalid credentials',
        path: '/auth/login',
      }),
    );

    await page.submit();
    fixture.detectChanges();

    const text = bannerText(
      (fixture.nativeElement as HTMLElement).querySelector('app-login-page') as HTMLElement,
    );
    expect(text).toContain('Invalid email/phone or password.');
    expect(text).not.toContain('invalid credentials');
    expect(router.url).toBe('/login');
  });

  it('maps a 429 to the slow-down copy', async () => {
    const { page, element, fixture } = await open('/login');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'secret' });
    gateway.login.mockRejectedValue(
      ApiError.fromHttp(429, {
        timestamp: 't',
        status: 429,
        error: 'Too Many Requests',
        message: 'rate limited',
        path: '/auth/login',
      }),
    );

    await page.submit();
    fixture.detectChanges();

    expect(bannerText(element)).toContain('Too many attempts');
  });

  it('maps a network failure to the offline message', async () => {
    const { page, element, fixture } = await open('/login');
    page.form.setValue({ emailOrPhone: 'user@example.ee', password: 'secret' });
    gateway.login.mockRejectedValue(ApiError.fromNetwork());

    await page.submit();
    fixture.detectChanges();

    expect(bannerText(element)).toContain('Cannot reach the backend');
  });

  it('shows an info note when bounced here with ?session=expired', async () => {
    const { element } = await open('/login?session=expired');
    const banner = element.querySelector('.banner--info') as HTMLElement | null;
    expect(banner?.textContent).toContain('session has expired');
  });

  it('shows an info note when the reset flow lands here with ?reset=ok', async () => {
    const { element } = await open('/login?reset=ok');
    const banner = element.querySelector('.banner--info') as HTMLElement | null;
    expect(banner?.textContent).toContain('password has been reset');
  });
});
