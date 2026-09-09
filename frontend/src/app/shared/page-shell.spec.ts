import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AccountGateway } from '../gateways/account-gateway';
import { AuthGateway } from '../gateways/auth-gateway';
import type { TokenResponse } from '../core/models';
import { AuthStore } from '../session/auth-store';
import { PageShell } from './page-shell';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

/** Hand-written fake gateway — drives the real AuthStore without HTTP. */
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

describe('PageShell', () => {
  let gateway: FakeAuthGateway;
  let account: FakeAccountGateway;
  let store: AuthStore;
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<PageShell>>;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    account = new FakeAccountGateway();
    account.me.mockResolvedValue({
      name: 'Test User',
      email: 'user@example.ee',
      phone: '+37250000001',
      nationalIdCode: '49901019999',
      levels: [],
    });
    TestBed.configureTestingModule({
      imports: [PageShell],
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'login', component: MapStub },
          { path: 'register', component: MapStub },
          { path: 'verify', component: MapStub },
          { path: 'account', component: MapStub },
        ]),
        { provide: AuthGateway, useValue: gateway as unknown as AuthGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(PageShell);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the brand and a router outlet', () => {
    fixture.detectChanges();
    expect(text()).toContain('OpenShelter');
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  it('hides auth controls until init settled, then shows log in / register for guests', async () => {
    fixture.detectChanges();
    expect(text()).not.toContain('Log in');

    await store.init();
    fixture.detectChanges();

    expect(text()).toContain('Log in');
    expect(text()).toContain('Create account');
    expect(text()).not.toContain('Log out');
  });

  it('shows Log out instead of the guest links once a session exists', async () => {
    await store.init();
    gateway.login.mockResolvedValue(PAIR);
    await store.login('user@example.ee', 'secret');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Log out');
    expect(element.textContent).not.toContain('Log in');
  });

  it('an authenticated user gets the Account link (Verify left the nav in M7)', async () => {
    await store.init();
    gateway.login.mockResolvedValue(PAIR);
    await store.login('user@example.ee', 'secret');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href="/account"]')).not.toBeNull();
    // M7: the standalone Verify nav item is gone — verification is a
    // per-contact label on /account; /verify stays reachable by route.
    expect(element.querySelector('a[href="/verify"]')).toBeNull();
  });

  it('the nav stays link-stable whether or not a level is verified', async () => {
    await store.init();
    gateway.login.mockResolvedValue(PAIR);
    await store.login('user@example.ee', 'secret');
    fixture.detectChanges();
    expect(elementVerifyLinks()).toBe(0);

    store.refreshProfile(); // no-op when the profile is already known
    fixture.detectChanges();
    expect(elementVerifyLinks()).toBe(0);
  });

  function elementVerifyLinks(): number {
    const element = fixture.nativeElement as HTMLElement;
    return element.querySelectorAll('a[href="/verify"]').length;
  }

  it('guests never see the Account link', async () => {
    await store.init();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href="/account"]')).toBeNull();
    expect(element.querySelector('a[href="/verify"]')).toBeNull();
  });

  it('logout revokes the session and returns to /map', async () => {
    await store.init();
    gateway.login.mockResolvedValue(PAIR);
    await store.login('user@example.ee', 'secret');
    gateway.logout.mockResolvedValue(undefined);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.textContent?.trim()).toBe('Log out');
    button?.dispatchEvent(new MouseEvent('click'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gateway.logout).toHaveBeenCalledWith('refresh-1');
    expect(store.authenticated()).toBe(false);
    expect(router.url).toBe('/map');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Log in');
  });
});
