import { readFileSync } from 'node:fs';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AccountGateway } from '../gateways/account-gateway';
import { AuthGateway } from '../gateways/auth-gateway';
import { DataSourceGateway } from '../gateways/data-source-gateway';
import { ConsentStore } from '../core/consent-store';
import { I18nService } from '../core/i18n/i18n.service';
import type { DataSourceDto, TokenResponse } from '../core/models';
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

/** Hand-written fake — the provenance line is non-critical, hidden by default. */
class FakeDataSourceGateway {
  fetch = vi.fn();
}

@Component({ template: '<p>map stub</p>' })
class MapStub {}

describe('PageShell', () => {
  let gateway: FakeAuthGateway;
  let account: FakeAccountGateway;
  let dataSource: FakeDataSourceGateway;
  let store: AuthStore;
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<PageShell>>;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeAuthGateway();
    account = new FakeAccountGateway();
    dataSource = new FakeDataSourceGateway();
    dataSource.fetch.mockResolvedValue(null);
    account.me.mockResolvedValue({
      name: 'Test User',
      email: 'user@example.ee',
      phone: '+37250000001',
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
        { provide: DataSourceGateway, useValue: dataSource as unknown as DataSourceGateway },
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

  it('opens with the skip link onto the routed content (accessibility F-01)', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    // The shell's FIRST element: off-screen until keyboard focus (styles.scss
    // .skip-link), then the first Tab jumps past the whole nav.
    const first = element.firstElementChild as HTMLElement;
    expect(first.tagName).toBe('A');
    expect(first.classList).toContain('skip-link');
    expect(first.getAttribute('href')).toBe('#main');
    // The label is catalog-driven, so it follows the active locale
    // instead of being hardcoded English: assert the binding, not a literal.
    expect(first.textContent?.trim()).toBe(TestBed.inject(I18nService).t('nav.skip'));
    // The landing target: the outlet container is programmatically focusable,
    // so the next Tab continues into the page instead of back to the nav.
    const main = element.querySelector('main#main');
    expect(main, 'the outlet container must carry id="main"').not.toBeNull();
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });

  /* Route-change focus: a client-side route swap
     replaces the page without a document load, so the shell has to land the
     keyboard on the routed content itself. The modal case is the consent
     overlay — it links to /privacy, so a route change can complete while the
     dialog owns focus. */
  describe('route-change focus (accessibility F-04)', () => {
    /** The shell reads its FIRST NavigationEnd as the document load. The
        TestBed does not guarantee the initial navigation ran (these spec
        routes have no '' path), so a case primes with one navigation and
        asserts on the next. */
    async function primeNavigation(): Promise<void> {
      await router.navigate(['/map']);
    }

    it('lands focus on the routed content on every later route change', async () => {
      // Acknowledged consent: the open consent dialog would hold focus.
      TestBed.inject(ConsentStore).acknowledge();
      fixture.detectChanges();
      await primeNavigation();

      await router.navigate(['/login']);
      await fixture.whenStable();
      fixture.detectChanges();

      const main = (fixture.nativeElement as HTMLElement).querySelector('main#main');
      expect(document.activeElement).toBe(main);
    });

    it('never pulls focus out of an open modal dialog (the consent overlay)', async () => {
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const dialog = element.querySelector('.consent-dialog') as HTMLElement;
      expect(dialog, 'the consent modal renders while undecided').not.toBeNull();
      dialog.focus();

      await primeNavigation();
      await router.navigate(['/login']);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(document.activeElement).toBe(dialog);
    });
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
    // No standalone Verify nav item: verification is a per-contact label on
    // /account; /verify stays reachable by route.
    expect(element.querySelector('a[href="/verify"]')).toBeNull();
    // admin-moderation D5: a regular user's nav is unchanged — no Admin item.
    expect(element.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('an ADMIN user gets the Admin nav item (regular users see no change)', async () => {
    account.me.mockResolvedValue({
      name: 'Test User',
      email: 'user@example.ee',
      phone: '+37250000001',
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
      expect(links).toContain('https://www.siseministeerium.ee');
      // New tab, no referrer leakage to the official sites.
      for (const a of notice.querySelectorAll<HTMLAnchorElement>('a')) {
        expect(a.target).toBe('_blank');
        expect(a.rel).toBe('noopener');
      }
    });

    it('the legal links (privacy + terms) sit under the notice, app-wide', () => {
      fixture.detectChanges();
      const legal = fixture.nativeElement.querySelector('.shell-footer__legal') as Element;
      expect(legal).not.toBeNull();
      const links = [...legal.querySelectorAll<HTMLAnchorElement>('a')].map((a) => ({
        href: a.getAttribute('href'),
        label: a.textContent?.trim(),
      }));
      expect(links).toContainEqual({ href: '/privacy', label: 'Privacy policy' });
      expect(links).toContainEqual({ href: '/terms', label: 'Terms of use' });
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

    it('draws three CSS-only bars, all decorative (aria-hidden), under one accessible name', () => {
      fixture.detectChanges();
      const bars = burger().querySelectorAll('.shell-burger__bar');
      expect(bars, 'the burger is drawn with three bars').toHaveLength(3);
      for (const bar of bars) {
        expect(bar.getAttribute('aria-hidden'), 'bars are decoration').toBe('true');
        expect(bar.textContent, 'bars are CSS-drawn, not a glyph').toBe('');
      }
      // The single accessible name stays menu.aria: the open/cross state
      // rides on aria-expanded, so the bars add no second label anywhere
      // inside the button.
      expect(burger().getAttribute('aria-label')).toBe('Menu');
      expect(burger().querySelector('[aria-label]')).toBeNull();
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

  /* Burger-bar stylesheet invariants (the owner's uniformity requirement +
     the aria-expanded cross + the motion guard). jsdom cannot measure
     media queries, so — same mechanism-assertion idiom as
     design-tokens.spec.ts — the stylesheet content itself is the
     acceptance. */
  describe('burger bars (page-shell.scss invariants)', () => {
    // The test runner's cwd is the frontend project root (npx ng test).
    const shellScss = readFileSync(
      `${process.cwd()}/src/app/shared/page-shell.scss`,
      'utf8',
    );
    // The narrow block is where the burger lives (display: none at >=900).
    // Extracted by brace balancing (the design-tokens.spec.ts blockLines
    // idiom) — a regex alone would over-run into the file tail.
    function narrowBlock(): string | null {
      const lines = shellScss.split('\n');
      const start = lines.findIndex((l) => l.trim() === '@media (max-width: 900px) {');
      if (start === -1) return null;
      let depth = 0;
      for (let i = start; i < lines.length; i++) {
        depth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
        if (depth <= 0) return lines.slice(start, i + 1).join('\n');
      }
      return null;
    }

    const narrow = narrowBlock();

    /** Every .shell-burger__bar rule inside the narrow block — full
        selector line included, so the aria-expanded gate stays visible. */
    function barRules(): string[] {
      return narrow
        ? [...narrow.matchAll(/^[ \t]*[^{\n]*\.shell-burger__bar[^{\n]*\{[^}]*\}/gm)].map(
            (m) => m[0],
          )
        : [];
    }

    it('closed-state bars are pixel-uniform: one shared rule, no per-bar overrides', () => {
      expect(narrow, 'page-shell.scss must keep the narrow @media block').not.toBeNull();
      // Any per-bar rule (a shorter/heavier middle bar, a different colour,
      // a leftover transform) would show up here as a second non-open-state
      // rule and fail the single-rule assertion.
      const closed = barRules().filter((r) => !r.includes('aria-expanded'));
      expect(
        closed.length,
        'exactly one closed-state bar rule (uniform width/height/colour/radius for all three)',
      ).toBe(1);
      const rule = closed[0];
      expect(rule).toMatch(/width: var\(--space-24\)/);
      expect(rule).toMatch(/height: var\(--space-2\)/);
      expect(rule).toMatch(/border-radius: var\(--radius-sm\)/);
      expect(rule).toMatch(/background: currentColor/);
      expect(rule, 'the closed state must carry no transform property').not.toMatch(
        /(^|\n)\s*transform\s*:/,
      );
      // The equal seam between the bars is the shared container's flex gap
      // — the same tokens the open-state translate derives from (cross
      // test below). The 48px touch target rides on the same rule.
      const burgerRule = narrow!.slice(
        narrow!.indexOf('.shell-burger {'),
        narrow!.indexOf('.shell-burger__bar {'),
      );
      expect(burgerRule, 'the .shell-burger rule must precede the bar rule').not.toBe('');
      expect(burgerRule).toMatch(/gap: var\(--space-6\)/);
      expect(burgerRule, '48px touch target').toMatch(/min-height: var\(--space-48\)/);
      expect(burgerRule, '48px touch target').toMatch(/min-width: var\(--space-48\)/);    });

    it('open-state cross: outer bars rotate ±45° onto the centre line, middle bar hides', () => {
      const open = barRules().filter((r) => r.includes("aria-expanded='true'"));
      expect(open, 'one open-state rule per bar').toHaveLength(3);
      const byChild = (n: number): string | undefined =>
        open.find((r) => r.includes(`:nth-child(${n})`));
      // Translate distance = one bar height + one bar gap: the closed
      // column's adjacent bar CENTRES are exactly h/2 + gap + h/2 apart, and
      // the stack is centred in the box — so this many px lands the outer
      // bars' centres on the middle bar's. Token-derived, never a
      // hard-coded number (a token change moves the cross with it).
      const ontoCentreDown = 'translateY(calc(var(--space-2) + var(--space-6)))';
      const ontoCentreUp = 'translateY(calc(-1 * (var(--space-2) + var(--space-6))))';
      expect(byChild(1), 'top bar must move onto the centre line').toContain(ontoCentreDown);
      expect(byChild(1), 'top bar must rotate 45°').toContain('rotate(45deg)');
      expect(byChild(3), 'bottom bar must move onto the centre line').toContain(ontoCentreUp);
      expect(byChild(3), 'bottom bar must rotate -45°').toContain('rotate(-45deg)');
      expect(byChild(2), 'the middle bar must hide').toMatch(/opacity: 0/);
    });

    it('the bar transition is guarded by prefers-reduced-motion (no unguarded motion)', () => {
      const hasTransition = /\.shell-burger__bar[^\n{]*\{[^}]*transition:/.test(shellScss);
      expect(
        hasTransition,
        'the cross morph transition is part of this design (retire it AND the guard together)',
      ).toBe(true);
      const guard = shellScss.match(
        /@media \(max-width: 900px\) and \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
      );
      expect(guard, 'the reduced-motion guard must exist alongside the transition').not.toBeNull();
      expect(guard![0], 'the guard must cover the bars').toContain('.shell-burger__bar');
      expect(guard![0], 'the guard must remove the transition').toMatch(/transition: none/);
    });
  });

  /* Language switcher (i18n-et-en): the active locale's
     button carries aria-pressed; the choice persists (openshelter-locale)
     and flips <html lang> + the whole chrome. jsdom cannot measure media
     queries, so the acceptance is the DOM/aria/state wiring, not the CSS. */
  describe('language switcher (i18n-et-en M14)', () => {
    function langGroup(): HTMLElement {
      const group = fixture.nativeElement.querySelector('.shell-lang') as HTMLElement;
      expect(group, '.shell-lang group missing').not.toBeNull();
      return group;
    }

    function langButtons(): HTMLButtonElement[] {
      return [...langGroup().querySelectorAll<HTMLButtonElement>('button')];
    }

    it('renders one button per locale (EN first, the default), group aria-wired', () => {
      fixture.detectChanges();
      expect(langGroup().getAttribute('role')).toBe('group');
      expect(langGroup().getAttribute('aria-label')).toBe('Language');
      const buttons = langButtons();
      expect(buttons.map((b) => b.textContent?.trim())).toEqual(['EN', 'ET']);
      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(document.documentElement.lang).toBe('en');
    });

    it('clicking ET switches the chrome, <html lang> and the persisted choice', async () => {
      await store.init();
      fixture.detectChanges();
      langButtons()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(document.documentElement.lang).toBe('et');
      expect(localStorage.getItem('openshelter-locale')).toBe('et');
      expect(langButtons()[1].getAttribute('aria-pressed')).toBe('true');
      expect(langButtons()[0].getAttribute('aria-pressed')).toBe('false');

      // The chrome is now Estonian: nav, guest actions and footer.
      const element = fixture.nativeElement as HTMLElement;
      // .shell-nav scope: the brand link shares href="/map".
      expect(element.querySelector('.shell-nav a[href="/map"]')?.textContent).toContain(
        'Varjupaikade kaart',
      );
      expect(text()).toContain('Logi sisse');
      expect(text()).toContain('Kõrge kontrast');
      expect(text()).toContain('Loo konto');
      const notice = element.querySelector('.shell-footer__notice') as Element;
      expect(notice.textContent).toContain('Hädaolukorras helista 112');
      const noticeLinks = [...notice.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
        a.textContent?.trim(),
      );
      expect(noticeLinks).toEqual(['Päästeamet', 'Siseministeerium']);
      const legal = element.querySelector('.shell-footer__legal') as Element;
      const legalLabels = [...legal.querySelectorAll('a')].map((a) => a.textContent?.trim());
      expect(legalLabels).toEqual(['Privaatsuspoliitika', 'Kasutustingimused']);
    });

    it('clicking EN after ET returns the English chrome and persistence', async () => {
      await store.init();
      fixture.detectChanges();
      langButtons()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      langButtons()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(document.documentElement.lang).toBe('en');
      expect(localStorage.getItem('openshelter-locale')).toBe('en');
      expect(langButtons()[0].getAttribute('aria-pressed')).toBe('true');
      expect(text()).toContain('Log in');
      expect(text()).toContain('High contrast');
    });

    it('an authenticated Estonian chrome shows the translated nav + Log out', async () => {
      await store.init();
      gateway.login.mockResolvedValue(PAIR);
      await store.login('user@example.ee', 'secret');
      fixture.detectChanges();
      langButtons()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('a[href="/account"]')?.textContent).toContain('Konto');
      expect(text()).toContain('Logi välja');
      expect(text()).not.toContain('Logi sisse');
    });
  });

  describe('data provenance line (official-dataset-csv M5)', () => {
    const DS: DataSourceDto = {
      sourceName: 'Päästeamet',
      officialUrl: 'https://www.rescue.ee/et/juhend/avaandmed/avalikud-varjumiskohad',
      lastImport: {
        at: '2026-09-13T06:30:00Z',
        status: 'OK',
        sourceVersion: 'Sun, 06 Sep 2026 21:02:21 GMT',
        recordsAdded: 0,
        recordsUpdated: 303,
        recordsRemoved: 0,
      },
    };

    it('shows publisher, last import and the official link once provenance resolves', async () => {
      // re-mock BEFORE the shell is created — the fetch fires in the constructor
      dataSource.fetch.mockResolvedValue(DS);
      const f = TestBed.createComponent(PageShell);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();

      const element = f.nativeElement as HTMLElement;
      const t = element.textContent ?? '';
      expect(t).toContain('Shelter data: Päästeamet');
      expect(t).toContain('last import');
      const link = element.querySelector('a[href="' + DS.officialUrl + '"]');
      expect(link).not.toBeNull();
      expect(link?.textContent?.trim()).toBe('official open data');
      // The attribution duty: the coordinates are reprojected, so the footer has
      // to say the data was modified (the publisher states no licence to cite).
      expect(t).toContain('transformed by OpenShelter');
    });

    it('hides the line while loading and when the fetch failed', async () => {
      // the default fake resolves null — the line must stay hidden
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(text()).not.toContain('Shelter data:');
    });
  });
});
