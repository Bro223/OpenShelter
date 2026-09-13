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
      isAdmin: false,
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
    // admin-moderation D5: a regular user's nav is unchanged — no Admin item.
    expect(element.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('an ADMIN user gets the Admin nav item (regular users see no change)', async () => {
    account.me.mockResolvedValue({
      name: 'Test User',
      email: 'user@example.ee',
      phone: '+37250000001',
      nationalIdCode: '49901019999',
      levels: [],
      isAdmin: true,
    });
    await store.init();
    gateway.login.mockResolvedValue(PAIR);
    await store.login('user@example.ee', 'secret');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const adminLink = element.querySelector('a[href="/admin"]');
    expect(adminLink).not.toBeNull();
    expect(adminLink?.textContent?.trim()).toBe('Admin');
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

    const element = fixture.nativeElement as HTMLElement;
    const button = [...element.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Log out',
    );
    expect(button?.textContent?.trim()).toBe('Log out');
    button?.dispatchEvent(new MouseEvent('click'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gateway.logout).toHaveBeenCalledWith('refresh-1');
    expect(store.authenticated()).toBe(false);
    expect(router.url).toBe('/map');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Log in');
  });

  /* High-contrast toggle (accessibility-and-provenance D2). The toggle is
     independent of auth — it renders from the first paint, before init(). */
  describe('high-contrast toggle', () => {
    function toggleButton(): HTMLButtonElement | null {
      const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
      return buttons.find((b) => b.textContent?.trim() === 'High contrast') ?? null;
    }

    it('renders for guests from the first paint, aria-pressed mirrors the light default', () => {
      fixture.detectChanges();
      const toggle = toggleButton();
      expect(toggle).not.toBeNull();
      expect(toggle!.getAttribute('aria-pressed')).toBe('false');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('clicking enables high contrast: aria-pressed, attribute and persistence all flip', () => {
      fixture.detectChanges();
      toggleButton()!.dispatchEvent(new MouseEvent('click'));
      fixture.detectChanges();

      expect(toggleButton()!.getAttribute('aria-pressed')).toBe('true');
      expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
      expect(localStorage.getItem('openshelter-theme')).toBe('high-contrast');
    });

    it('clicking again returns to light: attribute and stored key both removed', async () => {
      await store.init();
      fixture.detectChanges();
      toggleButton()!.dispatchEvent(new MouseEvent('click'));
      fixture.detectChanges();
      toggleButton()!.dispatchEvent(new MouseEvent('click'));
      fixture.detectChanges();

      expect(toggleButton()!.getAttribute('aria-pressed')).toBe('false');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(localStorage.getItem('openshelter-theme')).toBeNull();
    });
  });

  describe('safety notice footer (app-wide, not map-only)', () => {
    it('the footer names 112 and the official sources on every page', async () => {
      await store.init();
      fixture.detectChanges();
      const notice = fixture.nativeElement.querySelector('.shell-footer__notice') as Element;
      expect(notice).not.toBeNull();
      expect(notice.textContent).toContain('not an official emergency service');
      expect(notice.textContent).toContain('112');
      // Raw attribute: the href property would punycode the non-ASCII host.
      const links = [...notice.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
        a.getAttribute('href'),
      );
      expect(links).toContain('https://www.päästeamet.ee');
      expect(links).toContain('https://www.maaamet.ee');
      // New tab, no referrer leakage to the official sites.
      for (const a of notice.querySelectorAll<HTMLAnchorElement>('a')) {
        expect(a.target).toBe('_blank');
        expect(a.rel).toBe('noopener');
      }
    });
  });

  /* Mobile burger + dropdown panel (<900px, --bp-narrow): the nav links,
     the high-contrast toggle and the auth controls all live once, inside
     .shell-menu — at desktop widths a normal flex row, at narrow widths
     the hidden-until-opened panel. jsdom cannot measure media queries, so
     the acceptance is the DOM/aria/state wiring, not the CSS. */
  describe('mobile menu (burger + .shell-menu panel)', () => {
    function burger(): HTMLButtonElement {
      const b = fixture.nativeElement.querySelector('.shell-burger') as HTMLButtonElement;
      expect(b, 'burger button missing').not.toBeNull();
      return b;
    }

    function panel(): HTMLElement {
      const p = fixture.nativeElement.querySelector('.shell-menu') as HTMLElement;
      expect(p, '.shell-menu panel missing').not.toBeNull();
      return p;
    }

    function openPanel(): void {
      // bubbles: real click events bubble (jsdom's MouseEvent does not by
      // default) — the container-level (click) close relies on it too.
      burger().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
    }

    it('renders a burger wired to the panel: aria-label, aria-controls, closed initially', () => {
      fixture.detectChanges();
      const b = burger();
      expect(b.getAttribute('aria-label')).toBe('Menu');
      expect(b.getAttribute('aria-controls')).toBe('shell-mobile-menu');
      expect(b.getAttribute('aria-expanded')).toBe('false');
      expect(panel().id).toBe('shell-mobile-menu');
      expect(panel().classList).not.toContain('shell-menu--open');
    });

    it('clicking the burger toggles aria-expanded AND the panel open state', () => {
      fixture.detectChanges();

      openPanel();
      expect(burger().getAttribute('aria-expanded')).toBe('true');
      expect(panel().classList).toContain('shell-menu--open');

      openPanel(); // second click closes
      expect(burger().getAttribute('aria-expanded')).toBe('false');
      expect(panel().classList).not.toContain('shell-menu--open');
    });

    it('the panel is the single source of the nav + auth + theme controls', () => {
      fixture.detectChanges();
      const nav = panel().querySelector('.shell-nav');
      const actions = panel().querySelector('.shell-actions');
      expect(nav, 'nav must live inside the panel').not.toBeNull();
      expect(actions, 'actions must live inside the panel').not.toBeNull();
      // One of each control, nowhere else in the shell.
      expect(fixture.nativeElement.querySelectorAll('.shell-nav')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('.shell-actions')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('.shell-burger')).toHaveLength(1);
    });

    it('clicking a menu item closes the panel', () => {
      fixture.detectChanges();
      openPanel();
      expect(panel().classList).toContain('shell-menu--open');

      // The high-contrast toggle is the always-present menu item — no
      // init/auth needed. (Its side effect: the theme flips — irrelevant
      // to this assertion, localStorage is cleared per test.)
      const toggle = [...panel().querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'High contrast',
      )!;
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(panel().classList).not.toContain('shell-menu--open');
    });

    it('Escape closes the panel (host keydown listener)', () => {
      fixture.detectChanges();
      openPanel();
      expect(panel().classList).toContain('shell-menu--open');

      (fixture.nativeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape' }),
      );
      fixture.detectChanges();

      expect(panel().classList).not.toContain('shell-menu--open');
    });

    it('a router navigation closes the panel (NavigationEnd)', async () => {
      fixture.detectChanges();
      openPanel();
      expect(panel().classList).toContain('shell-menu--open');

      // Clicking the nav anchor is the real user path: closeMenu() from
      // the item click, then the completed navigation closes again.
      const mapLink = panel().querySelector('a[href="/map"]') as HTMLAnchorElement;
      mapLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panel().classList).not.toContain('shell-menu--open');
      expect(router.url).toBe('/map');
    });

    it('teardown unbinds the host keydown listener and unsubscribes the router subscription', () => {
      fixture.detectChanges();
      openPanel();
      const host = fixture.nativeElement as HTMLElement;
      const hostRemove = vi.spyOn(host, 'removeEventListener');
      // The router subscription is a private field — reach it via a narrow
      // cast to assert the cleanup wiring without depending on internals.
      const subscription = (
        fixture.componentInstance as unknown as { routerClose: { unsubscribe: () => void } }
      ).routerClose;
      const routerUnsubscribe = vi.spyOn(subscription, 'unsubscribe');

      fixture.destroy();

      expect(hostRemove).toHaveBeenCalledWith('keydown', expect.anything());
      expect(routerUnsubscribe).toHaveBeenCalled();
    });
  });
});
