import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AccountGateway } from '../../gateways/account-gateway';
import { AuthGateway } from '../../gateways/auth-gateway';
import { ApiError } from '../../core/api-error';
import type { RegisterRequest } from '../../core/models';
import { RegisterPage } from './register-page';

/** Hand-written fake gateway — the page never sees HTTP. */
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

@Component({ template: '<p>login stub</p>' })
class LoginStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('RegisterPage', () => {
  let gateway: FakeAuthGateway;
  let account: FakeAccountGateway;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    account = new FakeAccountGateway();
    account.me.mockResolvedValue({
      name: 'Test User',
      email: 'test@example.ee',
      phone: '+37250000001',
      levels: [],
    });
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'login', component: LoginStub },
          { path: 'register', component: RegisterPage },
        ]),
        { provide: AuthGateway, useValue: gateway as unknown as AuthGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
    });
    router = TestBed.inject(Router);
  });

  async function open(): Promise<{
    page: RegisterPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl('/register');
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(RegisterPage));
    if (!debug) {
      throw new Error('RegisterPage not rendered');
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  function fillValid(page: RegisterPage): void {
    page.form.setValue({
      name: 'Test User',
      email: 'test@example.ee',
      phone: '+37250000001',
      password: 's3cret!',
    });
  }

  function lastRequest(): RegisterRequest {
    return (gateway.register.mock.calls.at(-1) as [RegisterRequest])[0];
  }

  it('renders all four fields with real labels', async () => {
    const { element } = await open();
    for (const id of ['register-name', 'register-email', 'register-phone', 'register-password']) {
      expect(element.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
  });

  it('explains why e-mail and phone are collected (verification + account recovery)', async () => {
    const { element } = await open();
    const notes = [...element.querySelectorAll('.field-note')].map((p) => p.textContent?.trim());
    expect(notes).toHaveLength(2);
    // e-mail note: the code + the recovery use.
    expect(notes[0]).toContain('verification code');
    expect(notes[0]).toContain('password reset');
    // phone note: the code + the later login use.
    expect(notes[1]).toContain('verification code');
    expect(notes[1]).toContain('log in');
  });

  it('does not submit an empty form (all fields required)', async () => {
    const { page, fixture } = await open();

    await page.submit();
    fixture.detectChanges();

    expect(gateway.register).not.toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Name is required.');
    expect(text).toContain('A valid email is required.');
  });

  it('normalises email before sending the register request', async () => {
    const { page } = await open();
    page.form.setValue({
      name: ' Test User ',
      email: 'Test@Example.EE',
      phone: ' +37250000001 ',
      password: 's3cret!',
    });
    gateway.register.mockResolvedValue(undefined);

    await page.submit();

    const request = lastRequest();
    expect(request.name).toBe('Test User');
    expect(request.email).toBe('test@example.ee');
    expect(request.phone).toBe('+37250000001');
    expect(request.password).toBe('s3cret!');
  });

  it('shows the success view on 201 — no session is created', async () => {
    const { page, fixture } = await open();
    fillValid(page);
    gateway.register.mockResolvedValue(undefined);

    await page.submit();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Account created');
    expect(text).toContain('log in, then verify');
    expect(gateway.login).not.toHaveBeenCalled();
  });

  it('surfaces a 409 duplicate-email as an INLINE field error with the backend message (N16)', async () => {
    const { page, fixture } = await open();
    fillValid(page);
    gateway.register.mockRejectedValue(
      ApiError.fromHttp(409, {
        timestamp: 't',
        status: 409,
        error: 'Conflict',
        message: 'an account with this email already exists',
        path: '/auth/register',
      }),
    );

    await page.submit();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    // Inline on the email field, not the generic banner.
    const emailLabel = element.querySelector('label[for="register-email"]');
    expect(emailLabel).not.toBeNull();
    const emailField = emailLabel?.parentElement;
    expect(emailField?.querySelector('.field-error')?.textContent).toContain(
      'an account with this email already exists',
    );
    expect(element.querySelector('.banner')).toBeNull();
    expect(element.textContent).not.toContain('Account created');
  });

  it('surfaces a 409 duplicate-phone inline on the phone field (N16)', async () => {
    const { page, fixture } = await open();
    fillValid(page);
    gateway.register.mockRejectedValue(
      ApiError.fromHttp(409, {
        timestamp: 't',
        status: 409,
        error: 'Conflict',
        message: 'an account with this phone already exists',
        path: '/auth/register',
      }),
    );

    await page.submit();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const phoneLabel = element.querySelector('label[for="register-phone"]');
    expect(phoneLabel).not.toBeNull();
    const phoneField = phoneLabel?.parentElement;
    expect(phoneField?.querySelector('.field-error')?.textContent).toContain(
      'an account with this phone already exists',
    );
    expect(element.querySelector('.banner')).toBeNull();
  });

  it('an unrecognizable 409 falls back to the banner (N16)', async () => {
    const { page, fixture } = await open();
    fillValid(page);
    gateway.register.mockRejectedValue(
      ApiError.fromHttp(409, {
        timestamp: 't',
        status: 409,
        error: 'Conflict',
        message: 'conflict',
        path: '/auth/register',
      }),
    );

    await page.submit();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    // No inline field error... the banner carries the backend message.
    const banner = element.querySelector('.banner') as HTMLElement | null;
    expect(banner?.textContent).toContain('conflict');
    expect(element.querySelector('.field-error')).toBeNull();
  });

  it('maps a 429 to the slow-down copy', async () => {
    const { page, fixture } = await open();
    fillValid(page);
    gateway.register.mockRejectedValue(
      ApiError.fromHttp(429, {
        timestamp: 't',
        status: 429,
        error: 'Too Many Requests',
        message: 'rate limited',
        path: '/auth/register',
      }),
    );

    await page.submit();
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector(
      '.banner',
    ) as HTMLElement | null;
    expect(banner?.textContent).toContain('Too many attempts');
  });
});
