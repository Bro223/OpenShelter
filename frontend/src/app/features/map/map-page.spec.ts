import { Component, signal, type DebugElement } from '@angular/core';
import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type {
  GeocodeResult,
  ShelterDto,
  ShelterSourceFilter,
  VerificationLevel,
} from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { DataSourceGateway } from '../../gateways/data-source-gateway';
import { AuthStore } from '../../session/auth-store';
import { PageShell } from '../../shared/page-shell';
import { straightLineText } from '../../shared/shelter-copy';
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

class FakeGeocodeGateway {
  search = vi.fn();
}

class FakeLeafletService {
  created = 0;
  destroyed = 0;
  lastRendered: ShelterDto[] = [];
  flyToCalls: [number, number, number | undefined][] = [];
  showShelterCalls: unknown[] = [];
  setAnchorCalls: [number | null, number | null][] = [];
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
  setAnchor = vi.fn((latitude: number | null, longitude: number | null): void => {
    this.setAnchorCalls.push([latitude, longitude]);
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
    createdAt: '2025-09-01T08:00:00Z',
    description: null,
    capacity: null,
    submitterVerified: false,
    nonexistentReports: 0,
    reportCount: 0, // total (all report types)
    openStatus: null,
    occupancy: null,
    reviewStatus: 'CONFIRMED', // registry backfill (D3) — USER fixtures override
    locationKind: 'PUBLIC', // D7 default — no private declaration
    lastVerifiedAt: null, // null = never verified
    inaccurate: false, // no moderator mark on this row
    ...overrides,
  };
}

const TALLINN = shelter({ id: 1, name: 'Tallinn Central Shelter' });
const PARNU = shelter({
  id: 2,
  name: 'Pärnu Municipal Shelter',
  source: 'MUNICIPALITY',
});
const BASEMENT = shelter({
  id: 7,
  name: 'Community Cellar',
  address: null,
  source: 'USER',
  description: 'Neighbourhood basement',
  capacity: 12,
  reviewStatus: 'NEW', // D3: USER rows backfill NEW (amber marker)
});
const VERIFIED_BASEMENT = shelter({
  id: 8,
  name: 'Verified Cellar',
  address: null,
  source: 'USER',
  description: 'Verified submitter',
  capacity: 12,
  submitterVerified: true, // a verified submitter is NOT a verified shelter
  reviewStatus: 'CONFIRMED', // community-checked (green)
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
/** Sorts FIRST by name ("Aegviidu" < "Kalamaja") but sits ~45 km from
 *  USER_POSITION — the fixture that makes the user-position sort OBSERVABLE:
 *  with it in the list, the distance order differs from the name order, so
 *  "Kalamaja leads" proves the distance sort, not the default name sort. */
const ALPHA_FAR = shelter({
  id: 13,
  name: 'Aegviidu Shelter',
  address: 'Mäe 1, Aegviidu',
  source: 'MUNICIPALITY',
  latitude: 59.3,
  longitude: 25.5,
});

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
 *  second to a failure (a stale `nearest` after a failed retry is the
 *  regression under test). */
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
  overrides: { authenticated?: boolean; initialized?: boolean; isAdmin?: boolean } = {},
): AuthStore {
  return {
    authenticated: signal(overrides.authenticated ?? false),
    initialized: signal(overrides.initialized ?? true),
    levels: signal<VerificationLevel[]>([]),
    // admin-moderation D5: the shell's nav item reads this — default false.
    isAdmin: signal(overrides.isAdmin ?? false),
    init: vi.fn(async (): Promise<void> => undefined),
    isVerified: () => false,
  } as unknown as AuthStore;
}

/** /shelters/:id target for RouterLink navigation (the real detail page). */
@Component({ template: '<p>detail stub</p>' })
class ShelterDetailStub {}

/** A second route to navigate away from /map. */
@Component({ template: '<p>login stub</p>' })
class LoginStub {}

describe('MapPage', () => {
  let gateway: FakeShelterGateway;
  let geocode: FakeGeocodeGateway;
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
    geocode = new FakeGeocodeGateway();
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
        { provide: GeocodeGateway, useValue: geocode as unknown as GeocodeGateway },
        { provide: DataSourceGateway, useValue: { fetch: () => Promise.resolve(null) } },
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

  /** The sidebar row names in rendered DOM order (the live `sorted()` view). */
  function rowNames(element: HTMLElement): string[] {
    return [...element.querySelectorAll<HTMLElement>('.shelter-row')].map(
      (row) => row.querySelector('.shelter-row__name')?.textContent?.trim() ?? '',
    );
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
      // Simulates the server-side source filter: REGISTRY keeps the
      // registry rows, USER keeps community submissions.
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(
          source === 'REGISTRY' ? [TALLINN, PARNU] : source === 'USER' ? [BASEMENT] : ALL_ROWS,
        ),
      );
    });

    it('renders rows as markers AND sidebar rows (sorted, null-address safe, no rating)', async () => {
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
      // Trust-state badges (community-review-queue D5): the NEW USER row
      // reads "Newly added", the registry rows keep their registry labels.
      expect(basementRow.textContent).toContain('Newly added');
      expect(rows[1].textContent).toContain('Municipal registry');
      expect(rows[2].textContent).toContain('Päästeamet registry');
      // No rating of any kind renders in a row (the review model is gone).
      expect(basementRow.textContent).not.toContain('★');
      expect(rows[2].textContent).not.toContain('★');
      // Loading indicator gone once settled.
      expect(text(fixture)).not.toContain('Loading shelters…');
    });

    it('sidebar rows show the trust-state badge: NEW is "Newly added", CONFIRMED is "Community-checked"', async () => {
      gateway.list.mockResolvedValue([TALLINN, PARNU, BASEMENT, VERIFIED_BASEMENT]);
      const { element } = await open('/map');

      // One badge per row, in the name-sorted order. The old
      // "Verified user" / "User-submitted" split is gone — the label follows
      // the trust state (community-review-queue D5): NEW → "Newly added",
      // CONFIRMED → "Community-checked".
      const badges = [...element.querySelectorAll<HTMLElement>('.shelter-row .badge')].map((b) =>
        b.textContent?.trim(),
      );
      expect(badges).toEqual([
        'Newly added', // Community Cellar (USER, NEW)
        'Municipal registry', // Pärnu Municipal Shelter (MUNICIPALITY)
        'Päästeamet registry', // Tallinn Central Shelter (PAASETEAMET)
        'Community-checked', // Verified Cellar (USER, CONFIRMED)
      ]);
    });

    it('renders the five-entry legend: registry, new community, confirmed community, reported, searched address (M8)', async () => {
      const { element } = await open('/map');

      const legend = element.querySelector<HTMLElement>('.map-legend');
      expect(legend).not.toBeNull();
      expect(legend?.querySelector('.shelter-marker--registry')).not.toBeNull(); // registry blue
      expect(legend?.querySelector('.shelter-marker--new')).not.toBeNull(); // NEW amber
      expect(legend?.querySelector('.shelter-marker--user')).not.toBeNull(); // CONFIRMED green
      expect(legend?.querySelector('.shelter-marker--reported')).not.toBeNull();
      // The origin marker (M8): the searched address the per-row
      // distances are measured from — its own swatch + label, so
      // "222 m from WHAT" is answerable at a glance.
      expect(legend?.querySelector('.shelter-marker--anchor')).not.toBeNull();
      expect(legend?.textContent).toContain('Registry');
      expect(legend?.textContent).toContain('New by community');
      expect(legend?.textContent).toContain('Confirmed by community');
      expect(legend?.textContent).toContain('Reported');
      expect(legend?.textContent).toContain('Searched address');
      // Exactly five entries — no partner/official/proposed wording.
      expect(legend?.querySelectorAll('.legend-item')).toHaveLength(5);
      expect(legend?.textContent).not.toContain('Official');
      expect(legend?.textContent).not.toContain('Partner');
      expect(legend?.textContent).not.toContain('Proposed');
      expect(legend?.textContent).not.toContain('User-submitted');
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
      expect(text(fixture)).toContain('Tallinn Central Shelter');
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
      // The marker click ALSO zooms — the map already shows the point, so
      // the click's payoff is the zoom-in.
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
  // geolocation -> Haversine nearest over the loaded list -> fly (no row emphasis).
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
      expect(cta(element).textContent?.trim()).toBe('Show shelters around you');
      // Anonymous: no "Add shelter" entry (login lives in the header).
      expect(
        [...element.querySelectorAll<HTMLAnchorElement>('a')].some((a) =>
          (a.textContent ?? '').includes('Add shelter'),
        ),
      ).toBe(false);
      // Geolocation consent line (legal-recovery): the CTA is
      // always paired with the "browser asks first / never sent" promise.
      const geoNote = element.querySelector('.map-page__geo-note') as Element | null;
      expect(geoNote).not.toBeNull();
      expect(geoNote?.textContent).toContain('Your browser asks first');
      expect(geoNote?.textContent).toContain('never sent to our servers');
    });

    it('nearest found: flies to the USER position at regional zoom, NO row emphasis or scroll', async () => {
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      // The map flew to the USER'S OWN POSITION at the regional AROUND_ZOOM
      // (14 — a neighbourhood, not a street) — NOT to the nearest shelter.
      expect(leaflet.flyToCalls).toEqual([[USER_POSITION.latitude, USER_POSITION.longitude, 14]]);
      // No row is auto-selected by the around-you action — the nearest
      // stays the RESULT (the one-line state), not a selection or emphasis.
      expect(element.querySelector('.shelter-row--selected')).toBeNull();
      // The one-line state with the found shelter's name + address, plus
      // the straight-line distance (D6 honesty: the ranking's own Haversine
      // — ~125 m for the NEAR fixture, whole metres below 1 km). The NEAR
      // row is a REGISTRY row: no unverified warning.
      expect(text(fixture)).toContain('Show shelters around you: Kalamaja Shelter');
      expect(text(fixture)).toContain('Sadama 2, Tallinn');
      expect(text(fixture)).toContain('≈ 125 m straight line');
      expect(element.querySelector('.nearest-line--warning')).toBeNull();
      // No row emphasis and no auto-scroll (the owner's correction): the
      // list stays unfocused — the nearest is only the result line above.
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      // The CTA is usable again.
      expect(cta(element).disabled).toBe(false);
    });

    it('a community nearest row shows the unverified warning under the result', async () => {
      // USER (community) row NEARER than the registry one: the warning line
      // appears under the result and the km-scale distance formats with one
      // decimal (FAR is ~6.4 km — here only the nearest's distance renders).
      const USER_NEAR = shelter({
        id: 31,
        name: 'Community Cellar',
        address: null,
        source: 'USER',
        latitude: 59.4385,
        longitude: 24.7565,
      });
      gateway.list.mockResolvedValue([USER_NEAR, FAR]);
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(text(fixture)).toContain('Show shelters around you: Community Cellar');
      expect(text(fixture)).toContain('≈ 62 m straight line');
      const warning = element.querySelector<HTMLElement>('.nearest-line--warning');
      expect(warning?.textContent).toBe(
        'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.',
      );
    });

    it('a registry nearest row shows the distance and NO unverified warning', async () => {
      // FAR (MUNICIPALITY) is the nearest in this list — km-scale distance,
      // no warning (the official scenario of the map-browse delta).
      gateway.list.mockResolvedValue([FAR]);
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(text(fixture)).toContain('Show shelters around you: Nõmme Shelter');
      expect(text(fixture)).toContain('≈ 6.4 km straight line');
      expect(element.querySelector('.nearest-line--warning')).toBeNull();
    });

    it('a marked nearest row shows the single-sourced inaccurate warning under the result', async () => {
      // The flagged USER row is nearest: the map's unverified treatment shows
      // the community line for EVERY USER nearest row, and the marked-row
      // warning adds the single-sourced "reported inaccurate" line.
      const MARKED = shelter({
        id: 32,
        name: 'Marked Cellar',
        address: null,
        source: 'USER',
        reviewStatus: 'CONFIRMED',
        inaccurate: true,
        latitude: 59.4385,
        longitude: 24.7565,
      });
      gateway.list.mockResolvedValue([MARKED, FAR]);
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);

      expect(text(fixture)).toContain('Show shelters around you: Marked Cellar');
      const warnings = [...element.querySelectorAll<HTMLElement>('.nearest-line--warning')].map(
        (w) => w.textContent,
      );
      expect(warnings).toContain(
        'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.',
      );
      expect(warnings).toContain('Reported inaccurate — details may be wrong');
    });

