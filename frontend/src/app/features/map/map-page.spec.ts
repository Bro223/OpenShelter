import { Component, signal, type DebugElement } from '@angular/core';
import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import type { ShelterDto, ShelterSourceFilter, VerificationLevel } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { AuthStore } from '../../session/auth-store';
import { PageShell } from '../../shared/page-shell';
import { LeafletService, SHELTER_ZOOM } from '../../shared/leaflet-service';
import { MapPage } from './map-page';

/**
 * Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). The
 * page logic is tested against a fake LeafletService; the real service's
 * marker/lifecycle behaviour lives in leaflet-service.spec.ts.
 */
class FakeShelterGateway {
  list = vi.fn();
  get = vi.fn();
}

class FakeLeafletService {
  created = 0;
  destroyed = 0;
  lastRendered: ShelterDto[] = [];
  flyToCalls: [number, number, number | undefined][] = [];
  showShelterCalls: unknown[] = [];
  markerClick: ((shelterId: number) => void) | null = null;

  create = vi.fn((el: HTMLElement | null): void => {
    // Mirrors the real service's null-container guard.
    if (el) {
      this.created++;
    }
  });
  renderShelters = vi.fn((rows: ShelterDto[]): void => {
    this.lastRendered = rows;
  });
  flyTo = vi.fn((latitude: number, longitude: number, zoom?: number): void => {
    this.flyToCalls.push([latitude, longitude, zoom]);
  });
  showShelter = vi.fn((shelter: unknown): void => {
    this.showShelterCalls.push(shelter);
  });
  destroy = vi.fn((): void => {
    this.destroyed++;
  });
}

function shelter(overrides: Partial<ShelterDto> & Pick<ShelterDto, 'id' | 'name'>): ShelterDto {
  return {
    address: 'Tornimäe 1, Tallinn',
    latitude: 59.437,
    longitude: 24.754,
    status: 'ACTIVE',
    source: 'PAASETEAMET',
    averageRating: 4.5,
    reviewCount: 2,
    createdAt: '2025-09-01T08:00:00Z',
    description: null,
    capacity: null,
    submitterVerified: false,
    nonexistentReports: 0,
    statusFlag: null,
    occupancy: null,
    ...overrides,
  };
}

const TALLINN = shelter({ id: 1, name: 'Tallinn Central Shelter' });
const PARNU = shelter({ id: 2, name: 'Pärnu Municipal Shelter', source: 'MUNICIPALITY' });
const BASEMENT = shelter({
  id: 7,
  name: 'Community Cellar',
  address: null,
  source: 'USER',
  averageRating: null,
  reviewCount: 0,
  description: 'Neighbourhood basement',
  capacity: 12,
});
const VERIFIED_BASEMENT = shelter({
  id: 8,
  name: 'Verified Cellar',
  address: null,
  source: 'USER',
  averageRating: null,
  reviewCount: 0,
  description: 'Verified submitter',
  capacity: 12,
  submitterVerified: true,
});
const ALL_ROWS = [TALLINN, PARNU, BASEMENT];

/* Distinct coordinates (ALL_ROWS share the default point) so the nearest
   computation is unambiguous: the user sits ~250 m from NEAR, ~7 km from FAR. */
const NEAR = shelter({
  id: 11,
  name: 'Kalamaja Shelter',
  address: 'Sadama 2, Tallinn',
  latitude: 59.439,
  longitude: 24.757,
});
const FAR = shelter({
  id: 12,
  name: 'Nõmme Shelter',
  address: 'Pikaliiva 5, Tallinn',
  source: 'MUNICIPALITY',
  latitude: 59.385,
  longitude: 24.802,
});
const USER_POSITION = { latitude: 59.438, longitude: 24.756, accuracy: 20 };

/** Geolocation seam (the submit page spec's pattern): stub
 *  navigator.geolocation with a hand-written fake. */
function stubGeolocation(behavior: {
  position?: { latitude: number; longitude: number; accuracy: number };
  errorCode?: number;
}): ReturnType<typeof vi.fn> {
  const getCurrentPosition = vi.fn(
    (success: (p: GeolocationPosition) => void, failure: (e: { code: number }) => void): void => {
      if (behavior.position === undefined) {
        failure({ code: behavior.errorCode ?? 2 });
      } else {
        success({
          coords: {
            latitude: behavior.position.latitude,
            longitude: behavior.position.longitude,
            accuracy: behavior.position.accuracy,
          },
        } as unknown as GeolocationPosition);
      }
    },
  );
  return getCurrentPosition;
}

/** A geolocation fake the test settles BY HAND (locating-state
 *  assertions). Requests are QUEUED in call order — settle()/fail() resolve
 *  them one by one, so a spec can run a first locate to success and a
 *  second to a failure (the F1 regression: a stale `nearest` after a
 *  failed retry). */
function deferredGeolocation(): {
  fake: ReturnType<typeof vi.fn>;
  settle: (position: { latitude: number; longitude: number; accuracy: number }) => void;
  fail: (errorCode: number) => void;
} {
  interface Pending {
    success: (p: GeolocationPosition) => void;
    failure: (e: { code: number }) => void;
  }
  const pending: Pending[] = [];
  const fake = vi.fn(
    (success: (p: GeolocationPosition) => void, failure: (e: { code: number }) => void): void => {
      pending.push({ success, failure });
    },
  );
  const next = (): Pending => {
    const request = pending.shift();
    if (request === undefined) {
      throw new Error('no pending geolocation request');
    }
    return request;
  };
  return {
    fake,
    settle: (position) => next().success({ coords: position } as unknown as GeolocationPosition),
    fail: (errorCode: number) => next().failure({ code: errorCode }),
  };
}

function setGeolocation(fake: ReturnType<typeof stubGeolocation> | undefined): void {
  Object.defineProperty(navigator, 'geolocation', {
    value: fake === undefined ? undefined : { getCurrentPosition: fake },
    configurable: true,
  });
}

/** AuthStore-shaped fake — real signals so zoneless CD stays reactive
 *  (the detail page spec's pattern). */
