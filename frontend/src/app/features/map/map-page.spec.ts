import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import type { ShelterDto, ShelterSourceFilter } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { PageShell } from '../../shared/page-shell';
import { LeafletService } from './leaflet-service';
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
  flyToCalls: [number, number][] = [];
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
  flyTo = vi.fn((latitude: number, longitude: number): void => {
    this.flyToCalls.push([latitude, longitude]);
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
const ALL_ROWS = [TALLINN, PARNU, BASEMENT];

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

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeShelterGateway();
    leaflet = new FakeLeafletService();
    TestBed.configureTestingModule({
      // The real shell so "page chrome stays intact" is asserted against the
      // actual header/nav, not a stand-in.
      imports: [PageShell],
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', redirectTo: 'map' },
          { path: 'map', component: MapPage },
          { path: 'login', component: LoginStub },
          { path: 'shelters/:id', component: ShelterDetailStub },
        ]),
        { provide: ShelterGateway, useValue: gateway as unknown as ShelterGateway },
        { provide: LeafletService, useValue: leaflet as unknown as LeafletService },
      ],
    });
    // MapPage declares a page-scoped LeafletService provider; drop it so the
    // root-level fake is the one the page injects.
    TestBed.overrideComponent(MapPage, { remove: { providers: [LeafletService] } });
    router = TestBed.inject(Router);
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
      // Source badges.
      expect(basementRow.textContent).toContain('User');
      expect(rows[1].textContent).toContain('Registry');
      // Rating summary: real rating shown, null rating says "No ratings yet" (no invented zero).
      expect(basementRow.textContent).toContain('No ratings yet');
      expect(basementRow.textContent).not.toContain('0.0');
      expect(rows[2].textContent).toContain('★ 4.5 · 2 reviews');
      // Loading indicator gone once settled.
      expect(text(fixture)).not.toContain('Loading shelters…');
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

  describe('selection sync & navigation', () => {
    beforeEach(() => {
      gateway.list.mockImplementation((source: ShelterSourceFilter) =>
        Promise.resolve(source === 'ALL' ? ALL_ROWS : []),
      );
    });

    it('a row click selects + flies the map, then opens the detail route', async () => {
      const { element, fixture } = await open('/map');
      const tallinnRow = [...element.querySelectorAll<HTMLElement>('.shelter-row')].find((r) =>
        r.textContent?.includes('Tallinn Central Shelter'),
      ) as HTMLElement;

      tallinnRow.click();
      fixture.detectChanges();

      // Selection: the clicked row is highlighted.
      expect(tallinnRow.classList.contains('shelter-row--selected')).toBe(true);
      // Sync: the map flew to the shelter's coordinates.
      expect(leaflet.flyToCalls).toEqual([[TALLINN.latitude, TALLINN.longitude]]);
      // Navigation: the row's RouterLink opens the detail stub.
      await settle(fixture);
      expect(router.url).toBe('/shelters/1');
      expect(text(fixture)).toContain('detail stub');
    });

    it('a marker click selects the matching row, then opens the detail route', async () => {
      const { element, fixture } = await open('/map');
      expect(leaflet.markerClick).not.toBeNull(); // the page wired the callback

      leaflet.markerClick!(BASEMENT.id);
      fixture.detectChanges();

      const selected = element.querySelector<HTMLElement>('.shelter-row--selected');
      expect(selected).not.toBeNull();
      expect(selected?.textContent).toContain('Community Cellar');
      // Markers do NOT fly (the map already shows the clicked point); the row does.
      expect(leaflet.flyToCalls).toEqual([]);

      await settle(fixture);
      expect(router.url).toBe('/shelters/7');
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
});