    it.each([
      [0.001, '≈ 1 m straight line'],
      [0.45, '≈ 450 m straight line'],
      [0.999, '≈ 999 m straight line'],
      [1, '≈ 1.0 km straight line'],
      [2.4, '≈ 2.4 km straight line'],
      [6.442, '≈ 6.4 km straight line'],
    ])('straightLineText(%f) -> %s (pinned D6 copy)', (km, expected) => {
      expect(straightLineText(km)).toBe(expected);
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

      expect(text(fixture)).toContain('No listed locations around you yet.');
      expect(element.querySelector('.nearest-line a[href="/submit"]')).not.toBeNull();
      expect(leaflet.flyToCalls).toEqual([]);

      // The same anonymous visitor sees the copy WITHOUT the link.
      store.authenticated.set(false);
      await settle(fixture);
      expect(element.querySelector('.nearest-line a[href="/submit"]')).toBeNull();
      expect(text(fixture)).toContain('No listed locations around you yet.');
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
      // The CTA signals its in-flight state to assistive tech.
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
      expect(button.textContent).toContain('Show shelters around you');
      expect(button.getAttribute('aria-busy')).toBe('false');
      // The success line is an aria status (the error line already
      // carries role=alert — asserted in the denied test above).
      expect(element.querySelector('.nearest-line')?.getAttribute('role')).toBe('status');
      // The locate settled: the map flew to the user's position at the
      // regional zoom (14), not to a shelter's street.
      expect(leaflet.flyToCalls).toEqual([[USER_POSITION.latitude, USER_POSITION.longitude, 14]]);
    });

