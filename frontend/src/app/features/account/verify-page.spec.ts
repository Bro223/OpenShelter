import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthGateway } from '../../gateways/auth-gateway';
import { VerifyGateway } from '../../gateways/verify-gateway';
import { AuthStore } from '../../core/auth-store';
import { VerifyPage } from './verify-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeAuthGateway {
  register = vi.fn();
  login = vi.fn();
  refresh = vi.fn();
  logout = vi.fn();
  requestPasswordReset = vi.fn();
  resetPassword = vi.fn();
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
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    verifyGateway = new FakeVerifyGateway();
    authGateway = new FakeAuthGateway();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'verify', component: VerifyPage },
        ]),
        { provide: VerifyGateway, useValue: verifyGateway as unknown as VerifyGateway },
        { provide: AuthGateway, useValue: authGateway as unknown as AuthGateway },
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
    verifyGateway.request.mockResolvedValue(undefined);

    await page.request('EMAIL');
    fixture.detectChanges();

    expect(verifyGateway.request).toHaveBeenCalledWith('EMAIL');
    const input = element.querySelector('#verify-code-email') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    // The 8-char format lives in the placeholder + error hint, not static text.
    expect(input?.placeholder).toBe('8-character code');
    expect(element.querySelector('label[for="verify-code-email"]')).not.toBeNull();
    expect(element.textContent).toContain('Verify');
    expect(element.textContent).toContain('Resend code');
    expect(text(fixture)).toContain('Text code to my phone');
  });

  it('does not call confirm while the code is malformed (format mirrors the backend)', async () => {
    const { page, fixture } = await open();
    verifyGateway.request.mockResolvedValue(undefined);
    await page.request('PHONE');
    fixture.detectChanges();
    page.codes.PHONE.setValue('12345'); // 5 digits, not 6
    verifyGateway.confirm.mockResolvedValue(undefined);

    await page.confirm('PHONE');
    fixture.detectChanges();

    expect(verifyGateway.confirm).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Enter the 6-digit code from the SMS.');
  });

  it('confirm success marks the level verified — the panel disappears', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockResolvedValue(undefined);
    verifyGateway.confirm.mockResolvedValue(undefined);
    await page.request('EMAIL');
    fixture.detectChanges();

    page.codes.EMAIL.setValue('AB12CD34');
    await page.confirm('EMAIL');
    fixture.detectChanges();

    expect(verifyGateway.confirm).toHaveBeenCalledWith('EMAIL', 'AB12CD34');
    expect(store.levels()).toContain('EMAIL');
    expect(store.isVerified()).toBe(true);
    expect(element.textContent).not.toContain('Send code to my email');
    expect(element.textContent).toContain('Text code to my phone');
    expect(element.textContent).toContain('Your email is verified.');
  });

  it('a 409 on request means already verified — informs, never errors, marks the level', async () => {
    const { page, element, fixture } = await open();
    verifyGateway.request.mockRejectedValue(
      apiError(409, 'already verified: PHONE', '/verify/request'),
    );

    await page.request('PHONE');
    fixture.detectChanges();

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
    verifyGateway.request.mockResolvedValue(undefined);
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
    let resolveRequest: () => void = () => {};
    verifyGateway.request.mockReturnValue(
      new Promise<void>((resolve) => (resolveRequest = resolve)),
    );

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

    resolveRequest();
    await inFlight;
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Sending…');
  });

  it('resend hits request() again from the code phase', async () => {
    const { page } = await open();
    verifyGateway.request.mockResolvedValue(undefined);
    await page.request('EMAIL');
    verifyGateway.request.mockClear();

    await page.request('EMAIL'); // the resend button calls the same method

    expect(verifyGateway.request).toHaveBeenCalledTimes(1);
    expect(verifyGateway.request).toHaveBeenCalledWith('EMAIL');
  });

  it('shows the fully-verified panel once both levels are known', async () => {
    store.addLevel('EMAIL');
    store.addLevel('PHONE');
    const { element } = await open();

    expect(element.textContent).toContain("You're fully verified");
    expect(element.textContent).not.toContain('Send code to my email');
  });
});