function fakeAuthStore(
  overrides: { authenticated?: boolean; initialized?: boolean } = {},
): AuthStore {
  return {
    authenticated: signal(overrides.authenticated ?? false),
    initialized: signal(overrides.initialized ?? true),
    levels: signal<VerificationLevel[]>([]),
    init: vi.fn(async (): Promise<void> => undefined),
    isVerified: () => false,
  } as unknown as AuthStore;
}

/** /shelters/:id target for RouterLink navigation (M5 lands the real page). */
@Component({ template: '<p>detail stub</p>' })
class ShelterDetailStub {}

/** A second route to navigate away from /map. */
@Component({ template: '<p>login stub</p>' })
class LoginStub {}

describe('MapPage', () => {
  let gateway: FakeShelterGateway;
  let leaflet: FakeLeafletService;
  let router: Router;
  let store: AuthStore;
  let scrollSpy: ReturnType<typeof vi.fn>;
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    localStorage.clear();
    // jsdom does not implement scrollIntoView — stub it (and restore after):
    // the row-scroll specs spy on it, and the marker/nearest paths now reach
    // it through afterNextRender, so it must exist for EVERY test here.
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy as unknown as Element['scrollIntoView'];
    // Secure context by default (dev runs on localhost); individual tests
    // override it for the geo-insecure path (submit page spec's pattern).
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    setGeolocation(undefined);
    gateway = new FakeShelterGateway();
    leaflet = new FakeLeafletService();
    store = fakeAuthStore();
    TestBed.configureTestingModule({
      // The real shell so "page chrome stays intact" is asserted against the
      // actual header/nav, not a stand-in.
      imports: [PageShell],
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', redirectTo: 'map' },
          { path: 'map', component: MapPage },
          { path: 'login', component: LoginStub },
          { path: 'submit', component: LoginStub },
          { path: 'shelters/:id', component: ShelterDetailStub },
        ]),
        { provide: ShelterGateway, useValue: gateway as unknown as ShelterGateway },
        { provide: LeafletService, useValue: leaflet as unknown as LeafletService },
        { provide: AuthStore, useValue: store },
      ],
    });
    // MapPage declares a page-scoped LeafletService provider; drop it so the
    // root-level fake is the one the page injects.
    TestBed.overrideComponent(MapPage, { remove: { providers: [LeafletService] } });
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    const proto = Element.prototype as { scrollIntoView?: unknown };
    if (originalScrollIntoView) {
      proto.scrollIntoView = originalScrollIntoView;
    } else {
      delete proto.scrollIntoView;
    }
  });

  /** The page instance once /map is rendered and settled. */
  async function open(path: string): Promise<{
    page: MapPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>;
  }> {
    const fixture = TestBed.createComponent(PageShell);
    fixture.detectChanges();
    await router.navigateByUrl(path);
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(MapPage));
    if (!debug) {
      throw new Error('MapPage not rendered');
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  async function settle(
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>,
  ): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<PageShell>>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  describe('map lifecycle (one instance per visit, no leaks between visits)', () => {
    it('destroys the map on route leave and renders a fresh map on return', async () => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'USER' ? [BASEMENT] : ALL_ROWS),
      );
      const { fixture } = await open('/map');

      expect(leaflet.created).toBe(1);
      expect(leaflet.destroyed).toBe(0);
      expect(leaflet.lastRendered).toEqual([BASEMENT, PARNU, TALLINN]); // sorted by name

      await router.navigateByUrl('/login');
      await settle(fixture);
      expect(leaflet.destroyed).toBe(1);
      expect(text(fixture)).toContain('login stub');

      // Second visit — a new page instance creates a new map and re-renders
      // markers from a fresh fetch (nothing is carried over from the old map).
      await router.navigateByUrl('/map');
      await settle(fixture);
      expect(leaflet.created).toBe(2);
      expect(leaflet.destroyed).toBe(1);
      expect(leaflet.lastRendered).toEqual([BASEMENT, PARNU, TALLINN]);
      expect(text(fixture)).toContain('Tallinn Central Shelter');
    });

    it('drops an in-flight response that arrives after the route leave', async () => {
      let resolveAll: (rows: ShelterDto[]) => void = () => {};
      gateway.list.mockImplementation(
        () => new Promise<ShelterDto[]>((resolve) => (resolveAll = resolve)),
      );
      const { fixture } = await open('/map'); // initial fetch pending
      expect(leaflet.lastRendered).toEqual([]);

      await router.navigateByUrl('/login');
      await settle(fixture);
      expect(leaflet.destroyed).toBe(1);

      resolveAll(ALL_ROWS); // stale — the page is gone
      await settle(fixture);
      expect(leaflet.lastRendered).toEqual([]); // never rendered on a destroyed page
    });
  });

  describe('browse', () => {
    beforeEach(() => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(
          source === 'REGISTRY' ? [TALLINN, PARNU] : source === 'USER' ? [BASEMENT] : ALL_ROWS,
        ),
      );
    });

    it('renders rows as markers AND sidebar rows (sorted, null-address safe, honest ratings)', async () => {
      const { element, fixture } = await open('/map');

      // Markers: the service got every row, sorted by name.
      expect(leaflet.lastRendered).toEqual([BASEMENT, PARNU, TALLINN]);
      // Sidebar: same rows, in the same order.
      const rows = [...element.querySelectorAll<HTMLElement>('.shelter-row')];
      expect(rows.map((r) => r.querySelector('.shelter-row__name')?.textContent?.trim())).toEqual([
        'Community Cellar',
        'Pärnu Municipal Shelter',
        'Tallinn Central Shelter',
      ]);
      // The USER row (null address) renders without an address line.
      const basementRow = rows[0];
      expect(basementRow.querySelector('.shelter-row__address')).toBeNull();
      expect(basementRow.textContent).not.toContain('Tornimäe');
      // Registry rows keep their address line.
      expect(rows[1].querySelector('.shelter-row__address')?.textContent?.trim()).toBe(
        'Tornimäe 1, Tallinn',
      );
      // Source badges — the four-valued provenance copy (D4): the legend/
      // filter chips keep their own short wording, the rows say it plainly.
      expect(basementRow.textContent).toContain('User-submitted');
      expect(rows[1].textContent).toContain('Municipal registry');
      expect(rows[2].textContent).toContain('Paasteamet registry');
      // Rating summary: real rating shown, null rating says "No ratings yet" (no invented zero).
      expect(basementRow.textContent).toContain('No ratings yet');
      expect(basementRow.textContent).not.toContain('0.0');
      expect(rows[2].textContent).toContain('★ 4.5 · 2 reviews');
      // Loading indicator gone once settled.
      expect(text(fixture)).not.toContain('Loading shelters…');
    });

    it('sidebar rows show the four-valued provenance badge (D4)', async () => {
      gateway.list.mockResolvedValue([TALLINN, PARNU, BASEMENT, VERIFIED_BASEMENT]);
      const { element } = await open('/map');

      // One badge per row, in the name-sorted order — every D4 value lands
      // on the row of the shelter that produces it.
      const badges = [...element.querySelectorAll<HTMLElement>('.shelter-row .badge')].map((b) =>
        b.textContent?.trim(),
      );
      expect(badges).toEqual([
        'User-submitted', // Community Cellar (USER, unverified creator)
        'Municipal registry', // Pärnu Municipal Shelter (MUNICIPALITY)
        'Paasteamet registry', // Tallinn Central Shelter (PAASETEAMET)
        'Verified user', // Verified Cellar (USER, verified creator)
      ]);
    });

    it('renders a legend tied to the marker CSS classes (registry vs user)', async () => {
      const { element } = await open('/map');

      const legend = element.querySelector<HTMLElement>('.map-legend');
      expect(legend).not.toBeNull();
      expect(legend?.querySelector('.shelter-marker--registry')).not.toBeNull();
      expect(legend?.querySelector('.shelter-marker--user')).not.toBeNull();
      expect(legend?.textContent).toContain('Registry');
      expect(legend?.textContent).toContain('User-submitted');
    });

    it('shows a loading indicator while fetching (no empty/error state meanwhile)', async () => {
      gateway.list.mockImplementation(
        () =>
          new Promise<ShelterDto[]>((resolve) => {
            void resolve; // never settles
          }),
      );
      const { element, fixture } = await open('/map');

      expect(text(fixture)).toContain('Loading shelters…');
      expect(element.querySelector('.shelter-list')).toBeNull();
      expect(element.querySelector('.banner')).toBeNull();
      expect(text(fixture)).not.toContain('No shelters match this filter.');
    });

    it('filter chips refetch server-side with the matching source param', async () => {
      const { element, fixture } = await open('/map');
      const chips = [...element.querySelectorAll<HTMLButtonElement>('.chip')];
      expect(chips.map((c) => c.textContent?.trim())).toEqual(['All', 'Registry', 'User']);
      expect(chips[0].classList.contains('chip--active')).toBe(true);

      chips[1].click(); // Registry
      await settle(fixture);
      expect(gateway.list.mock.calls.map((c) => c[0])).toEqual(['ALL', 'REGISTRY']);
      expect(leaflet.lastRendered).toEqual([PARNU, TALLINN]);
      expect(text(fixture)).toContain('Pärnu Municipal Shelter');
      expect(text(fixture)).not.toContain('Community Cellar');
      expect(chips[1].classList.contains('chip--active')).toBe(true);
      expect(chips[0].classList.contains('chip--active')).toBe(false);

      chips[2].click(); // User
      await settle(fixture);
      expect(gateway.list.mock.calls.map((c) => c[0])).toEqual(['ALL', 'REGISTRY', 'USER']);
      expect(leaflet.lastRendered).toEqual([BASEMENT]);
      expect(text(fixture)).not.toContain('Pärnu Municipal Shelter');

      chips[0].click(); // back to All
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL');
      expect(leaflet.lastRendered).toEqual([BASEMENT, PARNU, TALLINN]);
    });

    it('clicking the active chip is a no-op (no redundant refetch)', async () => {
      const { element, fixture } = await open('/map');
      const allChip = element.querySelector<HTMLButtonElement>('.chip');

      allChip?.click();
      await settle(fixture);

      expect(gateway.list).toHaveBeenCalledTimes(1); // only the initial ALL fetch
    });

    it('a failed filter refetch can be retried by re-selecting the active chip (N8)', async () => {
      let calls = 0;
      gateway.list.mockImplementation(() => {
        calls++;
        return calls === 1 ? Promise.reject(ApiError.fromNetwork()) : Promise.resolve(ALL_ROWS);
      });
      const { element, fixture } = await open('/map');
      // The initial ALL fetch failed — the banner is up.
      expect(element.querySelector('.banner--error')).not.toBeNull();

      const allChip = element.querySelector<HTMLButtonElement>('.chip');
      allChip?.click(); // same (active) filter — must retry, not no-op
      await settle(fixture);

      expect(gateway.list).toHaveBeenCalledTimes(2);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL');
      expect(leaflet.lastRendered).toEqual([BASEMENT, PARNU, TALLINN]);
      expect(element.querySelector('.banner--error')).toBeNull();
    });

    it('a 429 filter refetch shows the shared rate-limited copy, not raw backend text (N9)', async () => {
      gateway.list.mockRejectedValue(
        ApiError.fromHttp(
          429,
          {
            timestamp: 't',
            status: 429,
            error: 'Too Many Requests',
            message: 'rate limited',
            path: '/api/shelters',
          },
          '/api/shelters',
        ),
      );
      const { element } = await open('/map');

      const banner = element.querySelector('.banner--error') as HTMLElement | null;
      expect(banner?.textContent).toContain('Too many attempts — please wait a moment');
      expect(banner?.textContent).not.toContain('rate limited');
    });

    it('shows an empty state (map stays usable) when no shelters match the filter', async () => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'USER' ? [] : ALL_ROWS),
      );
      const { element, fixture } = await open('/map');
      expect(text(fixture)).not.toContain('No shelters match this filter.');

      [...element.querySelectorAll<HTMLButtonElement>('.chip')][2].click(); // User
      await settle(fixture);

      expect(text(fixture)).toContain('No shelters match this filter.');
      expect(element.querySelector('.shelter-list')).toBeNull();
      expect(element.querySelector('.banner')).toBeNull(); // not an error
      expect(leaflet.lastRendered).toEqual([]); // map re-rendered empty, still present
      expect(document.querySelector('.map-page__leaflet')).not.toBeNull();
    });

    it('shows the error banner (chrome intact) when the backend is unreachable', async () => {
      gateway.list.mockRejectedValue(ApiError.fromNetwork());
      const { element, fixture } = await open('/map');

      expect(element.querySelector('.banner--error')?.textContent).toContain(
        'Cannot reach the backend',
      );
      // Page chrome — shell header/nav AND the page title — stays intact.
      expect(text(fixture)).toContain('OpenShelter');
      expect(text(fixture)).toContain('Shelter map');
      expect(text(fixture)).not.toContain('Loading shelters…');
      expect(element.querySelector('.shelter-list')).toBeNull();
      expect(leaflet.lastRendered).toEqual([]);
    });
  });

  describe('selection & zoom-in (details is a separate step)', () => {
    beforeEach(() => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'ALL' ? ALL_ROWS : []),
      );
    });

    it('a row click selects + zooms the map to street level and STAYS on /map', async () => {
      const { element, fixture } = await open('/map');
      // Nothing is selected yet — no details affordance anywhere.
      expect(element.querySelector('.shelter-row__details')).toBeNull();

      const tallinnRow = [...element.querySelectorAll<HTMLButtonElement>('.shelter-row')].find(
        (r) => r.textContent?.includes('Tallinn Central Shelter'),
      ) as HTMLButtonElement;

      tallinnRow.click();
      fixture.detectChanges();

      // Selection: the clicked row is highlighted.
      expect(tallinnRow.classList.contains('shelter-row--selected')).toBe(true);
      // Sync: the map flew to the shelter's coordinates AT street level.
      expect(leaflet.flyToCalls).toEqual([[TALLINN.latitude, TALLINN.longitude, SHELTER_ZOOM]]);
      // The click is a zoom, not a navigation — the user stays on the map.
      await settle(fixture);
      expect(router.url).toBe('/map');
      expect(text(fixture)).not.toContain('detail stub');
    });

    it('the selected row grows a "View details" link — the ONLY thing that opens the detail route', async () => {
      const { element, fixture } = await open('/map');
      const tallinnRow = [...element.querySelectorAll<HTMLButtonElement>('.shelter-row')].find(
        (r) => r.textContent?.includes('Tallinn Central Shelter'),
      ) as HTMLButtonElement;

      tallinnRow.click();
      fixture.detectChanges();

      // Exactly one details link — on the selected row — labelled with the
      // shelter's name for screen readers.
      const details = [...element.querySelectorAll<HTMLAnchorElement>('.shelter-row__details')];
      expect(details).toHaveLength(1);
      expect(details[0].textContent).toContain('View details');
      expect(details[0].getAttribute('aria-label')).toBe(
        'View details for Tallinn Central Shelter',
      );
      expect(details[0].getAttribute('href')).toBe('/shelters/1');

      details[0].click();
      await settle(fixture);
      expect(router.url).toBe('/shelters/1');
      expect(text(fixture)).toContain('detail stub');
    });

    it('a marker click selects the matching row, zooms to street level, and stays on /map', async () => {
      const { element, fixture } = await open('/map');
      expect(leaflet.markerClick).not.toBeNull(); // the page wired the callback

      leaflet.markerClick!(BASEMENT.id);
      fixture.detectChanges();

      const selected = element.querySelector<HTMLElement>('.shelter-row--selected');
      expect(selected).not.toBeNull();
      expect(selected?.textContent).toContain('Community Cellar');
      // The marker click ALSO zooms now (M4 kept the country zoom — the map
      // already showed the point; the payoff of a click is the zoom-in).
      expect(leaflet.flyToCalls).toEqual([[BASEMENT.latitude, BASEMENT.longitude, SHELTER_ZOOM]]);
      // No navigation — the user stays on the map; the details action now
      // exists on the selected row.
      expect(router.url).toBe('/map');
      expect(element.querySelector('.shelter-row__details')).not.toBeNull();
    });

    it('drops an out-of-order (stale) filter response in favour of the newer one', async () => {
      let resolveAll: (rows: ShelterDto[]) => void = () => {};
      let resolveUser: (rows: ShelterDto[]) => void = () => {};
      gateway.list.mockImplementation(
        (source: ShelterSourceFilter) =>
          new Promise<ShelterDto[]>((resolve) => {
            if (source === 'ALL') {
              resolveAll = resolve;
            } else {
              resolveUser = resolve;
            }
          }),
      );
      const { element, fixture } = await open('/map'); // ALL fetch pending
      // Chips stay enabled while loading — a second filter click queues a newer fetch.
      [...element.querySelectorAll<HTMLButtonElement>('.chip')][2].click(); // User
      await settle(fixture);
      expect(gateway.list.mock.calls.map((c) => c[0])).toEqual(['ALL', 'USER']);

      resolveAll(ALL_ROWS); // the STALE response arrives first
      await settle(fixture);
      expect(leaflet.lastRendered).toEqual([]); // dropped — never rendered
      expect(text(fixture)).not.toContain('Tallinn Central Shelter');

      resolveUser([BASEMENT]); // the newer one lands
      await settle(fixture);
      expect(leaflet.lastRendered).toEqual([BASEMENT]);
      expect(text(fixture)).toContain('Community Cellar');
      expect(text(fixture)).not.toContain('Tallinn Central Shelter');
    });
  });

  // ---------------------------------------------------------------------------
  // Nearest shelter (map-crisis-actions D1/D2): the safety-orange CTA,
  // geolocation -> Haversine nearest over the loaded list -> fly + emphasize.
  // ---------------------------------------------------------------------------
  describe('nearest shelter (crisis CTA)', () => {
    beforeEach(() => {
      gateway.list.mockResolvedValue([NEAR, FAR]);
    });

    function cta(element: HTMLElement): HTMLButtonElement {
      const button = element.querySelector<HTMLButtonElement>('.map-cta');
      expect(button).not.toBeNull();
      return button as HTMLButtonElement;
    }

    it('the CTA renders for anonymous users too (the page is public)', async () => {
      const { element } = await open('/map');
      expect(cta(element).textContent?.trim()).toBe('Nearest listed location');
      // Anonymous: no "Add shelter" entry (login lives in the header).
      expect(
        [...element.querySelectorAll<HTMLAnchorElement>('a')].some((a) =>
          (a.textContent ?? '').includes('Add shelter'),
        ),
      ).toBe(false);
    });

    it('the safety notice names 112 and the official sources (community list, not an emergency channel)', async () => {
      const { element } = await open('/map');
      const notice = element.querySelector('.safety-notice');
      expect(notice).not.toBeNull();
      expect(notice!.textContent).toContain('not an official emergency service');
      expect(notice!.textContent).toContain('112');
      // Raw attribute: the href property would punycode the non-ASCII host.
      const links = [...notice!.querySelectorAll<HTMLAnchorElement>('a')].map((a) =>
        a.getAttribute('href'),
      );
      expect(links).toContain('https://www.päästeamet.ee');
      expect(links).toContain('https://www.maaamet.ee');
      // New tab, no referrer leakage to the official sites.
      for (const a of notice!.querySelectorAll<HTMLAnchorElement>('a')) {
        expect(a.target).toBe('_blank');
        expect(a.rel).toBe('noopener');
      }
    });

    it('nearest found: flies to the closest shelter at street level and emphasizes its row', async () => {
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      // The map flew to the CLOSEST shelter (NEAR, ~250 m — not FAR, ~7 km)
      // at the street-level SHELTER_ZOOM convention.
      expect(leaflet.flyToCalls).toEqual([[NEAR.latitude, NEAR.longitude, SHELTER_ZOOM]]);
      // The one-line state with the found shelter's name + address.
      expect(text(fixture)).toContain('Nearest listed location: Kalamaja Shelter');
      expect(text(fixture)).toContain('Sadama 2, Tallinn');
      // The matching row (and only it) carries the temporary emphasis.
      const emphasized = element.querySelectorAll('.shelter-row--nearest');
      expect(emphasized).toHaveLength(1);
      expect(emphasized[0].textContent).toContain('Kalamaja Shelter');
      // The CTA is usable again.
      expect(cta(element).disabled).toBe(false);
    });

    it('permission denied: the denied copy shows and list + map are untouched', async () => {
      setGeolocation(stubGeolocation({ errorCode: 1 }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      // Nothing moved, nothing emphasized.
      expect(leaflet.flyToCalls).toEqual([]);
      expect(element.querySelector('.shelter-row--nearest')).toBeNull();
      expect(leaflet.lastRendered).toEqual([NEAR, FAR]); // markers untouched (name sort)
      // The message explains the permission is off + where to enable it.
      const state = element.querySelector('.nearest-line--error') as HTMLElement;
      expect(state.textContent).toContain(
        'Location permission is off. Allow location access in your browser',
      );
      expect(state.getAttribute('role')).toBe('alert');
    });

    it.each([
      [3, 'Finding your location timed out'],
      [2, 'Your location could not be determined right now'],
    ])('geolocation error code %i shows its specific copy', async (code: number, copy: string) => {
      setGeolocation(stubGeolocation({ errorCode: code }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(element.querySelector('.nearest-line--error')?.textContent).toContain(copy);
      expect(leaflet.flyToCalls).toEqual([]);
    });

    it('a missing geolocation API shows the unsupported copy', async () => {
      setGeolocation(undefined);
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(element.querySelector('.nearest-line--error')?.textContent).toContain(
        'does not support location access',
      );
      expect(leaflet.flyToCalls).toEqual([]);
    });

    it('a non-secure context shows the https copy and never calls geolocation', async () => {
      Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
      const fake = stubGeolocation({ position: USER_POSITION });
      setGeolocation(fake);
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(fake).not.toHaveBeenCalled();
      expect(element.querySelector('.nearest-line--error')?.textContent).toContain(
        'secure (https) connection',
      );
    });

    it('empty list: offers the copy, and the /submit link only when authenticated', async () => {
      gateway.list.mockResolvedValue([]);
      store.authenticated.set(true);
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(text(fixture)).toContain('No listed locations near you yet.');
      expect(element.querySelector('.nearest-line a[href="/submit"]')).not.toBeNull();
      expect(leaflet.flyToCalls).toEqual([]);

      // The same anonymous visitor sees the copy WITHOUT the link.
      store.authenticated.set(false);
      await settle(fixture);
      expect(element.querySelector('.nearest-line a[href="/submit"]')).toBeNull();
      expect(text(fixture)).toContain('No listed locations near you yet.');
    });

    it('the "Add shelter" CTA renders for authenticated users and links to /submit', async () => {
      store.authenticated.set(true);
      const { element, fixture } = await open('/map');

      const add = [...element.querySelectorAll<HTMLAnchorElement>('a')].find(
        (a) => (a.textContent ?? '').trim() === 'Add shelter',
      );
      expect(add).toBeDefined();
      expect(add?.getAttribute('href')).toBe('/submit');
      expect(add?.classList.contains('btn--ghost')).toBe(true);

      // Anonymous: the entry is absent (D4 — nothing here for signed-out users).
      store.authenticated.set(false);
      await settle(fixture);
      expect(
        [...element.querySelectorAll<HTMLAnchorElement>('a')].some(
          (a) => (a.textContent ?? '').trim() === 'Add shelter',
        ),
      ).toBe(false);
    });

    it('the "Add shelter" CTA waits for the auth boot to settle (F6)', async () => {
      // init() has not DECISIVELY decided the boot state yet: authenticated
      // is true in the fake, but the gate (the shell's pattern) keeps the
      // entry hidden until initialized flips — no CTA flicker.
      store.authenticated.set(true);
      store.initialized.set(false);
      const { element, fixture } = await open('/map');

      expect(
        [...element.querySelectorAll<HTMLAnchorElement>('a')].some(
          (a) => (a.textContent ?? '').trim() === 'Add shelter',
        ),
      ).toBe(false);

      store.initialized.set(true);
      await settle(fixture);
      const add = [...element.querySelectorAll<HTMLAnchorElement>('a')].find(
        (a) => (a.textContent ?? '').trim() === 'Add shelter',
      );
      expect(add).toBeDefined();
      expect(add?.getAttribute('href')).toBe('/submit');
    });

    it('locating: the button reads "Finding your location…" and is disabled until the settle', async () => {
      const geo = deferredGeolocation();
      setGeolocation(geo.fake);
      const { element, fixture } = await open('/map');
      const button = cta(element);

      button.click();
      fixture.detectChanges();

      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('Finding your location…');
      // F10: the CTA signals its in-flight state to assistive tech.
      expect(button.getAttribute('aria-busy')).toBe('true');
      // The submit page's geolocation options, mirrored (read the real
      // values off the page — a change here is a spec change).
      expect(geo.fake).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      geo.settle(USER_POSITION);
      await settle(fixture);

      expect(button.disabled).toBe(false);
      expect(button.textContent).toContain('Nearest listed location');
      expect(button.getAttribute('aria-busy')).toBe('false');
      // F10: the success line is an aria status (the error line already
      // carries role=alert — asserted in the denied test above).
      expect(element.querySelector('.nearest-line')?.getAttribute('role')).toBe('status');
      // The locate settled on the nearest row.
      expect(leaflet.flyToCalls).toEqual([[NEAR.latitude, NEAR.longitude, SHELTER_ZOOM]]);
    });

    it('a failed retry clears the stale Nearest line and row emphasis (F1)', async () => {
      const geo = deferredGeolocation();
      setGeolocation(geo.fake);
      const { element, fixture } = await open('/map');

      // First locate: success — the "Nearest listed location: …" line + row emphasis are up.
      cta(element).click();
      geo.settle(USER_POSITION);
      await settle(fixture);
      expect(text(fixture)).toContain('Nearest listed location: Kalamaja Shelter');
      expect(element.querySelector('.shelter-row--nearest')).not.toBeNull();

      // Second locate: permission denied.
      cta(element).click();
      fixture.detectChanges();
      expect(geo.fake).toHaveBeenCalledTimes(2);
      geo.fail(1);
      await settle(fixture);

      // The error line is the state — role=alert, the per-error copy.
      const errorLine = element.querySelector<HTMLElement>('.nearest-line--error');
      expect(errorLine?.textContent).toContain('Location permission is off');
      expect(errorLine?.getAttribute('role')).toBe('alert');
      // No stale success state: the line AND the emphasis are gone (the
      // template chain must not short-circuit on the previous success).
      expect(text(fixture)).not.toContain('Nearest listed location: Kalamaja Shelter');
      expect(element.querySelector('.shelter-row--nearest')).toBeNull();
      // The map stays where the first success left it — untouched.
      expect(leaflet.flyToCalls).toEqual([[NEAR.latitude, NEAR.longitude, SHELTER_ZOOM]]);
    });

    it('a locate settling after a failed filter refetch does not offer the empty state beside the banner (F5)', async () => {
      const geo = deferredGeolocation();
      setGeolocation(geo.fake);
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        source === 'ALL' ? Promise.resolve([NEAR, FAR]) : Promise.reject(ApiError.fromNetwork()),
      );
      const { element, fixture } = await open('/map');

      cta(element).click(); // locate in flight
      [...element.querySelectorAll<HTMLButtonElement>('.chip')][1].click(); // Registry refetch
      await settle(fixture);
      // The refetch failed: the list is empty and the banner is up.
      expect(element.querySelector('.banner--error')).not.toBeNull();
      expect(element.querySelector('.shelter-list')).toBeNull();

      geo.settle(USER_POSITION); // the locate settles against the failed list
      await settle(fixture);

      expect(text(fixture)).not.toContain('No listed locations near you yet.');
      expect(element.querySelector('.banner--error')).not.toBeNull();
      expect(leaflet.flyToCalls).toEqual([]);
    });

    it('a row click clears the Nearest emphasis (temporary, D2)', async () => {
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);
      expect(element.querySelector('.shelter-row--nearest')).not.toBeNull();

      const farRow = [...element.querySelectorAll<HTMLButtonElement>('.shelter-row')].find((r) =>
        r.textContent?.includes('Nõmme Shelter'),
      ) as HTMLButtonElement;
      farRow.click();
      fixture.detectChanges();

      expect(element.querySelector('.shelter-row--nearest')).toBeNull();
      // The manual selection won the map (and the "Nearest listed location: …" line is gone).
      expect(text(fixture)).not.toContain('Nearest listed location: Kalamaja Shelter');
    });

    it('a filter change clears the Nearest emphasis (D2)', async () => {
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'ALL' ? [NEAR, FAR] : [FAR]),
      );
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);
      expect(element.querySelector('.shelter-row--nearest')).not.toBeNull();

      [...element.querySelectorAll<HTMLButtonElement>('.chip')][1].click(); // Registry
      await settle(fixture);

      expect(element.querySelector('.shelter-row--nearest')).toBeNull();
      expect(text(fixture)).not.toContain('Nearest listed location: Kalamaja Shelter');
    });
  });

  // ---------------------------------------------------------------------------
  // Scroll the row into view: a marker click or a nearest success moves the
  // accented row into view inside the sidebar list (the user sees WHAT was
  // zoomed to, not just a zoomed-in point on the map).
  // ---------------------------------------------------------------------------
  describe('scroll the row into view (marker click / nearest)', () => {
    beforeEach(() => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'ALL' ? ALL_ROWS : source === 'USER' ? [BASEMENT] : []),
      );
    });

    it('a marker click scrolls the matching row into view with block: nearest (smooth)', async () => {
      const { element, fixture } = await open('/map');

      leaflet.markerClick!(TALLINN.id); // the LAST row in name sort — below the fold
      await settle(fixture);

      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
      // On the row element carrying the shelter's id — the per-shelter <li>.
      expect(scrollSpy.mock.instances[0]).toBe(
        element.querySelector<HTMLElement>('[data-shelter-id="1"]'),
      );
      // The selection accent is on that same row.
      expect(element.querySelector('.shelter-row--selected')?.textContent).toContain(
        'Tallinn Central Shelter',
      );
    });

    it('a nearest success scrolls the emphasized row into view with block: nearest (smooth)', async () => {
      gateway.list.mockResolvedValue([NEAR, FAR]);
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      (element.querySelector('.map-cta') as HTMLButtonElement).click();
      await settle(fixture);

      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
      expect(scrollSpy.mock.instances[0]).toBe(
        element.querySelector<HTMLElement>('[data-shelter-id="11"]'),
      );
      expect(element.querySelector('.shelter-row--nearest')?.textContent).toContain(
        'Kalamaja Shelter',
      );
    });

    it('a marker click for a shelter absent from the list (filtered out) does not throw and does not scroll', async () => {
      const { element, fixture } = await open('/map');
      [...element.querySelectorAll<HTMLButtonElement>('.chip')][2].click(); // User filter
      await settle(fixture);
      scrollSpy.mockClear();

      leaflet.markerClick!(TALLINN.id); // TALLINN is not in the USER list
      await settle(fixture);

      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it('a stray marker click after the page is destroyed does not throw and never scrolls', async () => {
      const { fixture } = await open('/map');
      await router.navigateByUrl('/login');
      await settle(fixture);
      scrollSpy.mockClear();

      expect(() => leaflet.markerClick!(TALLINN.id)).not.toThrow();
      await settle(fixture); // a scheduled hook must be gone with the page

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // List scrolling (no scroll-snap): jsdom cannot verify layout, so the
  // acceptance is the mechanism in the stylesheet (the design-tokens.spec.ts
  // pattern).
  // ---------------------------------------------------------------------------
  describe('list scrolling (deliberately no scroll-snap)', () => {
    it('the shelter list carries no scroll-snap declarations (both modes tried and rejected)', () => {
      const scss = readFileSync(`${process.cwd()}/src/app/features/map/map-page.scss`, 'utf8');
      // The user's fast wheel spin dead-stopped under proximity snap
      // (real wheel momentum fling vs snap containment — known Chrome
      // interaction; see the scss rationale), and the mandatory one-row
      // carousel (c1468f7) was rejected as feeling worse. Free scrolling
      // is the only regime verified proportional for every input speed
      // (fast spin 6×100px@16ms → full 600px, held, no reset).
      expect(scss).not.toMatch(/scroll-snap-type\s*:/);
      expect(scss).not.toMatch(/scroll-snap-align\s*:/);
      expect(scss).not.toMatch(/scroll-snap-stop\s*:/);
    });
  });

  // ---------------------------------------------------------------------------
  // Trust filters + reported/occupancy presentation (shelter-trust-and-
  // reports D5/D6): Reviewed / Has capacity toggle chips + the rating
  // select, all composable with the source chips — every change is a
  // server refetch with the matching query params, then the list rebuild.
  // ---------------------------------------------------------------------------
  describe('trust filters (shelter-trust-and-reports D5/D6)', () => {
    beforeEach(() => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(
          source === 'REGISTRY' ? [TALLINN, PARNU] : source === 'USER' ? [BASEMENT] : ALL_ROWS,
        ),
      );
    });

    /** The two toggle chips + the rating select of the trust row. */
    function trustControls(element: HTMLElement): {
      reviewed: HTMLButtonElement;
      hasCapacity: HTMLButtonElement;
      select: HTMLSelectElement;
    } {
      const chips = [...element.querySelectorAll<HTMLButtonElement>('.trust-chip')];
      const select = element.querySelector<HTMLSelectElement>('.filter-rating select');
      if (chips.length !== 2 || select === null) {
        throw new Error('trust filter controls not rendered');
      }
      return { reviewed: chips[0], hasCapacity: chips[1], select };
    }

    function setRating(element: HTMLElement, value: string): void {
      const { select } = trustControls(element);
      select.value = value;
      select.dispatchEvent(new Event('change'));
    }

    it('renders the Reviewed / Has capacity toggle chips and the rating select beside the source chips', async () => {
      const { element } = await open('/map');

      const { reviewed, hasCapacity, select } = trustControls(element);
      expect(reviewed.textContent?.trim()).toBe('Reviewed');
      expect(hasCapacity.textContent?.trim()).toBe('Has capacity');
      // Neither toggle is active initially; the select starts on Any rating.
      expect(reviewed.classList.contains('chip--active')).toBe(false);
      expect(reviewed.getAttribute('aria-pressed')).toBe('false');
      expect(hasCapacity.getAttribute('aria-pressed')).toBe('false');
      expect(select.value).toBe('');
      expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
        'Any rating',
        '1★+',
        '2★+',
        '3★+',
        '4★+',
        '5★+',
      ]);
      // The source chips are untouched (existing three, still first in the row).
      const sourceChips = [...element.querySelectorAll<HTMLButtonElement>('.chip')];
      expect(sourceChips.map((c) => c.textContent?.trim())).toEqual(['All', 'Registry', 'User']);
    });

    it('toggling Reviewed refetches with reviewed=true and back to the legacy call shape', async () => {
      const { element, fixture } = await open('/map');
      const { reviewed } = trustControls(element);

      reviewed.click();
      await settle(fixture);
      expect(reviewed.classList.contains('chip--active')).toBe(true);
      expect(reviewed.getAttribute('aria-pressed')).toBe('true');
      expect(gateway.list).toHaveBeenLastCalledWith('ALL', { reviewed: true });

      reviewed.click(); // off — the param disappears (legacy single-arg call)
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL');
    });

    it('toggling Has capacity refetches with hasCapacity=true', async () => {
      const { element, fixture } = await open('/map');
      const { hasCapacity } = trustControls(element);

      hasCapacity.click();
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL', { hasCapacity: true });

      hasCapacity.click();
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL');
    });

    it('the rating select refetches with minRating (4★+ -> minRating=4) and Any clears it', async () => {
      const { element, fixture } = await open('/map');

      setRating(element, '4');
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL', { minRating: 4 });

      setRating(element, '1');
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL', { minRating: 1 });

      setRating(element, ''); // Any rating again
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL');
    });

    it('the trust filters combine with the source chips (User + Reviewed + 3★+)', async () => {
      const { element, fixture } = await open('/map');
      const { reviewed, hasCapacity } = trustControls(element);

      [...element.querySelectorAll<HTMLButtonElement>('.chip')][2].click(); // User
      await settle(fixture);
      reviewed.click();
      await settle(fixture);
      hasCapacity.click();
      await settle(fixture);
      setRating(element, '3');
      await settle(fixture);

      // One request carrying the whole composed state (D5 scenario).
      expect(gateway.list).toHaveBeenLastCalledWith('USER', {
        reviewed: true,
        minRating: 3,
        hasCapacity: true,
      });
      // The list rebuilt from that response (the USER rows, name-sorted).
      expect(leaflet.lastRendered).toEqual([BASEMENT]);
      expect(text(fixture)).toContain('Community Cellar');
    });

    it('a trust-filter refetch failure can be retried by toggling the same chip (N8 shape)', async () => {
      let calls = 0;
      gateway.list.mockImplementation(() => {
        calls++;
        // The initial ALL fetch succeeds; the reviewed=true refetch fails;
        // toggling back off re-fetches cleanly.
        return calls === 2 ? Promise.reject(ApiError.fromNetwork()) : Promise.resolve(ALL_ROWS);
      });
      const { element, fixture } = await open('/map');
      const { reviewed } = trustControls(element);

      reviewed.click();
      await settle(fixture);
      expect(element.querySelector('.banner--error')).not.toBeNull();

      reviewed.click(); // back off — the failed filter is dropped, list re-fetches cleanly
      await settle(fixture);
      expect(gateway.list).toHaveBeenCalledTimes(3);
      expect(gateway.list).toHaveBeenLastCalledWith('ALL');
      expect(element.querySelector('.banner--error')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Reported / occupancy presentation (shelter-trust-and-reports D1/D6):
  // the orange legend entry, the row badges, and the marker hand-off to
  // LeafletService (whose class logic lives in leaflet-service.spec.ts).
  // ---------------------------------------------------------------------------
  describe('reported and occupancy presentation (D1/D6)', () => {
    const minutesAgo = (minutes: number): string =>
      new Date(Date.now() - minutes * 60000).toISOString();

    beforeEach(() => {
      // Default list (unreported, unoccupied) — individual tests override.
      gateway.list.mockResolvedValue(ALL_ROWS);
    });

    const REPORTED_BASEMENT = shelter({
      id: 20,
      name: 'Reported Cellar',
      address: null,
      source: 'USER',
      averageRating: null,
      reviewCount: 0,
      nonexistentReports: 2, // 1–4: flagged, still ACTIVE and public
    });
    const REPORTED_CLOSED = shelter({
      id: 21,
      name: 'Closed Shelter',
      statusFlag: 'REPORTED_CLOSED',
    });
    const CONFIRMED_OPEN = shelter({ id: 22, name: 'Open Shelter', statusFlag: 'CONFIRMED_OPEN' });
    const FULL_FIRM = shelter({
      id: 23,
      name: 'Full Shelter',
      occupancy: { band: 'FULL', reportCount: 2, lastReportedAt: minutesAgo(12) },
    });
    const FULL_HEDGED = shelter({
      id: 24,
      name: 'Lone Shelter',
      occupancy: { band: 'FULL', reportCount: 1, lastReportedAt: minutesAgo(12) },
    });

    it('the legend gains the orange "reported" entry (marker class + label)', async () => {
      const { element } = await open('/map');

      const legend = element.querySelector<HTMLElement>('.map-legend');
      expect(legend?.querySelector('.shelter-marker--reported')).not.toBeNull();
      expect(legend?.textContent).toContain('Reported');
      // The two provenance entries stay (the orange one is ADDED, not swapped).
      expect(legend?.querySelector('.shelter-marker--registry')).not.toBeNull();
      expect(legend?.querySelector('.shelter-marker--user')).not.toBeNull();
    });

    it('a reported shelter (nonexistentReports > 0) shows the orange "Reported" row badge and is handed to the marker renderer', async () => {
      gateway.list.mockResolvedValue([REPORTED_BASEMENT]);
      const { element } = await open('/map');

      const badge = element.querySelector('.badge--reported');
      expect(badge?.textContent?.trim()).toBe('Reported');
      // The row keeps its provenance badge too (the orange is the single
      // marker affordance; the row text stays four-valued).
      expect(element.querySelector('.shelter-row .badge')?.textContent?.trim()).toBe(
        'User-submitted',
      );
      // The reported row reaches the marker renderer (the orange CLASS on
      // the pin itself is asserted in leaflet-service.spec.ts).
      expect(leaflet.lastRendered).toEqual([REPORTED_BASEMENT]);
    });

    it('unreported rows carry no "Reported" badge (provenance colours only)', async () => {
      const { element } = await open('/map'); // ALL_ROWS — all unreported

      expect(element.querySelector('.badge--reported')).toBeNull();
      expect(element.querySelector('.badge--closed')).toBeNull();
      expect(element.querySelector('.badge--open')).toBeNull();
      expect(element.querySelector('.badge--occupancy')).toBeNull();
    });

    it('statusFlag renders as the amber "Reported closed" / green "Confirmed open" badges', async () => {
      gateway.list.mockResolvedValue([REPORTED_CLOSED, CONFIRMED_OPEN]);
      const { element } = await open('/map');

      const closed = element.querySelector('.badge--closed');
      expect(closed?.textContent?.trim()).toBe('Reported closed');
      const openBadge = element.querySelector('.badge--open');
      expect(openBadge?.textContent?.trim()).toBe('Confirmed open');
    });

    it('fresh occupancy renders the NEUTRAL badge: firm at two+, hedged at one, with recency', async () => {
      gateway.list.mockResolvedValue([FULL_FIRM, FULL_HEDGED]);
      const { element } = await open('/map');

      const badges = [...element.querySelectorAll<HTMLElement>('.badge--occupancy')].map((b) =>
        b.textContent?.trim(),
      );
      // Name-sorted: Full Shelter (firm) before Lone Shelter (hedged).
      expect(badges).toEqual(['Full · 12 min ago', 'Reported full · 12 min ago']);
      // Occupancy is never styled success/crisis — its own neutral class only.
      expect(element.querySelector('.badge--occupancy.badge--open')).toBeNull();
      expect(element.querySelector('.badge--occupancy.badge--reported')).toBeNull();
    });

    it('stale/absent occupancy (null block) renders no occupancy badge', async () => {
      const { element, fixture } = await open('/map'); // ALL_ROWS — occupancy null

      expect(element.querySelector('.badge--occupancy')).toBeNull();
      expect(text(fixture)).not.toContain('min ago');
    });
  });
});