    it('a failed retry clears the stale Nearest line (F1)', async () => {
      const geo = deferredGeolocation();
      setGeolocation(geo.fake);
      gateway.list.mockResolvedValue([NEAR, FAR, ALPHA_FAR]);
      const { element, fixture } = await open('/map');

      // First locate: success — the one-line result is up, the list is
      // distance-sorted to the user position, and NO row is emphasized.
      cta(element).click();
      geo.settle(USER_POSITION);
      await settle(fixture);
      expect(text(fixture)).toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      // The user-position sort: Kalamaja (≈125 m) leads, and Aegviidu —
      // FIRST in the name sort — trails by distance (≈45 km).
      expect(rowNames(element)).toEqual(['Kalamaja Shelter', 'Nõmme Shelter', 'Aegviidu Shelter']);

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
      // No stale success state: the result line is gone (the template
      // chain must not short-circuit on the previous success).
      expect(text(fixture)).not.toContain('Show shelters around you: Kalamaja Shelter');
      // The map stays where the first success left it — the user position
      // at the regional zoom, untouched by the failed retry.
      expect(leaflet.flyToCalls).toEqual([[USER_POSITION.latitude, USER_POSITION.longitude, 14]]);
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

      expect(text(fixture)).not.toContain('No listed locations around you yet.');
      expect(element.querySelector('.banner--error')).not.toBeNull();
      expect(leaflet.flyToCalls).toEqual([]);
    });

    it('a row click clears the Nearest result line (temporary, D2)', async () => {
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      gateway.list.mockResolvedValue([NEAR, FAR, ALPHA_FAR]);
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);
      expect(text(fixture)).toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      // The user-position sort: Kalamaja (≈125 m) leads, and Aegviidu —
      // FIRST in the name sort — trails by distance (≈45 km).
      expect(rowNames(element)).toEqual(['Kalamaja Shelter', 'Nõmme Shelter', 'Aegviidu Shelter']);

      const farRow = [...element.querySelectorAll<HTMLButtonElement>('.shelter-row')].find((r) =>
        r.textContent?.includes('Nõmme Shelter'),
      ) as HTMLButtonElement;
      farRow.click();
      fixture.detectChanges();

      // The one-line result is gone — the manual selection supersedes it —
      // and the row carries the SELECTION accent, never a nearest emphasis.
      expect(text(fixture)).not.toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      expect(element.querySelector('.shelter-row--selected')?.textContent).toContain(
        'Nõmme Shelter',
      );
      // The manual selection won the map: street-level fly to the clicked row.
      expect(leaflet.flyToCalls).toEqual([
        [USER_POSITION.latitude, USER_POSITION.longitude, 14],
        [FAR.latitude, FAR.longitude, SHELTER_ZOOM],
      ]);
      // The user position stays true: the distance sort PERSISTS across a
      // manual selection (only a new around-you run replaces it).
      expect(rowNames(element)).toEqual(['Kalamaja Shelter', 'Nõmme Shelter', 'Aegviidu Shelter']);
    });

    it('a filter change clears the Nearest result line (D2)', async () => {
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'ALL' ? [NEAR, FAR, ALPHA_FAR] : [FAR]),
      );
      const { element, fixture } = await open('/map');

      cta(element).click();
      await settle(fixture);
      expect(text(fixture)).toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      // The user-position sort is up: Kalamaja first, Aegviidu last
      // (name order would put Aegviidu first).
      expect(rowNames(element)).toEqual(['Kalamaja Shelter', 'Nõmme Shelter', 'Aegviidu Shelter']);

      [...element.querySelectorAll<HTMLButtonElement>('.chip')][1].click(); // Registry
      await settle(fixture);

      // The refetch replaced the list — the stale one-line result is gone
      // and no row carries any nearest emphasis.
      expect(text(fixture)).not.toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      expect(rowNames(element)).toEqual(['Nõmme Shelter']);
    });
  });

  // ---------------------------------------------------------------------------
  // Address-search anchor (location-navigation): the browse fallback for
  // the geolocation CTA — the SAME gateway + contract as /submit (client-side
  // Nominatim), rendered in the map sidebar; selecting a result anchors the
  // per-row straight-line distances + the distance sort.
  // ---------------------------------------------------------------------------
  describe('address-search anchor (M12)', () => {
    /** The geocoded point of the FAR fixture — anchoring HERE flips the
     *  name sort (Kalamaja < Nõmme) into the distance sort (FAR 0 km,
     *  NEAR ≈ 6.5 km), so the order change is the assertion. */
    const ANCHOR_RESULT: GeocodeResult[] = [
      {
        displayName: 'Pikaliiva 5, Nõmme, Tallinn, Harjumaa, Estonia',
        latitude: FAR.latitude,
        longitude: FAR.longitude,
        type: 'house',
      },
    ];

    async function typeAndSearch(
      element: HTMLElement,
      fixture: ReturnType<typeof TestBed.createComponent<PageShell>>,
      query: string,
    ): Promise<void> {
      const input = element.querySelector<HTMLInputElement>('#anchor-search-input');
      expect(input).not.toBeNull();
      input!.value = query;
      input!.dispatchEvent(new Event('input'));
      // The button's [disabled] tracks the query signal — run CD so the
      // DOM disabled state matches before the click (a disabled button
      // swallows the click in jsdom, exactly like a real browser).
      fixture.detectChanges();
      const button = element.querySelector<HTMLButtonElement>('.anchor-search__button');
      expect(button).not.toBeNull();
      button!.click();
    }

    it('renders the search box publicly with the attribution always shown, button disabled on an empty query', async () => {
      gateway.list.mockResolvedValue(ALL_ROWS);
      const { element } = await open('/map');
      const input = element.querySelector<HTMLInputElement>('#anchor-search-input');
      expect(input).not.toBeNull();
      expect(input!.disabled).toBe(false);
      const button = element.querySelector<HTMLButtonElement>('.anchor-search__button');
      expect(button).not.toBeNull();
      expect(button!.disabled).toBe(true); // empty query — no deliberate request
      // Nominatim usage policy: the attribution is REQUIRED and rendered
      // from the start (the /submit convention), success or failure.
      const attribution = element.querySelector('.anchor-search__attribution a');
      expect(attribution?.getAttribute('href')).toBe('https://www.openstreetmap.org/copyright');
      expect(attribution?.textContent).toContain('OpenStreetMap contributors');
      // No results, no anchor line, no error — the box is the only chrome.
      expect(element.querySelector('.anchor-search__results')).toBeNull();
      expect(element.querySelector('.anchor-line')).toBeNull();
      expect(element.querySelector('.anchor-search__error')).toBeNull();
    });

    it('selecting a result anchors: pin + fly to neighbourhood scale + per-row distances + distance sort', async () => {
      gateway.list.mockResolvedValue([NEAR, FAR]);
      geocode.search.mockResolvedValue(ANCHOR_RESULT);
      const { element, fixture } = await open('/map');

      await typeAndSearch(element, fixture, 'Pikaliiva 5');
      await settle(fixture);
      // ONE deliberate request with the trimmed query; button pending state
      // resolved (the promise settled), the result list rendered.
      expect(geocode.search).toHaveBeenCalledTimes(1);
      expect(geocode.search).toHaveBeenCalledWith('Pikaliiva 5');
      const resultButton = element.querySelector<HTMLButtonElement>('.anchor-search__result');
      expect(resultButton).not.toBeNull();
      expect(resultButton!.textContent).toContain('Pikaliiva 5, Nõmme, Tallinn');
      expect(resultButton!.textContent).toContain('house');

      resultButton!.click();
      await settle(fixture);

      // The anchor state: the searched line + its single Clear action, the
      // pin dropped at the result's point, the fly at neighbourhood zoom 14
      // (not SHELTER_ZOOM 16 — the anchor is an address, not a shelter).
      expect(leaflet.setAnchorCalls).toEqual([[FAR.latitude, FAR.longitude]]);
      expect(leaflet.flyToCalls).toEqual([[FAR.latitude, FAR.longitude, 14]]);
      expect(element.querySelector('.anchor-line')).not.toBeNull();
      expect(element.querySelector('.anchor-line__clear')).not.toBeNull();
      expect(element.querySelector('.anchor-search__results')).toBeNull(); // collapsed
      // The list is now DISTANCE-sorted (FAR 0 km before NEAR ≈ 6.5 km) —
      // the inverse of the stable name sort (Kalamaja < Nõmme).
      const names = [...element.querySelectorAll<HTMLElement>('.shelter-row__name')].map((el) =>
        el.textContent?.trim(),
      );
      expect(names).toEqual(['Nõmme Shelter', 'Kalamaja Shelter']);
      // Every row carries its straight-line distance (the D6 honesty
      // format). The 0 km edge renders too — the template keys the span on
      // the anchor, not the distance's truthiness.
      const distances = [
        ...element.querySelectorAll<HTMLElement>('.shelter-row__anchor-distance'),
      ].map((el) => el.textContent?.trim());
      expect(distances).toEqual(['≈ 0 m straight line', '≈ 6.5 km straight line']);

      // Search-selection focus (owner task): the result's NEAREST shelter
      // (FAR — 0 km from the searched point) is selected in the list with
      // the marker-click selected state, scrolled into view centered.
      const selected = element.querySelector<HTMLElement>('.shelter-row--selected');
      expect(selected?.textContent).toContain('Nõmme Shelter');
      // The details link is the row's SIBLING (inside the <li>, after the
      // button) — it appears only on the selected row.
      expect(selected?.closest('li')?.querySelector('a')?.textContent).toContain('View details');
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
      // The camera went to the SEARCHED point only — no extra shelter fly.
      expect(leaflet.flyToCalls).toEqual([[FAR.latitude, FAR.longitude, 14]]);
    });

    it('selecting a result with an EMPTY list refreshes with the current filters and selects on settle', async () => {
      // The list is empty (the source filter has no matches) when the
      // selection lands: the page re-loads with the CURRENT filter and the
      // nearest row is selected once the load settles.
      const sourceCalls: ShelterSourceFilter[] = [];
      gateway.list.mockImplementation((source: ShelterSourceFilter) => {
        sourceCalls.push(source);
        // First load (initial render): empty. The selection's refresh
        // returns the two rows.
        return sourceCalls.length === 1 ? Promise.resolve([]) : Promise.resolve([NEAR, FAR]);
      });
      geocode.search.mockResolvedValue(ANCHOR_RESULT);
      const { element, fixture } = await open('/map');
      await typeAndSearch(element, fixture, 'Pikaliiva 5');
      await settle(fixture);
      expect(element.querySelectorAll('.shelter-row')).toHaveLength(0);

      element.querySelector<HTMLButtonElement>('.anchor-search__result')!.click();
      await settle(fixture);

      // The refresh ran under the CURRENT source filter (ALL, untouched).
      expect(sourceCalls).toEqual(['ALL', 'ALL']);
      // Once the load settled, the nearest row (FAR) carries the selected
      // state — scrolled into view centered.
      const selected = element.querySelector<HTMLElement>('.shelter-row--selected');
      expect(selected?.textContent).toContain('Nõmme Shelter');
      expect(selected?.closest('li')?.querySelector('a')?.textContent).toContain('View details');
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
      // The camera flew to the searched point when the selection happened —
      // not to the shelter afterwards.
      expect(leaflet.flyToCalls).toEqual([[FAR.latitude, FAR.longitude, 14]]);
    });

    it('clearing the anchor removes the pin, the distances and the distance sort', async () => {
      gateway.list.mockResolvedValue([NEAR, FAR]);
      geocode.search.mockResolvedValue(ANCHOR_RESULT);
      const { element, fixture } = await open('/map');

      await typeAndSearch(element, fixture, 'Pikaliiva 5');
      await settle(fixture);
      element.querySelector<HTMLButtonElement>('.anchor-search__result')!.click();
      await settle(fixture);
      expect(element.querySelectorAll('.shelter-row__anchor-distance')).toHaveLength(2);

      element.querySelector<HTMLButtonElement>('.anchor-line__clear')!.click();
      await settle(fixture);

      expect(leaflet.setAnchorCalls).toEqual([
        [FAR.latitude, FAR.longitude],
        [null, null],
      ]);
      expect(element.querySelector('.anchor-line')).toBeNull();
      expect(element.querySelectorAll('.shelter-row__anchor-distance')).toHaveLength(0);
      // The stable name sort is back.
      const names = [...element.querySelectorAll<HTMLElement>('.shelter-row__name')].map((el) =>
        el.textContent?.trim(),
      );
      expect(names).toEqual(['Kalamaja Shelter', 'Nõmme Shelter']);
    });

    it('an empty result renders the no-results state and sets no anchor', async () => {
      gateway.list.mockResolvedValue(ALL_ROWS);
      geocode.search.mockResolvedValue([]);
      const { element, fixture } = await open('/map');

      await typeAndSearch(element, fixture, 'Kuressaare 9999');
      await settle(fixture);

      const error = element.querySelector('.anchor-search__error');
      expect(error?.textContent).toContain('No Estonian address found');
      // no-results is information, not an alarm (the /submit convention).
      expect(error?.getAttribute('role')).toBeNull();
      expect(element.querySelector('.anchor-line')).toBeNull();
      expect(leaflet.setAnchorCalls).toEqual([]);
      expect(element.querySelectorAll('.shelter-row__anchor-distance')).toHaveLength(0);
    });

    it('a 429 renders the rate-limited state with the alert role and sets no anchor', async () => {
      gateway.list.mockResolvedValue(ALL_ROWS);
      geocode.search.mockRejectedValue(ApiError.fromHttp(429, '', 'https://nominatim.example'));
      const { element, fixture } = await open('/map');

      await typeAndSearch(element, fixture, 'Pikaliiva 5');
      await settle(fixture);

      const error = element.querySelector('.anchor-search__error');
      expect(error?.textContent).toContain('please wait a moment');
      expect(error?.getAttribute('role')).toBe('alert');
      expect(element.querySelector('.anchor-line')).toBeNull();
      expect(leaflet.setAnchorCalls).toEqual([]);
      // The box is usable again for the next deliberate press.
      expect(element.querySelector<HTMLButtonElement>('.anchor-search__button')!.disabled).toBe(
        false,
      );
    });

    it('a network failure renders the unavailable state with the alert role', async () => {
      gateway.list.mockResolvedValue(ALL_ROWS);
      geocode.search.mockRejectedValue(ApiError.fromNetwork());
      const { element, fixture } = await open('/map');

      await typeAndSearch(element, fixture, 'Pikaliiva 5');
      await settle(fixture);

      const error = element.querySelector('.anchor-search__error');
      expect(error?.textContent).toContain('unreachable');
      expect(error?.getAttribute('role')).toBe('alert');
      expect(element.querySelector('.anchor-line')).toBeNull();
    });

    it('Enter submits, and a press while a search is pending is ignored (one pending, never stacked)', async () => {
      gateway.list.mockResolvedValue(ALL_ROWS);
      // A search that never settles — the pending guard must swallow the
      // second Enter (and the button is disabled meanwhile).
      let settleSearch: ((results: GeocodeResult[]) => void) | undefined;
      geocode.search.mockReturnValue(
        new Promise<GeocodeResult[]>((resolve) => {
          settleSearch = resolve;
        }),
      );
      const { element, fixture } = await open('/map');

      const input = element.querySelector<HTMLInputElement>('#anchor-search-input');
      input!.value = 'Pikaliiva 5';
      input!.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(geocode.search).toHaveBeenCalledTimes(1);
      // Pending: the button is disabled + busy, so the second Enter is a
      // no-op even if it landed (the anchorSearching guard is the backstop;
      // the disabled button is the front).
      expect(element.querySelector<HTMLButtonElement>('.anchor-search__button')!.disabled).toBe(
        true,
      );
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(geocode.search).toHaveBeenCalledTimes(1);

      settleSearch!(ANCHOR_RESULT);
      await settle(fixture);
      expect(element.querySelector('.anchor-search__result')).not.toBeNull();
    });

    it('setting an anchor supersedes the nearest result (the next-interaction convention)', async () => {
      gateway.list.mockResolvedValue([NEAR, FAR, ALPHA_FAR]);
      geocode.search.mockResolvedValue(ANCHOR_RESULT);
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      element.querySelector<HTMLButtonElement>('.map-cta')!.click();
      await settle(fixture);
      expect(text(fixture)).toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);

      await typeAndSearch(element, fixture, 'Pikaliiva 5');
      await settle(fixture);
      element.querySelector<HTMLButtonElement>('.anchor-search__result')!.click();
      await settle(fixture);

      // The anchor is the new reference — the one-line result is gone, the
      // anchor line is up, and the row nearest the searched point (Nõmme,
      // the anchor's own address) takes the selection accent.
      expect(text(fixture)).not.toContain('Show shelters around you: Kalamaja Shelter');
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      expect(element.querySelector('.anchor-line')).not.toBeNull();
      expect(element.querySelector('.shelter-row--selected')?.textContent).toContain(
        'Nõmme Shelter',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Scroll the row into view: a marker click moves the accented row into
  // view inside the sidebar list (the user sees WHAT was zoomed to, not just
  // a zoomed-in point on the map). A nearest success does NOT — the nearest
  // is a result line, never a focus (the owner's correction).
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

    it('a nearest success does NOT scroll or emphasize any row (the owner correction)', async () => {
      gateway.list.mockResolvedValue([NEAR, FAR, ALPHA_FAR]);
      setGeolocation(stubGeolocation({ position: USER_POSITION }));
      const { element, fixture } = await open('/map');

      (element.querySelector('.map-cta') as HTMLButtonElement).click();
      await settle(fixture);

      // The nearest is the action's RESULT, not a focus: no row is
      // emphasized, selected, or scrolled into view — the list stays
      // unfocused (the owner's correction).
      expect(scrollSpy).not.toHaveBeenCalled();
      expect(element.querySelectorAll('.shelter-row--nearest')).toHaveLength(0);
      expect(element.querySelector('.shelter-row--selected')).toBeNull();
      // The payoff instead: the one-line result + the user-position sort
      // (Kalamaja first, Aegviidu — first in the name sort — last).
      expect(text(fixture)).toContain('Show shelters around you: Kalamaja Shelter');
      expect(rowNames(element)).toEqual(['Kalamaja Shelter', 'Nõmme Shelter', 'Aegviidu Shelter']);
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
  // Practical filter chips (review model gone): "Open" (client-side — the
  // BE has no open/closed param: the loaded list is filtered and the markers
  // re-render, no refetch) and "Has capacity" (server-side ?hasCapacity=).
  // Both compose with the source chips. No rating or review control of any
  // kind on the map.
  // ---------------------------------------------------------------------------
  describe('practical filter chips (Open + Has capacity)', () => {
    beforeEach(() => {
      // Simulates the server-side source filter the same way the browse
      // describe does.
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(
          source === 'REGISTRY' ? [TALLINN, PARNU] : source === 'USER' ? [BASEMENT] : ALL_ROWS,
        ),
      );
    });

    /** The two toggle chips of the trust row (no rating control). */
    function trustControls(element: HTMLElement): {
      open: HTMLButtonElement;
      hasCapacity: HTMLButtonElement;
    } {
      const chips = [...element.querySelectorAll<HTMLButtonElement>('button.trust-chip')];
      if (chips.length !== 2) {
        throw new Error('trust filter controls not rendered');
      }
      return { open: chips[0], hasCapacity: chips[1] };
    }

    it('renders the Open / Has capacity toggle chips beside the source chips (no rating control — M11)', async () => {
      const { element } = await open('/map');

      const { open: openChip, hasCapacity } = trustControls(element);
      expect(openChip.textContent?.trim()).toBe('Open');
      expect(hasCapacity.textContent?.trim()).toBe('Has capacity');
      // Neither toggle is active initially; no rating control at all.
      expect(openChip.classList.contains('chip--active')).toBe(false);
      expect(openChip.getAttribute('aria-pressed')).toBe('false');
      expect(hasCapacity.getAttribute('aria-pressed')).toBe('false');
      expect(element.querySelector('.filter-rating')).toBeNull();
      expect(element.querySelector('select')).toBeNull();
      // The source chips (three of them) stay untouched, still first in the
      // row.
      const sourceChips = [...element.querySelectorAll<HTMLButtonElement>('button.chip')];
      expect(sourceChips.map((c) => c.textContent?.trim())).toEqual(['All', 'Registry', 'User']);
    });

    it('toggling Open filters the loaded list CLIENT-side (no refetch, markers follow)', async () => {
      // TALLINN is open (nothing fresh); a fresh-CLOSED, a fresh-OPEN and an
      // INACTIVE row — the closed and inactive rows drop out while the chip
      // is on, the fresh OPEN one stays (open is the default).
      const minutesAgo = (minutes: number): string =>
        new Date(Date.now() - minutes * 60000).toISOString();
      const FRESH_CLOSED = shelter({
        id: 50,
        name: 'Closed Cellar',
        address: null,
        source: 'USER',
        openStatus: { state: 'CLOSED', reportedAt: minutesAgo(12), reportCount: 1 },
        reviewStatus: 'NEW',
      });
      const INACTIVE = shelter({
        id: 51,
        name: 'Old Cellar',
        address: null,
        source: 'USER',
        status: 'INACTIVE',
        reviewStatus: 'NEW',
      });
      const FRESH_OPEN = shelter({
        id: 52,
        name: 'Fresh Open Cellar',
        openStatus: { state: 'OPEN', reportedAt: minutesAgo(12), reportCount: 1 },
      });
      gateway.list.mockResolvedValue([TALLINN, FRESH_CLOSED, INACTIVE, FRESH_OPEN]);
      const { element, fixture } = await open('/map');
      const { open: openChip } = trustControls(element);
      expect(element.querySelectorAll('.shelter-row')).toHaveLength(4);
      const callsBefore = gateway.list.mock.calls.length;

      openChip.click();
      fixture.detectChanges();

      expect(openChip.classList.contains('chip--active')).toBe(true);
      expect(openChip.getAttribute('aria-pressed')).toBe('true');
      // No refetch — the client filter is the whole mechanism.
      expect(gateway.list).toHaveBeenCalledTimes(callsBefore);
      // Only the open rows survive (fresh OPEN included), in the sidebar
      // AND on the map.
      const rows = [...element.querySelectorAll<HTMLElement>('.shelter-row')];
      expect(rows.map((r) => r.querySelector('.shelter-row__name')?.textContent?.trim())).toEqual([
        'Fresh Open Cellar',
        'Tallinn Central Shelter',
      ]);
      expect(leaflet.lastRendered).toEqual([FRESH_OPEN, TALLINN]);

      openChip.click(); // off — the full list returns
      fixture.detectChanges();
      expect(openChip.getAttribute('aria-pressed')).toBe('false');
      expect(element.querySelectorAll('.shelter-row')).toHaveLength(4);
      // Name-sorted: Closed Cellar < Fresh Open Cellar < Old Cellar <
      // Tallinn Central Shelter.
      expect(leaflet.lastRendered).toEqual([FRESH_CLOSED, FRESH_OPEN, INACTIVE, TALLINN]);
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

    it('the chips combine with the source chips (User + Open + Has capacity)', async () => {
      gateway.list.mockImplementation(() => Promise.resolve([BASEMENT, TALLINN]));
      const { element, fixture } = await open('/map');
      const { open: openChip, hasCapacity } = trustControls(element);

      [...element.querySelectorAll<HTMLButtonElement>('button.chip')][2].click(); // User
      await settle(fixture);
      expect(gateway.list).toHaveBeenLastCalledWith('USER');
      openChip.click();
      fixture.detectChanges();
      hasCapacity.click();
      await settle(fixture);

      // One server request carrying the server-side filter only — "Open"
      // never reaches the query string (client-side).
      expect(gateway.list).toHaveBeenLastCalledWith('USER', { hasCapacity: true });
      // The client filter applies on top of the response: TALLINN is open,
      // BASEMENT is open too — both stay, name-sorted.
      expect(leaflet.lastRendered).toEqual([BASEMENT, TALLINN]);
      expect(text(fixture)).toContain('Community Cellar');
      expect(text(fixture)).toContain('Tallinn Central Shelter');
    });

    it('a Has capacity refetch failure can be retried by toggling the same chip (N8 shape)', async () => {
      let calls = 0;
      gateway.list.mockImplementation(() => {
        calls++;
        // The initial ALL fetch succeeds; the hasCapacity=true refetch
        // fails; toggling back off re-fetches cleanly.
        return calls === 2 ? Promise.reject(ApiError.fromNetwork()) : Promise.resolve(ALL_ROWS);
      });
      const { element, fixture } = await open('/map');
      const { hasCapacity } = trustControls(element);

      hasCapacity.click();
      await settle(fixture);
      expect(element.querySelector('.banner--error')).not.toBeNull();

      hasCapacity.click(); // back off — the failed filter is dropped, list re-fetches cleanly
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
      nonexistentReports: 2, // 1–4: flagged, still ACTIVE and public
    });
    const FRESH_CLOSED = shelter({
      id: 21,
      name: 'Closed Shelter',
      openStatus: { state: 'CLOSED', reportedAt: minutesAgo(12), reportCount: 1 },
    });
    const FRESH_CLOSED_FIRM = shelter({
      id: 25,
      name: 'Closed Firm Shelter',
      openStatus: { state: 'CLOSED', reportedAt: minutesAgo(12), reportCount: 2 },
    });
    const FRESH_OPEN = shelter({
      id: 22,
      name: 'Open Shelter',
      openStatus: { state: 'OPEN', reportedAt: minutesAgo(12), reportCount: 1 },
    });
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
      // The trust entries stay (the orange one is ADDED, not swapped).
      expect(legend?.querySelector('.shelter-marker--registry')).not.toBeNull();
      expect(legend?.querySelector('.shelter-marker--new')).not.toBeNull();
      expect(legend?.querySelector('.shelter-marker--user')).not.toBeNull();
    });

    it('a reported shelter (nonexistentReports > 0) shows the orange "Reported" row badge and is handed to the marker renderer', async () => {
      gateway.list.mockResolvedValue([REPORTED_BASEMENT]);
      const { element } = await open('/map');

      const badge = element.querySelector('.badge--reported');
      // The count — the nonexistentReports subset that drives the badge.
      expect(badge?.textContent?.trim()).toBe('Reported (2)');
      // The row keeps its trust badge too (the orange is the single
      // marker affordance; the row text keeps the community label).
      expect(element.querySelector('.shelter-row .badge')?.textContent?.trim()).toBe(
        'Community-checked',
      );
      // The reported row reaches the marker renderer (the orange CLASS on
      // the pin itself is asserted in leaflet-service.spec.ts).
      expect(leaflet.lastRendered).toEqual([REPORTED_BASEMENT]);
    });

    it('unreported rows carry no "Reported" or open-status badge (trust colours only)', async () => {
      const { element } = await open('/map'); // ALL_ROWS — all unreported

      expect(element.querySelector('.badge--reported')).toBeNull();
      expect(element.querySelector('.badge--closed')).toBeNull();
      expect(element.querySelector('.badge--occupancy')).toBeNull();
    });

    it('a fresh CLOSED row renders the amber badge: "Reported closed" at one, "Closed" at two+', async () => {
      gateway.list.mockResolvedValue([FRESH_CLOSED, FRESH_CLOSED_FIRM]);
      const { element } = await open('/map');

      const badges = [...element.querySelectorAll<HTMLElement>('.badge--closed')].map((b) =>
        b.textContent?.trim(),
      );
      // Name-sorted: "Closed Firm Shelter" < "Closed Shelter" — the firm
      // net is firm, the lone report hedges.
      expect(badges).toEqual(['Closed', 'Reported closed']);
    });

    it('a fresh OPEN row renders NO badge (open is the default — no noise)', async () => {
      gateway.list.mockResolvedValue([FRESH_OPEN]);
      const { element } = await open('/map');

      // No open-status badge of any kind — and no badge strip at all, the
      // row meta holds only the source/trust badge.
      expect(element.querySelector('.badge--closed')).toBeNull();
      expect(element.querySelector('.shelter-row__badges')).toBeNull();
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

  describe('"How OpenShelter works" block (Workstream A)', () => {
    beforeEach(() => {
      gateway.list.mockResolvedValue(ALL_ROWS);
    });

    it('renders the mechanics block under the map with the honest disclaimers', async () => {
      const { element } = await open('/map');

      const how = element.querySelector('.map-page__how');
      expect(how).not.toBeNull();
      expect(how?.textContent).toContain('How OpenShelter works');
      expect(how?.textContent).toContain('an official government system');
      expect(how?.textContent).toContain('not an emergency service');
      expect(how?.textContent).toContain('call 112');
      expect(how?.textContent).toContain('never sent to our servers');
      expect(how?.textContent).toContain('cannot guarantee');
      // The redesigned editorial layout: a lede carrying the positioning,
      // body paragraphs (sources / reports / nearest), and the standing
      // guarantee paragraph.
      const lede = how?.querySelector('.map-page__how-lede');
      expect(lede?.textContent).toContain('not an emergency service');
      expect(lede?.textContent).toContain('call 112');
      const guarantee = how?.querySelector('.map-page__how-guarantee');
      expect(guarantee?.textContent).toContain('cannot guarantee');
      // The old "Example" five-step list is gone with the redesign.
      expect(how?.querySelectorAll('.map-page__how-example li').length).toBe(0);
      expect(how?.querySelector('ol')).toBeNull();
      expect(how?.textContent).not.toContain('Example');
    });

    it('never presents itself as an official emergency service', async () => {
      const { element } = await open('/map');
      const how = element.querySelector('.map-page__how');
      expect(how?.textContent).toContain('not an emergency service');
      expect(how?.textContent).not.toContain('official emergency service');
    });

    it('renders the block in Estonian after a locale switch', async () => {
      TestBed.inject(I18nService).setLocale('et');
      const { element } = await open('/map');
      const how = element.querySelector('.map-page__how');
      expect(how?.textContent).toContain('Kuidas OpenShelter töötab');
      expect(how?.textContent).toContain('hädaabiteenus');
    });
  });
});
