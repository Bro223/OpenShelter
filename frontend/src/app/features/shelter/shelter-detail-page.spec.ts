import { readFileSync } from 'node:fs';
import { Component, type DebugElement, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import ruLocale from '@angular/common/locales/ru';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import { I18nService } from '../../core/i18n/i18n.service';
import type {
  CommunityPulseRecentReport,
  ShelterDetailDto,
  ShelterDto,
  ShelterReportResult,
  VerificationLevel,
} from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { DataSourceGateway } from '../../gateways/data-source-gateway';
import { PageShell } from '../../shared/page-shell';
import { LeafletService, SHELTER_ZOOM } from '../../shared/leaflet-service';
import { ShelterDetailPage } from './shelter-detail-page';

// The Info section's locale-switch spec formats the <time> stamps in RU —
// mirror main.ts's registration (specs bootstrap components, not the app,
// so main.ts's registerLocaleData never runs here).
registerLocaleData(ruLocale);

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  rows = new Map<number, ShelterDetailDto>();
  get = vi.fn(async (id: number): Promise<ShelterDetailDto> => {
    const row = this.rows.get(id);
    if (row === undefined) {
      throw ApiError.fromHttp(
        404,
        {
          timestamp: 't',
          status: 404,
          error: 'Not Found',
          message: 'Shelter not found',
          path: `x`,
        },
        `/api/shelters/${id}`,
      );
    }
    return row;
  });
  list = vi.fn(async (): Promise<ShelterDto[]> => []);
  create = vi.fn();
  /** Trust layer (shelter-trust-and-reports) — resolves the damp flag (plain by default). */
  report = vi.fn(async (): Promise<ShelterReportResult> => ({ damped: false }));
  reportOccupancy = vi.fn(async (): Promise<void> => undefined);
  /** The live open/closed upsert (204, void). */
  putOpenStatus = vi.fn(async (): Promise<void> => undefined);
}

/**
 * The detail page's page-scoped Location map, faked the same way
 * map-page.spec.ts fakes it: the page logic is tested against this fake;
 * the real service's marker/lifecycle behaviour lives in
 * leaflet-service.spec.ts.
 */
class FakeLeafletService {
  created = 0;
  destroyed = 0;
  /** Mirrors the real service: only a LIVE map answers flyTo/showShelter
   *  (the real calls are `this.map?.…` no-ops otherwise). */
  private alive = false;
  flyToCalls: [number, number, number | undefined][] = [];
  showShelterCalls: (ShelterDto | null)[] = [];
  markerClick: ((shelterId: number) => void) | null = null;
  mapClick: ((latitude: number, longitude: number) => void) | null = null;

  create = vi.fn((el: HTMLElement | null): void => {
    // Mirrors the real service's null-container + one-per-instance guards.
    if (el && !this.alive) {
      this.alive = true;
      this.created++;
    }
  });
  renderShelters = vi.fn((rows: ShelterDto[]): void => {
    void rows;
  });
  flyTo = vi.fn((latitude: number, longitude: number, zoom?: number): void => {
    if (this.alive) {
      this.flyToCalls.push([latitude, longitude, zoom]);
    }
  });
  showShelter = vi.fn((shelter: ShelterDto | null): void => {
    if (this.alive) {
      this.showShelterCalls.push(shelter);
    }
  });
  setPick = vi.fn();
  destroy = vi.fn((): void => {
    this.alive = false;
    this.destroyed++;
  });
}

/** AuthStore-shaped fake — real signals so zoneless CD stays reactive. */ function fakeAuthStore(
  overrides: { authenticated?: boolean; levels?: VerificationLevel[]; isAdmin?: boolean } = {},
): AuthStore {
  const authenticated = signal(overrides.authenticated ?? false);
  const levels = signal<VerificationLevel[]>(overrides.levels ?? []);
  return {
    authenticated,
    initialized: signal(true),
    levels,
    // admin-moderation: the shell's nav item reads this — default false.
    isAdmin: signal(overrides.isAdmin ?? false),
    init: vi.fn(async () => undefined),
    isVerified: () => levels().includes('EMAIL') || levels().includes('PHONE'),
  } as unknown as AuthStore;
}

function registryShelter(overrides: Partial<ShelterDetailDto> = {}): ShelterDetailDto {
  return {
    id: 1,
    address: 'Tornimäe 1, Tallinn',
    name: 'Tallinn Central Shelter',
    latitude: 59.437,
    longitude: 24.754,
    status: 'ACTIVE',
    source: 'PAASETEAMET',
    createdAt: '2025-09-01T08:00:00Z',
    description: null,
    capacity: null,
    submitterVerified: false, // registry rows have no creator
    nonexistentReports: 0,
    reportCount: 0, // total (all report types)
    openStatus: null,
    occupancy: null,
    reviewStatus: 'CONFIRMED', // registry backfill
    locationKind: 'PUBLIC',
    lastVerifiedAt: null, // null = never verified
    inaccurate: false, // no moderator mark on this row
    yourOccupancyBand: null, // the detail projection's extra field
    yourOpenStatus: null, // the detail projection's open-status pre-select
    ...overrides,
  };
}

function userShelter(overrides: Partial<ShelterDetailDto> = {}): ShelterDetailDto {
  return {
    ...registryShelter(),
    id: 7,
    address: null,
    name: 'Community Cellar',
    source: 'USER',
    description: 'Neighbourhood basement',
    capacity: 12,
    reviewStatus: 'NEW', // existing USER rows backfill NEW (amber)
    ...overrides,
  };
}

/** Navigation targets (real app routes; stubs keep the test shell small). */
@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ template: '<p>login stub</p>' })
class LoginStub {}

@Component({ template: '<p>verify stub</p>' })
class VerifyStub {}

describe('ShelterDetailPage (/shelters/:id)', () => {
  let shelterGateway: FakeShelterGateway;
  let leaflet: FakeLeafletService;
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    shelterGateway = new FakeShelterGateway();
    leaflet = new FakeLeafletService();
    store = fakeAuthStore();
    TestBed.configureTestingModule({
      // The real shell so "page chrome stays intact" is asserted against the
      // actual header/nav, not a stand-in.
      imports: [PageShell],
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'login', component: LoginStub },
          { path: 'verify', component: VerifyStub },
          { path: 'shelters/:id', component: ShelterDetailPage },
        ]),
        { provide: ShelterGateway, useValue: shelterGateway as unknown as ShelterGateway },
        { provide: DataSourceGateway, useValue: { fetch: () => Promise.resolve(null) } },
        { provide: AuthStore, useValue: store },
        { provide: LeafletService, useValue: leaflet as unknown as LeafletService },
      ],
    });
    // ShelterDetailPage declares a page-scoped LeafletService provider; drop
    // it so the root-level fake is the one the page injects.
    TestBed.overrideComponent(ShelterDetailPage, { remove: { providers: [LeafletService] } });
  });

  async function open(path: string): Promise<{
    page: ShelterDetailPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>;
    router: Router;
  }> {
    // Inject only AFTER any test-level provider overrides ran.
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(PageShell);
    fixture.detectChanges();
    await router.navigateByUrl(path);
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(ShelterDetailPage));
    if (!debug) {
      throw new Error('ShelterDetailPage not rendered');
    }
    return {
      page: debug.componentInstance,
      element: debug.nativeElement as HTMLElement,
      fixture,
      router,
    };
  }

  async function settle(
    fixture: ReturnType<typeof TestBed.createComponent<PageShell>>,
  ): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
  }

  /** Switch the (signal-backed) fake session — no provider overrides needed. */
  function setSession(authenticated: boolean, levels: VerificationLevel[] = []): void {
    store.authenticated.set(authenticated);
    store.levels.set(levels);
  }

  function text(fixture: ReturnType<typeof TestBed.createComponent<PageShell>>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** The Info section row's <dd> text by its <dt> label ('' = row absent). */
  function infoRowValue(element: HTMLElement, label: string): string {
    const info = element.querySelector('#info-heading')?.closest('section');
    const dt = [...info!.querySelectorAll('dt')].find(
      (d) => (d.textContent ?? '').trim() === label,
    );
    return dt?.nextElementSibling?.textContent?.trim() ?? '';
  }

  describe('reading (public)', () => {
    it('renders the shelter header and the practical info block (no reviews UI)', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element, fixture } = await open('/shelters/1');
      expect(shelterGateway.get).toHaveBeenCalledWith(1);

      expect(text(fixture)).toContain('Tallinn Central Shelter');
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Päästeamet registry');
      expect(text(fixture)).toContain('Tornimäe 1, Tallinn');
      // The reviews model is gone: no star strip, no review list, no form.
      expect(element.querySelector('[role="img"]')).toBeNull();
      expect(element.querySelector('.review-list')).toBeNull();
      expect(element.querySelector('form')).toBeNull();
      // The practical info block (INFO-LAST-REPORTED): the two LAST
      // REPORTED rows — for a row with no recent log both show their
      // explicit empty states (no derived-status row on the public page;
      // see the Info section comment in the template for why).
      const info = element.querySelector('#info-heading')?.closest('section');
      expect(info).not.toBeNull();
      const labels = [...info!.querySelectorAll('dt')].map((d) => (d.textContent ?? '').trim());
      expect(labels).toEqual(['Status', 'Capacity']);
      expect(infoRowValue(element, 'Status')).toBe('No open/closed reports yet');
      expect(infoRowValue(element, 'Capacity')).toBe('No how-full reports yet');
    });

    it('renders a USER row null-safely: no address, description + capacity, Status Open', async () => {
      shelterGateway.rows.set(7, userShelter());
      const { element, fixture } = await open('/shelters/7');

      expect(text(fixture)).toContain('Community Cellar');
      expect(element.querySelector('.shelter-detail__address')).toBeNull(); // null address
      expect(text(fixture)).toContain('Neighbourhood basement');
      expect(text(fixture)).toContain('Capacity: 12');
      // The trust-state label (community-review-queue): NEW ->
      // "Newly added" (replacing the old "User-submitted" wording).
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Newly added');
      // An ACTIVE row with nothing fresh shows BOTH last-reported rows in
      // their empty states (no derived-status row on the public page).
      const info = element.querySelector('#info-heading')?.closest('section');
      const labels = [...info!.querySelectorAll('dt')].map((d) => (d.textContent ?? '').trim());
      expect(labels).toEqual(['Status', 'Capacity']);
      expect(infoRowValue(element, 'Status')).toBe('No open/closed reports yet');
      expect(infoRowValue(element, 'Capacity')).toBe('No how-full reports yet');
    });

    it('a NEW community row carries the unverified warning block next to the trust badge', async () => {
      shelterGateway.rows.set(7, userShelter());
      const { element } = await open('/shelters/7');

      const warning = element.querySelector<HTMLElement>('.community-warning');
      expect(warning?.textContent?.trim()).toBe(
        'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.',
      );
      // It lives in the header, right under the title row (badge's row).
      expect(warning?.closest('.shelter-detail__header')).not.toBeNull();
    });

    it('a CONFIRMED community row keeps the "Community-checked" badge and shows NO warning', async () => {
      shelterGateway.rows.set(8, userShelter({ id: 8, reviewStatus: 'CONFIRMED' }));
      const { element } = await open('/shelters/8');

      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Community-checked');
      expect(element.querySelector('.community-warning')).toBeNull();
      expect(element.textContent).not.toContain(
        'This location was submitted by a community member',
      );
    });

    it('a registry row shows NO unverified warning block', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element } = await open('/shelters/1');

      expect(element.querySelector('.community-warning')).toBeNull();
      expect(element.textContent).not.toContain(
        'This location was submitted by a community member',
      );
    });

    it('a marked row carries the single-sourced inaccurate warning in the header', async () => {
      // A CONFIRMED community row: the unverified block is absent, so the
      // single .community-warning IS the marked-row treatment.
      shelterGateway.rows.set(
        8,
        userShelter({
          id: 8,
          reviewStatus: 'CONFIRMED',
          inaccurate: true,
        }),
      );
      const { element } = await open('/shelters/8');

      const warnings = element.querySelectorAll('.community-warning');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].textContent).toBe('Reported inaccurate — details may be wrong');
      expect(warnings[0].closest('.shelter-detail__header')).not.toBeNull();
      // the row stays visible — no hidden/inactive treatment
      expect(element.textContent).toContain('Community-checked');
    });

    it('a PRIVATE row shows the private badge and the resident-offered note ', async () => {
      shelterGateway.rows.set(9, userShelter({ id: 9, locationKind: 'PRIVATE' }));
      const { element, fixture } = await open('/shelters/9');

      const badge = element.querySelector<HTMLElement>('.badge--private');
      expect(badge?.textContent?.trim()).toBe('Private home (declared)');
      const note = element.querySelector<HTMLElement>('.private-note');
      expect(note?.textContent?.trim()).toBe(
        'This is a resident-offered location, not an official facility.',
      );
      // The NEW-state warning still renders alongside (independent).
      expect(text(fixture)).toContain('This location was submitted by a community member');
    });

    it('a PUBLIC row shows no private badge or note', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element } = await open('/shelters/1');

      expect(element.querySelector('.badge--private')).toBeNull();
      expect(element.querySelector('.private-note')).toBeNull();
    });

    it('header badge shows the registry values: MUNICIPALITY and the USER trust states', async () => {
      shelterGateway.rows.set(
        2,
        registryShelter({
          id: 2,
          name: 'Pärnu Municipal Shelter',
          source: 'MUNICIPALITY',
        }),
      );
      const { element } = await open('/shelters/2');
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Municipal registry');

      shelterGateway.rows.set(
        8,
        userShelter({ id: 8, name: 'Verified Cellar', submitterVerified: true }),
      );
      const { element: el8 } = await open('/shelters/8');
      // A verified submitter is NOT a verified shelter — the label follows
      // the trust state, not submitterVerified (community-review-queue).
      expect(el8.querySelector('.badge')?.textContent?.trim()).toBe('Newly added');
      expect(el8.querySelector('.community-warning')).not.toBeNull();
    });

    // ----- last-verified meta --------------------------------------------

    it('a verified registry row shows the last-verified line naming the registry ', async () => {
      const hoursAgo = (h: number): string => new Date(Date.now() - h * 3600000).toISOString();
      shelterGateway.rows.set(1, registryShelter({ lastVerifiedAt: hoursAgo(2) }));
      const { element } = await open('/shelters/1');

      const line = element.querySelector<HTMLElement>('.shelter-detail__verified');
      expect((line?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Last verified against the registry 2 h ago',
      );
      // No report-count line while the row has no community reports.
      expect(element.querySelector('.shelter-detail__reports')).toBeNull();
      expect(element.textContent).not.toContain('community report');
    });

    it('a verified community row keeps the plain verified line (no registry attribution)', async () => {
      const hoursAgo = (h: number): string => new Date(Date.now() - h * 3600000).toISOString();
      shelterGateway.rows.set(
        8,
        userShelter({ id: 8, reviewStatus: 'CONFIRMED', lastVerifiedAt: hoursAgo(2) }),
      );
      const { element } = await open('/shelters/8');

      const line = element.querySelector<HTMLElement>('.shelter-detail__verified');
      expect((line?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe('Last verified 2 h ago');
    });

    it('the community report count is a SEPARATE labeled line, never spliced onto the verified line ', async () => {
      const hoursAgo = (h: number): string => new Date(Date.now() - h * 3600000).toISOString();
      shelterGateway.rows.set(1, registryShelter({ lastVerifiedAt: hoursAgo(2), reportCount: 3 }));
      const { element } = await open('/shelters/1');

      // Two self-contained facts on two lines — the verified line alone
      // cannot be read as the report fact (or vice versa).
      const verified = element.querySelector<HTMLElement>('.shelter-detail__verified');
      const reports = element.querySelector<HTMLElement>('.shelter-detail__reports');
      expect((verified?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Last verified against the registry 2 h ago',
      );
      expect(verified?.textContent).not.toContain('Community reports');
      expect((reports?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Community reports: 3 (total, all types)',
      );
    });

    it('a NEW community row reads the not-yet-verified line: submission age, no verification', async () => {
      const daysAgo = (d: number): string => new Date(Date.now() - d * 86400000).toISOString();
      shelterGateway.rows.set(7, userShelter({ createdAt: daysAgo(3) }));
      const { element } = await open('/shelters/7');

      const line = element.querySelector<HTMLElement>('.shelter-detail__verified');
      expect((line?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Newly added 3 d ago — not yet verified',
      );
    });

    it('a non-NEW row without a verification record says so plainly', async () => {
      shelterGateway.rows.set(8, userShelter({ id: 8, reviewStatus: 'CONFIRMED' }));
      const { element } = await open('/shelters/8');

      const line = element.querySelector<HTMLElement>('.shelter-detail__verified');
      expect((line?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'No verification record yet',
      );
    });

    it('a NEW row carrying reports (e.g. a self-confirm) still reads unverified until the server stamps it', async () => {
      // The FE renders the server value — reportCount alone never fabricates
      // a verification stamp (a self-confirm reports but does not verify).
      // createdAt is the fixture's fixed 2025-09-01 — over 7 days old, so
      // the submission age falls back to the concrete date.
      shelterGateway.rows.set(7, userShelter({ reportCount: 1 }));
      const { element } = await open('/shelters/7');

      const line = element.querySelector<HTMLElement>('.shelter-detail__verified');
      expect((line?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Newly added 1 Sep 2025 — not yet verified',
      );
      // The report count is its own line, never spliced onto the signal line.
      const reports = element.querySelector<HTMLElement>('.shelter-detail__reports');
      expect((reports?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Community reports: 1 (total, all types)',
      );
    });

    it('shows a not-found state for an unknown id (404) — no error storm', async () => {
      const { element, fixture } = await open('/shelters/999');

      expect(text(fixture)).toContain('Shelter not found');
      expect(element.querySelector('.banner--error')).toBeNull();
      expect(element.querySelector('a[href="/map"]')).not.toBeNull();
    });

    it('shows not-found for a non-numeric id without calling the API', async () => {
      const { fixture } = await open('/shelters/abc');

      expect(text(fixture)).toContain('Shelter not found');
      expect(shelterGateway.get).not.toHaveBeenCalled();
    });

    it('shows a loading indicator while fetching, then the content', async () => {
      let resolveGet!: (row: ShelterDto) => void;
      shelterGateway.get = vi.fn(
        () =>
          new Promise<ShelterDto>((resolve) => {
            resolveGet = resolve;
          }),
      ) as never;
      const { fixture } = await open('/shelters/1');
      expect(text(fixture)).toContain('Loading shelter…');

      resolveGet(registryShelter());
      await settle(fixture);
      expect(text(fixture)).toContain('Tallinn Central Shelter');
      expect(text(fixture)).not.toContain('Loading shelter…');
    });

    it('a manual URL edit to another shelter re-loads the new id (N7)', async () => {
      shelterGateway.rows.set(1, registryShelter());
      shelterGateway.rows.set(7, userShelter());
      const { element, fixture, router } = await open('/shelters/1');
      expect(shelterGateway.get).toHaveBeenCalledWith(1);
      expect(text(fixture)).toContain('Tallinn Central Shelter');

      // Manual navigation within the same route (no page re-creation).
      await router.navigateByUrl('/shelters/7');
      await settle(fixture);

      expect(shelterGateway.get).toHaveBeenCalledWith(7);
      expect(text(fixture)).toContain('Community Cellar');
      expect(text(fixture)).not.toContain('Tallinn Central Shelter');
      // The anonymous report prompt (no form) is now about the NEW shelter
      // — plain text only (no inline login button on the page).
      expect(text(fixture)).toContain('Log in to report this shelter.');
      expect(element.querySelector('a[href*="returnUrl"]')).toBeNull();
    });

    it('shows the error banner with page chrome intact when the backend is down', async () => {
      shelterGateway.get = vi.fn(async () => {
        throw ApiError.fromNetwork();
      }) as never;
      const { element, fixture } = await open('/shelters/1');

      expect(element.querySelector('.banner--error')?.textContent).toContain(
        'Cannot reach the backend',
      );
      // Chrome — shell header/nav AND the page title — stays intact.
      expect(text(fixture)).toContain('OpenShelter');
      expect(text(fixture)).toContain('Shelter details');
    });
  });
  describe('navigate actions (Google Maps walking + Apple Maps)', () => {
    beforeEach(() => {
      shelterGateway.rows.set(1, registryShelter());
    });

    /** jsdom/css-select cannot match a full attribute VALUE containing `&`
     *  (css-select quirk), so the links are looked up by their text and the
     *  exact href is asserted on the attribute. */
    function linkByText(element: HTMLElement, label: string): HTMLAnchorElement | undefined {
      return [...element.querySelectorAll<HTMLAnchorElement>('.shelter-detail__navigate a')].find(
        (a) => (a.textContent ?? '').trim() === label,
      );
    }

    it('renders both deep links in the header with 5-decimal coordinates and the encoded name', async () => {
      const { element } = await open('/shelters/1');

      const navigate = linkByText(element, 'Google Maps');
      expect(navigate).toBeDefined();
      expect(navigate?.getAttribute('href')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=59.43700,24.75400&travelmode=walking',
      );
      expect(navigate?.getAttribute('target')).toBe('_blank');
      expect(navigate?.getAttribute('rel')).toBe('noopener');

      const apple = linkByText(element, 'Apple Maps');
      expect(apple).toBeDefined();
      expect(apple?.getAttribute('href')).toBe(
        'https://maps.apple.com/?daddr=59.43700,24.75400&q=Tallinn%20Central%20Shelter',
      );
      expect(apple?.getAttribute('target')).toBe('_blank');
      expect(apple?.getAttribute('rel')).toBe('noopener');

      // Both sit in the header, near the name.
      expect(
        element.querySelector('.shelter-detail__header .shelter-detail__navigate'),
      ).not.toBeNull();
    });

    it('renders the coordinate line with tabular numerals ', async () => {
      const { element } = await open('/shelters/1');

      const coords = element.querySelector('.shelter-detail__coords');
      expect(coords).not.toBeNull();
      expect(coords?.classList.contains('num-tabular')).toBe(true);
      expect(coords?.textContent?.trim()).toBe('59.43700, 24.75400');
    });

    it('a USER row (null address) still gets both links and the coordinate line', async () => {
      shelterGateway.rows.set(7, userShelter());
      const { element } = await open('/shelters/7');

      expect(linkByText(element, 'Google Maps')?.getAttribute('href')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=59.43700,24.75400&travelmode=walking',
      );
      expect(linkByText(element, 'Apple Maps')?.getAttribute('href')).toBe(
        'https://maps.apple.com/?daddr=59.43700,24.75400&q=Community%20Cellar',
      );
      // The accessible name names THIS shelter (the name interpolation):
      expect(linkByText(element, 'Google Maps')?.getAttribute('aria-label')).toBe(
        'Open walking directions to Community Cellar in Google Maps',
      );
      expect(element.querySelector('.shelter-detail__coords')?.textContent).toContain(
        '59.43700, 24.75400',
      );
    });

    it('brand-only visible labels keep a meaningful accessible name (aria-label = action + destination + service)', async () => {
      const { element } = await open('/shelters/1');
      const byLabel = (label: string) =>
        [...element.querySelectorAll<HTMLAnchorElement>('.shelter-detail__navigate a')].find(
          (a) => (a.textContent ?? '').trim() === label,
        );

      const google = byLabel('Google Maps');
      const apple = byLabel('Apple Maps');
      expect(google, 'the visible label is the brand name only (owner)').toBeDefined();
      expect(apple, 'the visible label is the brand name only (owner)').toBeDefined();

      // A bare brand name is not a meaningful accessible name: each link
      // states what it DOES — open directions to THIS shelter in that
      // service — and the two links stay distinguishable (service, plus
      // the walking mode the Google link actually requests).
      expect(google!.getAttribute('aria-label')).toBe(
        'Open walking directions to Tallinn Central Shelter in Google Maps',
      );
      expect(apple!.getAttribute('aria-label')).toBe(
        'Open directions to Tallinn Central Shelter in Apple Maps',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Distance from you (location-navigation): the page's ONLY
  // geolocation trigger — client-side Haversine to the shelter's own point,
  // the straight-line honesty format, the map CTA's mirrored error copy.
  // ---------------------------------------------------------------------------
  describe('distance from you ', () => {
    beforeEach(() => {
      shelterGateway.rows.set(1, registryShelter());
    });

    afterEach(() => {
      // Never leak the stub into the other describes.
      setGeolocation(undefined);
    });

    /** Geolocation seam (the map page spec's pattern): stub
     *  navigator.geolocation with a hand-written fake. */
    function stubGeolocation(behavior: {
      position?: { latitude: number; longitude: number; accuracy: number };
      errorCode?: number;
    }): ReturnType<typeof vi.fn> {
      const getCurrentPosition = vi.fn(
        (
          success: (p: GeolocationPosition) => void,
          failure: (e: { code: number }) => void,
        ): void => {
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

    function setGeolocation(fake: ReturnType<typeof stubGeolocation> | undefined): void {
      Object.defineProperty(navigator, 'geolocation', {
        value: fake === undefined ? undefined : { getCurrentPosition: fake },
        configurable: true,
      });
    }

    it('renders the action as the third link-styled entry of the navigate group', async () => {
      const { element } = await open('/shelters/1');
      const button = element.querySelector<HTMLButtonElement>('.shelter-detail__distance');
      expect(button).not.toBeNull();
      expect(button!.textContent?.trim()).toBe('Distance from you');
      // A button (an action that asks the browser), not a deep link — it
      // sits inside the navigate group next to the two <a> links.
      expect(
        element.querySelector(
          '.shelter-detail__header .shelter-detail__navigate .shelter-detail__distance',
        ),
      ).not.toBeNull();
      // No distance line and no error before the first activation.
      expect(element.querySelector('.shelter-detail__distance-line')).toBeNull();
      expect(element.querySelector('.shelter-detail__distance-error')).toBeNull();
    });

    it('on success renders the straight-line distance line (km scale, 1 decimal) under the coordinates', async () => {
      // The registry shelter sits at (59.437, 24.754); the user 0.01° north
      // is 1.1118 km away — "≈ 1.1 km straight line from you" (honesty:
      // the line states what it measures, never a walking route).
      setGeolocation(
        stubGeolocation({ position: { latitude: 59.447, longitude: 24.754, accuracy: 10 } }),
      );
      const { element, fixture } = await open('/shelters/1');

      element.querySelector<HTMLButtonElement>('.shelter-detail__distance')!.click();
      await settle(fixture);

      const line = element.querySelector<HTMLElement>('.shelter-detail__distance-line');
      expect(line).not.toBeNull();
      expect(line?.getAttribute('role')).toBe('status');
      expect(line?.textContent?.trim()).toBe('≈ 1.1 km straight line from you');
      expect(line?.classList.contains('num-tabular')).toBe(true);
      expect(element.querySelector('.shelter-detail__distance-error')).toBeNull();
    });

    it('below 1 km the line uses whole metres (the shared formatter)', async () => {
      // 0.002° of latitude = 222.376 m → "≈ 222 m straight line from you".
      setGeolocation(
        stubGeolocation({ position: { latitude: 59.439, longitude: 24.754, accuracy: 10 } }),
      );
      const { element, fixture } = await open('/shelters/1');

      element.querySelector<HTMLButtonElement>('.shelter-detail__distance')!.click();
      await settle(fixture);

      expect(
        element.querySelector<HTMLElement>('.shelter-detail__distance-line')?.textContent?.trim(),
      ).toBe('≈ 222 m straight line from you');
    });

    it('a denied locate renders the denied per-error line and NO distance line', async () => {
      setGeolocation(stubGeolocation({ errorCode: 1 }));
      const { element, fixture } = await open('/shelters/1');

      element.querySelector<HTMLButtonElement>('.shelter-detail__distance')!.click();
      await settle(fixture);

      const error = element.querySelector<HTMLElement>('.shelter-detail__distance-error');
      expect(error).not.toBeNull();
      expect(error?.getAttribute('role')).toBe('alert');
      expect(error?.textContent).toContain('Location permission is off');
      expect(element.querySelector('.shelter-detail__distance-line')).toBeNull();
    });

    it('an unsupported browser renders the unsupported per-error line', async () => {
      setGeolocation(undefined);
      const { element, fixture } = await open('/shelters/1');

      element.querySelector<HTMLButtonElement>('.shelter-detail__distance')!.click();
      await settle(fixture);

      const error = element.querySelector<HTMLElement>('.shelter-detail__distance-error');
      expect(error?.textContent).toContain('does not support location access');
      expect(element.querySelector('.shelter-detail__distance-line')).toBeNull();
    });

    it('a failed retry clears the last success (F1: no stale distance beside the error)', async () => {
      const fake = vi.fn();
      let success: ((p: GeolocationPosition) => void) | undefined;
      let failure: ((e: { code: number }) => void) | undefined;
      fake.mockImplementation(
        (s: (p: GeolocationPosition) => void, f: (e: { code: number }) => void): void => {
          success = s;
          failure = f;
        },
      );
      setGeolocation(fake);
      const { element, fixture } = await open('/shelters/1');

      // First locate: success.
      element.querySelector<HTMLButtonElement>('.shelter-detail__distance')!.click();
      await settle(fixture);
      success!({
        coords: { latitude: 59.447, longitude: 24.754, accuracy: 10 },
      } as unknown as GeolocationPosition);
      await settle(fixture);
      expect(element.querySelector('.shelter-detail__distance-line')).not.toBeNull();

      // Second locate: failure — the stale line must be gone.
      element.querySelector<HTMLButtonElement>('.shelter-detail__distance')!.click();
      await settle(fixture);
      failure!({ code: 3 });
      await settle(fixture);

      expect(element.querySelector('.shelter-detail__distance-line')).toBeNull();
      expect(
        element.querySelector<HTMLElement>('.shelter-detail__distance-error')?.textContent,
      ).toContain('timed out');
    });
  });

  describe('location map (static, zoomed to the shelter)', () => {
    it('on load success the map is created, flies to the shelter at street level, and pins it', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element } = await open('/shelters/1');

      // The container is always mounted in the non-not-found state (next to
      // the header, outside the shelter branch), so the page-scoped map is
      // created before the async fetch settles.
      expect(element.querySelector('.shelter-detail__map')).not.toBeNull();
      expect(leaflet.created).toBe(1);
      // Flown to the shelter's coordinates at street level (SHELTER_ZOOM).
      expect(leaflet.flyToCalls).toEqual([[59.437, 24.754, SHELTER_ZOOM]]);
      // Pinned with the shelter's row data (static marker, no picking).
      expect(leaflet.showShelterCalls).toEqual([
        expect.objectContaining({ id: 1, latitude: 59.437, longitude: 24.754 }),
      ]);
    });

    it('a 404 never flies or pins (the not-found state renders no map at all)', async () => {
      await open('/shelters/999');

      expect(leaflet.flyToCalls).toEqual([]);
      expect(leaflet.showShelterCalls).toEqual([]);
    });

    it('a 404 after create destroys the map (the not-found branch unmounts the container) ', async () => {
      // /shelters/999 is a VALID id the gateway 404s: the container is
      // mounted at view-init (map created), then the 404 flip to the
      // not-found branch unmounts it — the live map must be destroyed.
      await open('/shelters/999');

      expect(leaflet.created).toBe(1);
      expect(leaflet.destroyed).toBe(1);
    });

    it('a 404 -> valid-id re-navigation shows a working (re-created) map ', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element, fixture, router } = await open('/shelters/999');
      expect(leaflet.created).toBe(1);
      expect(leaflet.destroyed).toBe(1);
      expect(text(fixture)).toContain('Shelter not found');

      // Manual navigation back to a real shelter: the @else branch renders
      // a FRESH container — the map must be re-created on it and pinned.
      await router.navigateByUrl('/shelters/1');
      for (let i = 0; i < 5; i++) {
        await settle(fixture);
      }

      expect(text(fixture)).toContain('Tallinn Central Shelter');
      expect(element.querySelector('.shelter-detail__map')).not.toBeNull();
      expect(leaflet.created).toBe(2);
      expect(leaflet.flyToCalls).toEqual([[59.437, 24.754, SHELTER_ZOOM]]);
      expect(leaflet.showShelterCalls).toEqual([
        expect.objectContaining({ id: 1, latitude: 59.437, longitude: 24.754 }),
      ]);
    });

    it('an invalid id after a loaded page destroys the map ', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { fixture, router } = await open('/shelters/1');
      expect(leaflet.created).toBe(1);
      expect(leaflet.destroyed).toBe(0);

      await router.navigateByUrl('/shelters/abc');
      for (let i = 0; i < 5; i++) {
        await settle(fixture);
      }

      expect(text(fixture)).toContain('Shelter not found');
      expect(leaflet.destroyed).toBe(1);
      expect(leaflet.created).toBe(1); // nothing was re-created
    });

    it('an id switch clears the previous pin before the new fetch settles (F9)', async () => {
      shelterGateway.rows.set(1, registryShelter());
      shelterGateway.rows.set(7, userShelter());
      const { fixture, router } = await open('/shelters/1');
      expect(leaflet.showShelterCalls).toEqual([expect.objectContaining({ id: 1 })]);

      // Manual navigation within the same route (no page re-creation):
      // the previous shelter's pin must not sit over the map while the new
      // fetch is in flight — the reset block clears it, the new pin lands
      // on settle.
      await router.navigateByUrl('/shelters/7');
      await settle(fixture);

      expect(leaflet.showShelterCalls).toEqual([
        expect.objectContaining({ id: 1 }),
        null, // the id switch cleared the stale pin
        expect.objectContaining({ id: 7 }),
      ]);
    });

    it('a backend error keeps the map container mounted (placeholder) without a pin', async () => {
      shelterGateway.get = vi.fn(async () => {
        throw ApiError.fromNetwork();
      }) as never;
      const { element } = await open('/shelters/1');

      expect(element.querySelector('.shelter-detail__map')).not.toBeNull();
      expect(leaflet.flyToCalls).toEqual([]);
      expect(leaflet.showShelterCalls).toEqual([]);
    });

    it('destroys the map when the page is destroyed (no leak between visits)', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { fixture } = await open('/shelters/1');

      fixture.destroy();
      expect(leaflet.destroyed).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Trust layer (shelter-trust-and-reports):
  // header badges · shelter report · "report how full"
  // picker.
  // All endpoints mocked; 409 → the plain sentence-case line.
  // ---------------------------------------------------------------------------
  describe('trust layer (shelter-trust-and-reports)', () => {
    const minutesAgo = (minutes: number): string =>
      new Date(Date.now() - minutes * 60000).toISOString();

    // Default: the shelter exists and the viewer is verified — individual
    // tests override the session (anonymous/unverified variants) and may
    // re-seed the row with trust fields.
    beforeEach(() => {
      shelterGateway.rows.set(1, registryShelter());
      setSession(true, ['EMAIL']);
    });

    function sectionOf(element: HTMLElement, headingId: string): HTMLElement | null {
      const heading = element.querySelector(`#${headingId}`);
      return heading ? (heading.closest('section') ?? null) : null;
    }

    function pickRadio(form: HTMLFormElement, labelText: string): void {
      const option = [...form.querySelectorAll<HTMLLabelElement>('.report-option')].find((l) =>
        (l.textContent ?? '').includes(labelText),
      );
      const input = option?.querySelector('input') as HTMLInputElement | null;
      if (input === null) throw new Error(`report radio "${labelText}" not found`);
      input.checked = true;
      input.dispatchEvent(new Event('change'));
    }

    it('header: reported / open-status / occupancy badges render beside the source/trust badge', async () => {
      shelterGateway.rows.set(
        1,
        registryShelter({
          name: 'Trusty Shelter',
          nonexistentReports: 2,
          openStatus: { state: 'CLOSED', reportedAt: minutesAgo(12), reportCount: 2 },
          occupancy: { band: 'FULL', reportCount: 2, lastReportedAt: minutesAgo(12) },
        }),
      );
      const { element } = await open('/shelters/1');

      // The count — the nonexistentReports subset that drives the badge.
      expect(element.querySelector('.badge--reported')?.textContent?.trim()).toBe('Reported (2)');
      // A fresh firm CLOSED net (two+) is the amber badge, firm copy.
      expect(element.querySelector('.badge--closed')?.textContent?.trim()).toBe('Closed');
      expect(element.querySelector('.badge--occupancy')?.textContent?.trim()).toBe(
        'Full · 12 min ago',
      );
      // The source/trust badge is the FIRST one — the trust badges are
      // appended, never replacing it.
      const badges = [...element.querySelectorAll('.shelter-detail__title-row .badge')].map((b) =>
        (b as HTMLElement).textContent?.trim(),
      );
      expect(badges).toContain('Päästeamet registry');
      expect(badges).toHaveLength(4);
    });

    it('a fresh OPEN report renders NO header badge (open is the default — no noise)', async () => {
      shelterGateway.rows.set(
        1,
        registryShelter({
          openStatus: { state: 'OPEN', reportedAt: minutesAgo(12), reportCount: 3 },
        }),
      );
      const { element } = await open('/shelters/1');

      // No open-status badge at all (the lone remaining badge is the
      // source/trust one).
      expect(element.querySelector('.badge--closed')).toBeNull();
      const badges = [...element.querySelectorAll('.shelter-detail__title-row .badge')].map((b) =>
        (b as HTMLElement).textContent?.trim(),
      );
      expect(badges).toEqual(['Päästeamet registry']);
    });

    it('unreported shelter: no reported/open-status/occupancy badges in the header', async () => {
      const { element } = await open('/shelters/1');

      expect(element.querySelector('.badge--reported')).toBeNull();
      expect(element.querySelector('.badge--closed')).toBeNull();
      expect(element.querySelector('.badge--occupancy')).toBeNull();
    });

    // ----- info block (INFO-LAST-REPORTED: the last reported rows) -----

    it('the info block renders exactly the two last-reported rows — the derived status is NOT a row on the public page, but the header badge still carries the derived copy', async () => {
      // A fresh lone CLOSED report: the derived rule hedges to "Reported
      // closed". That copy still surfaces on the public page — in the
      // header badge — while the info block shows ONLY the last-reported
      // rows (the owner removed the derived row: redundant with these —
      // same fresh reports, same word — and the one case where it would
      // differ, INACTIVE, 404s on the public detail read).
      shelterGateway.rows.set(
        1,
        registryShelter({
          openStatus: { state: 'CLOSED', reportedAt: minutesAgo(12), reportCount: 1 },
          communityPulse: {
            openClosed: null,
            occupancy: null,
            recentReports: [{ kind: 'CLOSED', reportedAt: minutesAgo(12) }],
          },
        }),
      );
      const { element } = await open('/shelters/1');
      // The badge keeps the derived copy (shared rule, shelter-copy —
      // unit-pinned in shelter-copy.spec.ts, which the map chip and the
      // admin-facing displays also consume).
      expect(element.querySelector('.badge--closed')?.textContent?.trim()).toBe('Reported closed');
      // The info block: exactly the two last-reported rows, nothing else.
      const info = element.querySelector('#info-heading')?.closest('section');
      const labels = [...info!.querySelectorAll('dt')].map((d) => (d.textContent ?? '').trim());
      expect(labels).toEqual(['Status', 'Capacity']);
      expect(infoRowValue(element, 'Status')).toContain('Last reported as Closed');
      // The derived word must not leak back into the info block.
      expect(infoRowValue(element, 'Status')).not.toContain('Reported closed');
      expect(
        [...info!.querySelectorAll('dt')].some(
          (d) => (d.textContent ?? '').trim() === 'Shelter status',
        ),
        'no derived "Shelter status" row on the public page',
      ).toBe(false);
    });

    // ----- shelter report --------------------------------------

    it('verified: the shelter Report picker opens with the three NEGATIVE types and a factual detail field for the factual types (open-status wave: CLOSED/OPEN_CONFIRMED left the picker)', async () => {
      const { element, fixture } = await open('/shelters/1');
      const section = sectionOf(element, 'report-shelter-heading');
      expect(section).not.toBeNull();

      const reportBtn = [...section!.querySelectorAll('button')].find(
        (b) => (b.textContent ?? '').trim() === 'Report',
      );
      expect(reportBtn).not.toBeNull();
      reportBtn!.click();
      fixture.detectChanges(); // zoneless: flush the picker-open signal update

      const form = section!.querySelector('form')!;
      expect(form).not.toBeNull();
      const radios = [...form.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
      expect(radios.map((r) => r.value)).toEqual(['NON_EXISTENT', 'WRONG_LOCATION', 'OTHER']);
      expect(section!.textContent).toContain('It does not exist');
      expect(section!.textContent).toContain('The location is wrong');
      expect(section!.textContent).toContain('Something else');
      // CLOSED left the picker (open/closed is its own live-report section)
      // and OPEN_CONFIRMED never returns — both stay legal values in stored
      // data + the admin label map, but the picker is negative-only.
      expect(section!.textContent).not.toContain('It is closed');
      expect(section!.textContent).not.toContain('It is open');
      // The detail field appears only once a factual type is picked
      // (optional text, max 500 — the binary type sends no detail).
      expect(form.querySelector('#report-detail')).toBeNull();

      pickRadio(form, 'The location is wrong');
      fixture.detectChanges(); // zoneless: flush the reportType signal update
      expect(form.querySelector('#report-detail')).not.toBeNull();
      expect(form.querySelector<HTMLTextAreaElement>('#report-detail')!.placeholder).toBe(
        'What is the actual address?',
      );

      pickRadio(form, 'It does not exist');
      fixture.detectChanges(); // the binary type drops the field again
      expect(form.querySelector('#report-detail')).toBeNull();

      pickRadio(form, 'Something else');
      fixture.detectChanges(); // zoneless: flush the reportType signal update
      const detail = form.querySelector<HTMLTextAreaElement>('#report-detail');
      expect(detail).not.toBeNull();
      expect(detail!.placeholder).toBe('What should the community know?');
      detail!.value = 'Wrong address, moved to Pärnu.';
      detail!.dispatchEvent(new Event('input'));
      expect(form.querySelector<HTMLTextAreaElement>('#report-detail')!.value).toBe(
        'Wrong address, moved to Pärnu.',
      );
      // Submit enabled: a type is picked and the (optional) detail is valid.
      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(submitBtn?.disabled).toBe(false);
    });

    it('verified: submitting NON_EXISTENT POSTs the right body, shows the one-line success, and closes the picker', async () => {
      const { element, fixture } = await open('/shelters/1');
      const section = sectionOf(element, 'report-shelter-heading')!;
      [...section.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      fixture.detectChanges(); // zoneless: flush the picker-open signal update
      const form = section.querySelector('form')!;

      pickRadio(form, 'It does not exist');
      form.requestSubmit();
      await settle(fixture);

      expect(shelterGateway.report).toHaveBeenCalledTimes(1);
      expect(shelterGateway.report).toHaveBeenCalledWith(1, {
        type: 'NON_EXISTENT',
      });
      // Success is the shared page banner, not a section-local line.
      expect(text(fixture)).toContain('Your report was submitted.');
      expect(section.querySelector('form')).toBeNull(); // picker closed
      expect(section.querySelector('#report-detail')).toBeNull();
    });

    it('verified: a dampened report shows the reduced-weight notice ', async () => {
      // The reporter holds their own other listing of the same place — the
      // server stores the vote dampened (counts 0 toward the hide) and
      // answers {"damped": true}; the banner says so.
      shelterGateway.report.mockResolvedValueOnce({ damped: true });
      const { element, fixture } = await open('/shelters/1');
      const section = sectionOf(element, 'report-shelter-heading')!;
      [...section.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      fixture.detectChanges(); // zoneless: flush the picker-open signal update
      const form = section.querySelector('form')!;

      pickRadio(form, 'It does not exist');
      form.requestSubmit();
      await settle(fixture);

      expect(shelterGateway.report).toHaveBeenCalledTimes(1);
      // the notice says the report was recorded but WEIGHTED 0 — the
      // server's damped=true answers exactly that, with the why.
      expect(text(fixture)).toContain(
        'Your report was recorded but weighted 0 — because you have your own listing of a similar location, it does not count toward hiding this shelter.',
      );
      expect(text(fixture)).not.toContain('Your report was submitted.');
      expect(section.querySelector('form')).toBeNull(); // picker closed
    });

    it('verified: OTHER submits with the free-text detail (non-blank only)', async () => {
      const { element, fixture } = await open('/shelters/1');
      const section = sectionOf(element, 'report-shelter-heading')!;
      [...section.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      fixture.detectChanges(); // zoneless: flush the picker-open signal update
      const form = section.querySelector('form')!;

      pickRadio(form, 'Something else');
      fixture.detectChanges(); // zoneless: flush the reportType signal update
      const detail = form.querySelector<HTMLTextAreaElement>('#report-detail')!;
      detail.value = 'Wrong address, moved to Pärnu.';
      detail.dispatchEvent(new Event('input'));
      form.requestSubmit();
      await settle(fixture);

      expect(shelterGateway.report).toHaveBeenCalledTimes(1);
      expect(shelterGateway.report).toHaveBeenCalledWith(1, {
        type: 'OTHER',
        detail: 'Wrong address, moved to Pärnu.',
      });
      expect(text(fixture)).toContain('Your report was submitted.');
      expect(section.querySelector('form')).toBeNull(); // picker closed
    });

    it('verified: WRONG_LOCATION submits with its factual detail ', async () => {
      const { element, fixture } = await open('/shelters/1');
      const section = sectionOf(element, 'report-shelter-heading')!;
      [...section.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      fixture.detectChanges(); // zoneless: flush the picker-open signal update
      const form = section.querySelector('form')!;

      pickRadio(form, 'The location is wrong');
      fixture.detectChanges(); // zoneless: flush the reportType signal update
      const detail = form.querySelector<HTMLTextAreaElement>('#report-detail')!;
      detail.value = 'Moved to Lossi 2.';
      detail.dispatchEvent(new Event('input'));
      form.requestSubmit();
      await settle(fixture);

      expect(shelterGateway.report).toHaveBeenCalledTimes(1);
      expect(shelterGateway.report).toHaveBeenCalledWith(1, {
        type: 'WRONG_LOCATION',
        detail: 'Moved to Lossi 2.',
      });
      expect(text(fixture)).toContain('Your report was submitted.');
      expect(section.querySelector('form')).toBeNull(); // picker closed
    });

    it('verified: 409 duplicate renders the server\u2019s standard message in place of the picker ', async () => {
      shelterGateway.report.mockRejectedValueOnce(
        ApiError.fromHttp(
          409,
          {
            timestamp: '2026-01-01T00:00:00Z',
            status: 409,
            error: 'Conflict',
            // the server\u2019s standard duplicate message (DuplicateReportException.MESSAGE)
            message: 'This report has already been submitted',
            path: '/api/shelters/1/reports',
          },
          '/api/shelters/1/reports',
        ),
      );
      const { element, fixture } = await open('/shelters/1');
      const section = sectionOf(element, 'report-shelter-heading')!;
      [...section.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      fixture.detectChanges(); // zoneless: flush the picker-open signal update
      const form = section.querySelector('form')!;
      pickRadio(form, 'It does not exist');
      form.requestSubmit();
      await settle(fixture);

      expect(shelterGateway.report).toHaveBeenCalledWith(1, {
        type: 'NON_EXISTENT',
      });
      // The picker stays open with the plain line in place of the submit —
      // no dialog, no error banner.
      const status = section.querySelector('.report-status');
      expect(status?.textContent?.trim()).toBe('This report has already been submitted');
      expect(element.querySelector('.banner--error')).toBeNull();
    });

    it('unverified: the report section shows the verify prompt and NO picker', async () => {
      setSession(true, []);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'report-shelter-heading');
      expect(section).not.toBeNull();
      expect(section!.textContent).toContain('Verify your email or phone to report this shelter.');
      expect(section!.querySelector('a[href*="returnUrl"]')).not.toBeNull();
      expect(section!.querySelector('form')).toBeNull();
      expect(section!.querySelector('button')).toBeNull();
    });

    it('anonymous: the report section shows a plain login prompt (anonymous variant)', async () => {
      setSession(false);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'report-shelter-heading');
      expect(section).not.toBeNull();
      expect(section!.textContent).toContain('Log in to report this shelter.');
      expect(section!.querySelector('form')).toBeNull();
      expect(section!.querySelector('button')).toBeNull();
    });

    it('verified: the three 48px band buttons preselect from yourOccupancyBand and PUT the picked band', async () => {
      shelterGateway.rows.set(1, registryShelter({ yourOccupancyBand: 'FULL' }));
      const { element, fixture } = await open('/shelters/1');

      const section = sectionOf(element, 'occupancy-heading')!;
      const buttons = [...section.querySelectorAll<HTMLButtonElement>('.band-btn')];
      expect(buttons.map((b) => (b.textContent ?? '').trim())).toEqual([
        'Space available',
        'Getting full',
        'Full',
      ]);
      // Your last pick is preselected (aria-pressed + the visual class).
      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[2].classList.contains('band-btn--active')).toBe(true);

      buttons[0].click(); // "Space available" — different from your saved band
      await settle(fixture);

      expect(shelterGateway.reportOccupancy).toHaveBeenCalledTimes(1);
      expect(shelterGateway.reportOccupancy).toHaveBeenCalledWith(1, 'SPACE');
      // Success is the shared page banner (the section keeps the picker).
      expect(text(fixture)).toContain('Your occupancy report was saved.');
      // The refetch happened (second get for the same id).
      expect(shelterGateway.get).toHaveBeenCalledTimes(2);
    });

    it('verified: first-time reporter (no yourOccupancyBand) has no preselected band', async () => {
      const { element, fixture } = await open('/shelters/1'); // yourOccupancyBand: null

      const section = sectionOf(element, 'occupancy-heading')!;
      const buttons = [...section.querySelectorAll<HTMLButtonElement>('.band-btn')];
      expect(buttons).toHaveLength(3);
      for (const b of buttons) {
        expect(b.getAttribute('aria-pressed')).toBe('false');
        expect(b.classList.contains('band-btn--active')).toBe(false);
      }
      buttons[1].click();
      await settle(fixture);
      expect(shelterGateway.reportOccupancy).toHaveBeenCalledWith(1, 'GETTING_FULL');
    });

    it('verified: the aggregate line shows the occupancy summary beside the picker (neutral)', async () => {
      shelterGateway.rows.set(
        1,
        registryShelter({
          occupancy: { band: 'FULL', reportCount: 2, lastReportedAt: minutesAgo(12) },
        }),
      );
      const { element } = await open('/shelters/1');

      const line = element.querySelector('.occupancy-line');
      expect(line?.textContent?.trim()).toBe('Full · 12 min ago');
      // A single report hedges the copy (fresh shelter, verified viewer).
      shelterGateway.rows.set(
        8,
        registryShelter({
          id: 8,
          name: 'Lone Shelter',
          occupancy: { band: 'FULL', reportCount: 1, lastReportedAt: minutesAgo(12) },
        }),
      );
      const { element: element2 } = await open('/shelters/8');
      expect(element2.querySelector('.occupancy-line')?.textContent?.trim()).toBe(
        'Reported full · 12 min ago',
      );
    });

    it('anonymous: the occupancy section shows the login prompt (anonymous variant)', async () => {
      setSession(false);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'occupancy-heading')!;
      expect(section.textContent).toContain('Log in to report how full this shelter is.');
      expect(section.querySelector('button')).toBeNull();
      // Plain text only — the header login is the single entry point.
      expect(section.querySelector('a[href*="returnUrl"]')).toBeNull();
    });

    it('unverified: the occupancy section shows the verify prompt, no picker', async () => {
      setSession(true, []);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'occupancy-heading')!;
      expect(section.textContent).toContain(
        'Verify your email or phone to report how full this shelter is.',
      );
      expect(section.querySelector('.band-btn')).toBeNull();
    });

    // ----- report open/closed -------------------------------------------

    it('verified: the two 48px state buttons preselect from yourOpenStatus', async () => {
      shelterGateway.rows.set(1, registryShelter({ yourOpenStatus: 'CLOSED' }));
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'open-status-heading')!;
      const picker = section.querySelector<HTMLElement>('[role="group"]');
      expect(picker?.getAttribute('aria-label')).toBe('Is this shelter open right now?');
      const buttons = [...section.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      expect(buttons.map((b) => (b.textContent ?? '').trim())).toEqual(['Open now', 'Closed now']);
      // The user's live report is preselected (aria-pressed + the visual
      // class) — radio-style, exactly one pressed.
      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[0].classList.contains('open-status-btn--active')).toBe(false);
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[1].classList.contains('open-status-btn--active')).toBe(true);
    });

    it('verified: first-time reporter (no yourOpenStatus) has no preselected state', async () => {
      const { element } = await open('/shelters/1'); // yourOpenStatus: null

      const section = sectionOf(element, 'open-status-heading')!;
      const buttons = [...section.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      expect(buttons).toHaveLength(2);
      for (const b of buttons) {
        expect(b.getAttribute('aria-pressed')).toBe('false');
        expect(b.classList.contains('open-status-btn--active')).toBe(false);
      }
    });

    it('verified: a tap PUTs the state, shows the shared success, and refetches (settled pre-select comes from the fresh projection)', async () => {
      // The refetch answers with the CALLER's live state adopted — the
      // settled pre-select is the fresh yourOpenStatus, not the tap.
      const get = shelterGateway.get;
      shelterGateway.get = vi.fn(async (): Promise<ShelterDetailDto> =>
        registryShelter({ yourOpenStatus: 'OPEN' }),
      ) as never;
      const { element, fixture } = await open('/shelters/1');
      expect(shelterGateway.get).toHaveBeenCalledTimes(1); // the initial load

      const section = sectionOf(element, 'open-status-heading')!;
      const buttons = [...section.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      buttons[0].click(); // "Open now"
      await settle(fixture);

      expect(shelterGateway.putOpenStatus).toHaveBeenCalledTimes(1);
      expect(shelterGateway.putOpenStatus).toHaveBeenCalledWith(1, 'OPEN');
      // Success is the shared page banner (the section keeps the picker).
      expect(text(fixture)).toContain('Your open/closed report was saved.');
      // The refetch happened (second get for the same id), and the settled
      // projection carries the tapped state as preselected. The refetch's
      // loading flip re-mounted the sections, so re-query the live section.
      expect(shelterGateway.get).toHaveBeenCalledTimes(2);
      const liveSection = sectionOf(element, 'open-status-heading')!;
      const settled = [...liveSection.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      expect(settled[0].getAttribute('aria-pressed')).toBe('true');
      expect(settled[1].getAttribute('aria-pressed')).toBe('false');
      shelterGateway.get = get;
    });

    it('verified: the tapped state stays optimistically pressed while the upsert is in flight, and reverts on failure', async () => {
      let release!: (value: void) => void;
      shelterGateway.putOpenStatus.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      );
      const { element, fixture, page } = await open('/shelters/1');

      const section = sectionOf(element, 'open-status-heading')!;
      let buttons = [...section.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      buttons[1].click(); // "Closed now" — no live state to preselect from
      await fixture.whenStable();
      fixture.detectChanges();

      // In flight: the tapped state is pressed (optimistic) while the call
      // is still pending.
      buttons = [...section.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
      expect(shelterGateway.putOpenStatus).toHaveBeenCalledTimes(1);
      expect(shelterGateway.putOpenStatus).toHaveBeenCalledWith(1, 'CLOSED');

      // Settle the first tap fully: success banner + the refetch (the seeded
      // row carries no live state, so nothing is preselected afterwards).
      // The buttons stay disabled while reporting() is true, so the second
      // tap below must wait for the chain to end (settle loop, the file's
      // existing pattern for chained renders).
      release(undefined);
      for (let i = 0; i < 5; i++) {
        await settle(fixture);
      }
      expect(page.reporting()).toBe(false);
      expect(text(fixture)).toContain('Your open/closed report was saved.');

      // The refetch's loading flip unmounted the sections (the @else-if
      // block re-mounts on settle) — re-query the live section from the
      // host element for the second tap.
      const liveSection = sectionOf(element, 'open-status-heading')!;

      // Second tap, this one failing: the optimistic pressed state reverts
      // (no live state to fall back to) and the shared error banner
      // surfaces — same handling as the band picker.
      shelterGateway.putOpenStatus.mockRejectedValueOnce(ApiError.fromNetwork());
      buttons = [...liveSection.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      buttons[0].click();
      for (let i = 0; i < 5; i++) {
        await settle(fixture);
      }

      expect(text(fixture)).toContain('Cannot reach the backend');
      expect(element.querySelector('.banner--error')).not.toBeNull();
      const reverted = [...liveSection.querySelectorAll<HTMLButtonElement>('.open-status-btn')];
      for (const b of reverted) {
        expect(b.getAttribute('aria-pressed')).toBe('false');
        expect(b.classList.contains('open-status-btn--active')).toBe(false);
      }
    });

    it('unverified: the open/closed section shows the verify prompt and NO picker', async () => {
      setSession(true, []);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'open-status-heading')!;
      expect(section.textContent).toContain(
        'Verify your email or phone to report whether this shelter is open.',
      );
      expect(section.querySelector('a[href*="returnUrl"]')).not.toBeNull();
      expect(section.querySelector('button')).toBeNull();
    });

    it('anonymous: the open/closed section shows a plain login prompt', async () => {
      setSession(false);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'open-status-heading')!;
      expect(section.textContent).toContain('Log in to report whether this shelter is open.');
      expect(section.querySelector('button')).toBeNull();
      // Plain text only — the header login is the single entry point.
      expect(section.querySelector('a[href*="returnUrl"]')).toBeNull();
    });
  });

  describe('community pulse (report aggregation UI)', () => {
    function pulseShelter(overrides: Partial<ShelterDetailDto> = {}): ShelterDetailDto {
      return registryShelter({
        communityPulse: {
          openClosed: { openReports: 3, closedReports: 2, openShare: 0.5 },
          occupancy: { spaceReports: 0, gettingFullReports: 0, fullReports: 4, fullness: 1 },
          recentReports: [
            { kind: 'OPEN', reportedAt: new Date(Date.now() - 10 * 60000).toISOString() },
            { kind: 'FULL', reportedAt: new Date(Date.now() - 25 * 60000).toISOString() },
          ],
        },
        ...overrides,
      });
    }

    /** The arrows live in .pulse-gauges__arrows (layout pass); find one
     *  by the caption id its figure's aria-describedby references. Word
     *  match (`~=`) tolerates a future multi-id reference list; today the
     *  figure references only its own count-line id (the general estimate
     *  notice is section-level, not per-gauge). */
    function arrowGauge(element: HTMLElement, captionId: string): HTMLElement | null {
      const arrows = element.querySelector('.pulse-gauges__arrows');
      if (!arrows) return null;
      return (
        [...arrows.querySelectorAll<HTMLElement>('app-report-gauge')].find(
          (g) => g.querySelector(`figure[aria-describedby~="${captionId}"]`) !== null,
        ) ?? null
      );
    }

    /** The count lines (captions) live in the .pulse-gauges__captions
     *  column (layout pass); find one by a snippet of its text. */
    function captionByText(element: HTMLElement, countSnippet: string): HTMLElement | null {
      const captions = element.querySelector('.pulse-gauges__captions');
      if (!captions) return null;
      return (
        [...captions.querySelectorAll<HTMLElement>('.report-gauge__text')].find((c) =>
          (c.textContent ?? '').includes(countSnippet),
        ) ?? null
      );
    }

    it('an equal weighted split points the open/closed needle straight up (50/50 → 90°)', async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');

      // The arrow lives in the arrows row (layout pass) — find the
      // open/closed one by the caption id its figure points at.
      const gauge = arrowGauge(element, 'pulse-open-caption');
      expect(gauge, 'the open/closed arrow must render in the arrows row').not.toBeNull();
      const needle = gauge!.querySelector('.report-gauge__needle') as SVGElement | null;
      expect(needle).not.toBeNull();
      expect(needle!.getAttribute('transform')).toBe('rotate(90 100 100)');
      // the accessible count line (its caption, in the captions column) is
      // visible (the angle is never the only carrier)
      expect(captionByText(element, 'Reports: 3 open, 2 closed')?.textContent).toContain(
        'Reports: 3 open, 2 closed',
      );
    });

    it('all-one-way maps to the extremes: fullness 1 → 180° (the full end)', async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');

      // The arrow lives in the arrows row (layout pass).
      const gauge = arrowGauge(element, 'pulse-occupancy-caption');
      expect(gauge, 'the how-full arrow must render in the arrows row').not.toBeNull();
      const needle = gauge!.querySelector('.report-gauge__needle') as SVGElement | null;
      expect(needle).not.toBeNull();
      expect(needle!.getAttribute('transform')).toBe('rotate(180 100 100)');
      expect(captionByText(element, 'Reports: 0 space available')?.textContent).toContain(
        'Reports: 0 space available, 0 getting full, 4 full',
      );
      // the end labels frame the semicircle (not colour-only)
      expect(gauge!.textContent).toContain('Space available');
      expect(gauge!.textContent).toContain('Full');
    });

    it('both gauges moved to the bottom of the page, directly above the recent log — DOM order: gauges, then the log they summarise', async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');

      const wrap = element.querySelector('.pulse-gauges');
      expect(wrap, 'the pulse block must live in one shared container').not.toBeNull();
      const arrows = wrap!.querySelector('.pulse-gauges__arrows');
      expect(arrows, 'the arrows row must render').not.toBeNull();
      const captions = wrap!.querySelector('.pulse-gauges__captions');
      expect(captions, 'the captions column must render').not.toBeNull();
      expect(arrows!.querySelectorAll('app-report-gauge').length, 'two arrows in the row').toBe(2);
      expect(
        captions!.querySelectorAll('app-report-gauge').length,
        'two count lines in the column',
      ).toBe(2);
      // arrows first, then their count lines — a screen reader meets the
      // summary before the log below (summary → detail).
      expect(captions!.previousElementSibling, 'the captions column follows the arrows row').toBe(
        arrows,
      );
      // moved OUT of the old report sections (the pickers stay there)
      expect(
        element
          .querySelector('#occupancy-heading')
          ?.closest('section')
          ?.querySelector('app-report-gauge'),
        'the occupancy gauge is no longer in the "Report how full" section',
      ).toBeNull();
      expect(
        element
          .querySelector('#open-status-heading')
          ?.closest('section')
          ?.querySelector('app-report-gauge'),
        'the open/closed gauge is no longer in the "Report open/closed" section',
      ).toBeNull();
      // DIRECTLY above the log: the recent-reports section is the
      // container's next sibling — a screen reader meets the gauges
      // before the log they summarise (summary → detail).
      const logSection = element.querySelector('#recent-reports-heading')?.closest('section');
      expect(logSection, 'the recent log section must render').not.toBeNull();
      expect(
        logSection!.previousElementSibling,
        'the log section follows the gauges container',
      ).toBe(wrap);
    });

    it('the arrow pair is inline at wide widths — a wrapping flex row, side by side whenever both 240px gauges fit (mechanism)', () => {
      // jsdom cannot measure widths, so — the repo's mechanism-assertion
      // idiom (page-shell.spec.ts) — the stylesheet content is the
      // acceptance: the arrows sit side by side by CONSTRUCTION (a
      // wrapping row) instead of at a breakpoint the gauges could drift
      // from.
      const detailScss = readFileSync(
        `${process.cwd()}/src/app/features/shelter/shelter-detail-page.scss`,
        'utf8',
      );
      const arrows = detailScss.match(/\.pulse-gauges__arrows \{[\s\S]*?\n\}/);
      expect(arrows, 'shelter-detail-page.scss must style .pulse-gauges__arrows').not.toBeNull();
      expect(arrows![0], 'the arrow row is a flex row').toContain('display: flex');
      expect(arrows![0], 'the row wraps: one gauge per line when both do not fit').toContain(
        'flex-wrap: wrap',
      );
      expect(arrows![0], 'the base direction is a row (no column rule)').not.toMatch(
        /flex-direction:\s*column/,
      );
      const item = arrows![0].match(/app-report-gauge \{[\s\S]*?\n {2}\}/);
      expect(item, 'the gauge hosts must be capped at the gauge width').not.toBeNull();
      expect(
        item![0],
        'each gauge keeps its natural 240px size (no grow, no fixed slot)',
      ).not.toMatch(/flex:\s*1|flex-grow/);
      expect(item![0], "the host matches .report-gauge's 240px cap").toMatch(/max-width: 240px/);
      // The outer pulse block is a COLUMN: the arrows row, then the
      // captions column below it — the captions are never side by side
      // with (or under) the arrows.
      const outer = detailScss.match(/\.pulse-gauges \{[\s\S]*?\n\}/);
      expect(outer, 'shelter-detail-page.scss must style .pulse-gauges').not.toBeNull();
      expect(outer![0], 'the pulse block stacks the arrows row above the captions column').toMatch(
        /flex-direction:\s*column/,
      );
    });

    it('the count lines sit in one column below the arrows — normal flow, no overlay (structure + mechanism)', async () => {
      // The layout fix for the overlapping inline captions: the count
      // lines (the captions — each gauge's accessible text) are NOT
      // under their arrows any more. They sit in .pulse-gauges__captions,
      // a single normal-flow column BELOW the arrows row — the two lines
      // stacked one under the other, the container growing with its
      // content. The inline captions overflowed their 240px boxes (the
      // count line's nowrap tokens carried no break opportunities) and
      // painted over each other; normal flow in a column makes that
      // impossible.
      const detailScss = readFileSync(
        `${process.cwd()}/src/app/features/shelter/shelter-detail-page.scss`,
        'utf8',
      );
      // Mechanism: a column (one line per row), normal flow — the owner's
      // required arrangement: the two lines stacked, never overlaying.
      const captions = detailScss.match(/\.pulse-gauges__captions \{[\s\S]*?\n\}/);
      expect(
        captions,
        'shelter-detail-page.scss must style .pulse-gauges__captions',
      ).not.toBeNull();
      expect(captions![0], 'the captions form a column (stacked, one under the other)').toMatch(
        /flex-direction:\s*column/,
      );
      expect(
        captions![0],
        'no absolute positioning or transform on the captions (normal flow)',
      ).not.toMatch(/position:\s*(absolute|fixed|sticky)|transform/);

      // Structure: both count lines render in the column; the arrows row
      // carries NO caption (nothing left under the arrows).
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');
      const wrap = element.querySelector('.pulse-gauges');
      expect(wrap, 'the pulse block must render').not.toBeNull();
      const arrows = wrap!.querySelector('.pulse-gauges__arrows');
      const captionColumn = wrap!.querySelector('.pulse-gauges__captions');
      expect(arrows, 'the arrows row must render').not.toBeNull();
      expect(captionColumn, 'the captions column must render').not.toBeNull();
      // the column sits BELOW the arrows row (stacked, not side by side)
      expect(
        captionColumn!.previousElementSibling,
        'the captions column follows the arrows row',
      ).toBe(arrows);
      expect(
        captionColumn!.querySelectorAll('.report-gauge__text').length,
        'both count lines render in the captions column',
      ).toBe(2);
      expect(
        arrows!.querySelectorAll('.report-gauge__text').length,
        'no caption remains under an arrow',
      ).toBe(0);
      expect(
        arrows!.querySelectorAll('figcaption').length,
        'no figcaption left in the arrows row',
      ).toBe(0);
    });

    it("the counts line cannot break mid-phrase: one unbreakable token per count, a wbr between every token pair is the line's break opportunity", async () => {
      // Mechanism (report-gauge.scss): each token is one unbreakable
      // inline unit — the line may only break at the boundary BETWEEN
      // tokens (after a comma), never inside a phrase. The break
      // opportunity itself is a <wbr> between the tokens: the tokens are
      // adjacent in the markup (Angular control flow strips the loop's
      // whitespace) and each is nowrap, so without the wbr the whole
      // line would be unbreakable and overflow its box instead of
      // wrapping (the overlapping-inline-captions defect).
      const gaugeScss = readFileSync(`${process.cwd()}/src/app/shared/report-gauge.scss`, 'utf8');
      const token = gaugeScss.match(/\.report-gauge__token \{[\s\S]*?\n\}/);
      expect(token, 'report-gauge.scss must style .report-gauge__token').not.toBeNull();
      expect(token![0], 'a token must never break mid-phrase').toContain('white-space: nowrap');

      // Structure: the caption is one span per comma-separated count
      // phrase, and the tokens concatenate byte-identical to the count
      // text (the split is structural — the visible + accessible text
      // is unchanged).
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');

      const caption = captionByText(element, '0 getting full');
      expect(caption, 'the how-full caption must render in the captions column').not.toBeNull();
      const tokens = [...caption!.querySelectorAll<HTMLElement>('.report-gauge__token')];
      expect(tokens.length, 'three counts → three tokens (the label rides the first)').toBe(3);
      expect(
        tokens.map((t) => t.textContent).join(''),
        'the tokens are the count text verbatim',
      ).toBe('Reports: 0 space available, 0 getting full, 4 full');
      for (const t of tokens) {
        const text = t.textContent ?? '';
        const firstComma = text.indexOf(', ');
        // A comma (the phrase separator) may sit only at a token's VERY
        // end — never inside it (that would be a phrase boundary the
        // token crosses).
        expect(
          firstComma === -1 || firstComma === text.length - 2,
          `a token must not carry a phrase boundary inside: ${text}`,
        ).toBe(true);
      }
      // The <wbr> between every token pair is the line's break
      // opportunity (the tokens themselves stay unbreakable).
      expect(
        caption!.querySelectorAll('wbr').length,
        'a break opportunity between every pair of tokens',
      ).toBe(tokens.length - 1);
    });

    it('no page-level horizontal overflow at 360px (mechanism): the count lines wrap between their wbr opportunities in the full-width column, the arrow pair wraps, the log scrolls', () => {
      // jsdom cannot measure a 360px viewport, so the mechanisms that
      // make overflow impossible are pinned here (the repo's 360px
      // standard):
      //  1. the count lines are full-width blocks in the captions
      //     column and wrap BETWEEN their nowrap tokens (a <wbr> between
      //     every token pair — no token is wider than the 320px of
      //     content at 360px, and the line itself stays wrappable, no
      //     nowrap on it). The old inline arrangement crammed the same
      //     line into a 240px box where it was unbreakable (the nowrap
      //     tokens carried no break opportunities) and overflowed the
      //     page at 360px;
      //  2. the arrow pair wraps to one gauge per line below the fit
      //     (two 240px gauges inside 320px of content);
      //  3. the log is height-bounded + scrolling (the BE's 10-entry cap
      //     scrolls inside the box — it cannot stretch the page).
      const gaugeScss = readFileSync(`${process.cwd()}/src/app/shared/report-gauge.scss`, 'utf8');
      expect(
        gaugeScss.match(/\.report-gauge__token \{[\s\S]*?\n\}/)?.[0],
        'the count tokens must be unbreakable',
      ).toContain('white-space: nowrap');
      expect(
        gaugeScss.match(/\.report-gauge__text \{[\s\S]*?\n\}/)?.[0] ?? '',
        'the count line itself must stay wrappable (breaks BETWEEN tokens)',
      ).not.toMatch(/nowrap/);

      const detailScss = readFileSync(
        `${process.cwd()}/src/app/features/shelter/shelter-detail-page.scss`,
        'utf8',
      );
      const arrows = detailScss.match(/\.pulse-gauges__arrows \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(arrows, 'the arrow pair must wrap instead of overflowing').toContain(
        'flex-wrap: wrap',
      );
      expect(arrows, 'each gauge stays 240px wide (≤ 320px of content at 360px)').toMatch(
        /max-width: 240px/,
      );

      // The captions column: full-width normal-flow blocks, the column
      // grows with its content — the lines wrap (between their wbr
      // opportunities) instead of overflowing the page.
      const captions = detailScss.match(/\.pulse-gauges__captions \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(
        captions,
        'the captions column must exist (the lines live there, not under the arrows)',
      ).not.toEqual('');
      expect(
        captions,
        'the caption hosts are full-width blocks (the line wraps instead of overflowing)',
      ).toContain('display: block');
      expect(
        captions,
        'the captions column is normal flow (no absolute positioning, no fixed height)',
      ).not.toMatch(/position:\s*(absolute|fixed|sticky)|height:\s*\d/);

      const log = detailScss.match(/\.recent-reports \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(log, 'the log must be height-bounded').toMatch(/max-height: \d+px/);
      expect(log, 'a long log scrolls instead of stretching').toContain('overflow-y: auto');
    });

    it("the gauges' accessible count text still renders after the move (the visible text is the meaning, the angle is decoration)", async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');

      const wrap = element.querySelector('.pulse-gauges');
      expect(wrap, 'the pulse block must render').not.toBeNull();
      // the count lines (the captions) render in the captions column
      const captions = wrap!.querySelector('.pulse-gauges__captions');
      expect(captions, 'the captions column must render').not.toBeNull();
      expect(captions!.textContent).toContain('Reports: 3 open, 2 closed');
      expect(captions!.textContent).toContain('Reports: 0 space available, 0 getting full, 4 full');
      // the SVGs stay aria-hidden decoration behind the text
      const svgs = wrap!.querySelectorAll('svg');
      expect(svgs.length, 'both gauges render their semicircle').toBe(2);
      for (const svg of svgs) {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      }
      // the end labels stay visible text too (not colour-only)
      expect(wrap!.textContent).toContain('Space available');
      expect(wrap!.textContent).toContain('Full');
    });

    it("each count line is its gauge's accessible text, exposed exactly once — the arrow figure references its caption via aria-describedby, no duplicate anywhere", async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');

      const wrap = element.querySelector('.pulse-gauges');
      expect(wrap, 'the pulse block must render').not.toBeNull();

      // Association: each arrow figure points (aria-describedby) at the
      // element carrying its count line — the caption stays the gauge's
      // accessible text, now living in the captions column. The word match
      // (`~=`) tolerates a future multi-id reference list; today the figure
      // references only its own count-line id (the general estimate notice
      // is section-level, not per-gauge).
      const pairs: [string, string][] = [
        ['pulse-occupancy-caption', 'Reports: 0 space available, 0 getting full, 4 full'],
        ['pulse-open-caption', 'Reports: 3 open, 2 closed'],
      ];
      for (const [id, text] of pairs) {
        const figure = wrap!.querySelector(`figure[aria-describedby~="${id}"]`);
        expect(figure, `an arrow figure must reference #${id}`).not.toBeNull();
        const caption = wrap!.querySelector<HTMLElement>(`#${id}`);
        expect(caption, `the caption #${id} must render`).not.toBeNull();
        expect(caption!.textContent, `#${id} carries its count line`).toContain(text);
      }

      // Exactly once: each count line appears exactly once in the
      // block's rendered text — no visually-hidden duplicate, no
      // figcaption left behind announcing the numbers a second time.
      for (const [, text] of pairs) {
        const occurrences = (wrap!.textContent ?? '').split(text).length - 1;
        expect(occurrences, `"${text}" must be exposed exactly once`).toBe(1);
      }
      // No figcaption remains anywhere in the pulse block (the arrows
      // row is arrow-only).
      expect(wrap!.querySelectorAll('figcaption').length, 'no figcaption in the pulse block').toBe(
        0,
      );
    });

    it('the pulse block carries ONE general estimate notice with the window hint — no per-arrow notices, and each gauge still exposes its own counts', async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element } = await open('/shelters/1');
      const wrap = element.querySelector('.pulse-gauges');
      expect(wrap, 'the pulse block must render').not.toBeNull();

      // ONE general notice for the whole section, sitting with the window
      // hint (both are .pulse-gauges__hint at the top). It says the arrows
      // show a CALCULATED ESTIMATE, not confirmed data — a phrase true for
      // BOTH arrows (open/closed = a probability, how-full = an expected
      // level), so it must never claim "probability" (which would
      // mis-describe the how-full arrow).
      const hints = [...wrap!.querySelectorAll<HTMLElement>('.pulse-gauges__hint')].map(
        (h) => h.textContent ?? '',
      );
      expect(hints.length, 'window hint + one general notice').toBe(2);
      expect(
        hints.some((h) => h.includes('last 2 hours')),
        'the window hint is kept',
      ).toBe(true);
      const estimateNote = hints.find((h) => h.includes('calculated estimate'));
      expect(estimateNote, 'the general estimate notice renders').toBeDefined();
      expect(estimateNote).toContain('not confirmed data');
      expect(
        estimateNote,
        'the general notice never claims "probability" (the how-full arrow is a level)',
      ).not.toMatch(/probab/i);

      // The per-arrow notices are GONE — nothing renders or references the
      // deleted sentences (no stale id, no leftover text).
      expect(wrap!.querySelector('#pulse-open-note'), 'no per-arrow open notice').toBeNull();
      expect(
        wrap!.querySelector('#pulse-occupancy-note'),
        'no per-arrow how-full notice',
      ).toBeNull();
      expect(wrap!.textContent).not.toContain('probability that this shelter is open');
      expect(wrap!.textContent).not.toContain('position from empty to full');

      // Association: each arrow figure references ONLY its own count-line
      // id now (the general notice is section-level, not per-gauge). The
      // count line stays each gauge's accessible text.
      const occupancyFigure = wrap!.querySelector(
        'figure[aria-describedby="pulse-occupancy-caption"]',
      );
      const openFigure = wrap!.querySelector('figure[aria-describedby="pulse-open-caption"]');
      expect(
        occupancyFigure?.getAttribute('aria-describedby'),
        'the how-full figure references its count line only',
      ).toBe('pulse-occupancy-caption');
      expect(
        openFigure?.getAttribute('aria-describedby'),
        'the open/closed figure references its count line only',
      ).toBe('pulse-open-caption');

      // Each gauge still exposes its counts (the accessible text remains).
      expect(wrap!.querySelector<HTMLElement>('#pulse-occupancy-caption')?.textContent).toContain(
        'Reports: 0 space available, 0 getting full, 4 full',
      );
      expect(wrap!.querySelector<HTMLElement>('#pulse-open-caption')?.textContent).toContain(
        'Reports: 3 open, 2 closed',
      );
    });

    it('with nothing fresh the general notice still renders (section-level, with the window hint) — and no arrow figure dangles a reference', async () => {
      shelterGateway.rows.set(
        1,
        pulseShelter({
          communityPulse: { openClosed: null, occupancy: null, recentReports: [] },
        }),
      );
      const { element } = await open('/shelters/1');
      const wrap = element.querySelector('.pulse-gauges');
      // The section-level notices (window hint + estimate notice) render
      // even with no fresh data — they describe the section, not a gauge.
      const hints = [...wrap!.querySelectorAll<HTMLElement>('.pulse-gauges__hint')].map(
        (h) => h.textContent ?? '',
      );
      expect(hints.length, 'window hint + general notice render unconditionally').toBe(2);
      expect(
        hints.some((h) => h.includes('calculated estimate')),
        'general notice present',
      ).toBe(true);
      // But no gauges: no captions column, no arrow figure — so nothing
      // can reference an absent count-line id (no dangling reference).
      expect(wrap!.querySelector('.pulse-gauges__captions')).toBeNull();
      expect(wrap!.querySelector('figure')).toBeNull();
    });

    it('zero fresh reports render the explicit empty states — no gauge, no neutral arrow', async () => {
      shelterGateway.rows.set(
        1,
        pulseShelter({
          communityPulse: { openClosed: null, occupancy: null, recentReports: [] },
        }),
      );
      const { element, fixture } = await open('/shelters/1');

      expect(element.querySelector('.report-gauge__svg')).toBeNull();
      expect(element.querySelector('.report-gauge__needle')).toBeNull();
      expect(text(fixture)).toContain('No open/closed reports in the last 2 hours');
      expect(text(fixture)).toContain('No how-full reports in the last 2 hours');
      expect(text(fixture)).toContain('No reports yet');
    });

    it('an older BE (no communityPulse field) still renders the empty states', async () => {
      // the fixture deliberately carries NO communityPulse key — the FE
      // ships ahead of the API safely (the openStatus ?? null precedent)
      shelterGateway.rows.set(1, registryShelter());
      const { fixture } = await open('/shelters/1');

      expect(text(fixture)).toContain('No open/closed reports in the last 2 hours');
      expect(text(fixture)).toContain('No how-full reports in the last 2 hours');
      expect(text(fixture)).toContain('No reports yet');
    });

    it('the recent log renders time + the community attribution + the kind — never a reporter identity', async () => {
      shelterGateway.rows.set(1, pulseShelter());
      const { element, fixture } = await open('/shelters/1');

      const section = element.querySelector('#recent-reports-heading')?.closest('section');
      expect(section).not.toBeNull();
      const entries = section!.querySelectorAll('.recent-reports__entry');
      expect(entries.length).toBe(2);
      // time (the shared recency vocabulary) + what, anonymized
      expect(entries[0].textContent).toContain('10 min ago');
      expect(entries[0].textContent).toContain('a community member reported: Open');
      expect(entries[1].textContent).toContain('25 min ago');
      expect(entries[1].textContent).toContain('a community member reported: Full');
      // privacy: no user-shaped data anywhere in the log (no names, no ids)
      expect(section!.textContent).not.toMatch(/\buser\b/i);
      expect(text(fixture)).not.toContain('@example.ee');
    });

    // ---- the two time bases (2-hour tally vs chronological log) -----------

    it('states the 2-hour window where the counts are; the log below is a chronological log (the owner’s “0 space above older entries” puzzle)', async () => {
      // The owner’s exact puzzle, encoded: NOTHING fresh in the 2-hour
      // window (zero counts) while the log lists older reports — the page
      // must state which time base belongs to which block.
      shelterGateway.rows.set(
        1,
        pulseShelter({
          communityPulse: {
            openClosed: { openReports: 0, closedReports: 0, openShare: 0 },
            occupancy: { spaceReports: 0, gettingFullReports: 0, fullReports: 0, fullness: 0 },
            recentReports: [
              { kind: 'OPEN', reportedAt: new Date(Date.now() - 6 * 24 * 3600_000).toISOString() },
              { kind: 'FULL', reportedAt: new Date(Date.now() - 6 * 24 * 3600_000).toISOString() },
            ],
          },
        }),
      );
      const { element } = await open('/shelters/1');

      // The window line: inside the pulse block, FIRST (a screen reader
      // hears the window before the numbers it qualifies) and naming the
      // 2-hour basis of the gauges/counts; the ONE general estimate
      // notice sits right after it, and the gauges row follows both.
      const hint = element.querySelector('.pulse-gauges > .pulse-gauges__hint');
      expect(hint, 'the pulse block must state its 2-hour window').not.toBeNull();
      expect(hint!.textContent, 'the window line names the 2-hour window').toContain(
        'last 2 hours',
      );
      const notice = hint!.nextElementSibling as HTMLElement | null;
      expect(notice, 'the estimate notice sits right after the window hint').not.toBeNull();
      expect(notice!.className, 'the notice reuses the hint treatment').toContain(
        'pulse-gauges__hint',
      );
      expect(notice!.textContent, 'the notice is the estimate line').toContain(
        'calculated estimate',
      );
      expect(notice!.nextElementSibling, 'the gauges row follows the notices').toBe(
        element.querySelector('.pulse-gauges__arrows'),
      );

      // The log is the LAST 10 reports (newest first, capped server-side),
      // not the 2-hour tally: its heading says so and makes no window claim
      // of its own — the window belongs to the gauges, not the log.
      const heading = element.querySelector('#recent-reports-heading');
      expect(heading, 'the log heading must render').not.toBeNull();
      expect(
        heading!.textContent,
        'the heading presents the last 10 reports (no time-window framing)',
      ).toContain('Last 10 reports');
      expect(heading!.textContent, 'the log heading makes no window claim').not.toContain(
        '2 hours',
      );

      // …and the window-free log still lists the older entries that the
      // 2-hour counts above do not include.
      expect(
        element.querySelectorAll('.recent-reports__entry').length,
        'the log lists the older reports the gauges do not count',
      ).toBe(2);

      // The hint is muted secondary text (shelter-detail-page.scss).
      const detailScss = readFileSync(
        `${process.cwd()}/src/app/features/shelter/shelter-detail-page.scss`,
        'utf8',
      );
      const hintCss = detailScss.match(/\.pulse-gauges__hint \{[\s\S]*?\n\}/);
      expect(hintCss, 'shelter-detail-page.scss must style .pulse-gauges__hint').not.toBeNull();
      expect(hintCss![0], 'the hint is muted secondary text').toMatch(
        /color: var\(--color-muted\)/,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Info section (INFO-LAST-REPORTED): the LAST REPORTED status/capacity
  // ---------------------------------------------------------------------------

  describe('info section (last reported status + capacity rows)', () => {
    /** A fixed instant, mid-month: no viewer timezone can shift its month
     *  (the month word is the locale witness in the format assertions). */
    const REPORT_ISO = '2026-07-14T12:30:00Z';
    const iso = (minutesAgo: number): string =>
      new Date(Date.now() - minutesAgo * 60000).toISOString();

    function reportedShelter(
      recentReports: CommunityPulseRecentReport[],
      overrides: Partial<ShelterDetailDto> = {},
    ): ShelterDetailDto {
      return registryShelter({
        communityPulse: { openClosed: null, occupancy: null, recentReports },
        ...overrides,
      });
    }

    it('the Info section renders exactly the last-reported rows — Status, Capacity — and no derived "Shelter status" row (owner decision; do not re-add)', async () => {
      // The fixture carries a fresh open/closed net too, so a derived row
      // WOULD have had a value ("Reported closed") — the point is that the
      // public page does not render it. Reasoning (do not re-add): the
      // derived status consults the SAME fresh open/closed reports and
      // usually prints the same word; the one case where it would differ —
      // a lifecycle-INACTIVE row reading "Closed" — cannot be reached
      // here (the public detail read 404s INACTIVE rows). The last-
      // reported rows are strictly more informative: they carry the time.
      shelterGateway.rows.set(
        1,
        reportedShelter(
          [
            { kind: 'FULL', reportedAt: iso(5) },
            { kind: 'OPEN', reportedAt: iso(10) },
          ],
          { openStatus: { state: 'CLOSED', reportedAt: iso(5), reportCount: 2 } },
        ),
      );
      const { element } = await open('/shelters/1');
      const info = element.querySelector('#info-heading')?.closest('section');
      const labels = [...info!.querySelectorAll('dt')].map((d) => (d.textContent ?? '').trim());
      expect(labels, 'exactly the two last-reported rows, in order').toEqual([
        'Status',
        'Capacity',
      ]);
      expect(
        [...info!.querySelectorAll('dt')].some(
          (d) => (d.textContent ?? '').trim() === 'Shelter status',
        ),
        'no derived status row on the public page',
      ).toBe(false);
      // The rows themselves still render their last-reported values.
      expect(infoRowValue(element, 'Status')).toContain('Last reported as Open');
      expect(infoRowValue(element, 'Capacity')).toContain('Last reported as Full');
    });

    it('the Status row is the newest OPEN/CLOSED report — a newest-overall FULL is not a status; the Capacity row is the newest band — a newest-overall OPEN is not a capacity', async () => {
      shelterGateway.rows.set(
        1,
        reportedShelter([
          { kind: 'FULL', reportedAt: iso(5) }, // newest overall → capacity's
          { kind: 'OPEN', reportedAt: iso(10) }, // status's (beats CLOSED)
          { kind: 'SPACE', reportedAt: iso(20) },
          { kind: 'CLOSED', reportedAt: iso(45) },
        ]),
      );
      const { element } = await open('/shelters/1');
      // Status = the newest OPEN/CLOSED (OPEN at 10 min beats CLOSED at 45) —
      // NOT the newest entry overall (the FULL at 5).
      expect(infoRowValue(element, 'Status')).toContain('Last reported as Open');
      // Capacity = the newest SPACE/GETTING_FULL/FULL (FULL at 5 beats SPACE) —
      // an OPEN report never becomes the capacity.
      expect(infoRowValue(element, 'Capacity')).toContain('Last reported as Full');
    });

    it('each reported row shows the report date and time in the ACTIVE UI locale, with the machine-readable instant on <time>', async () => {
      shelterGateway.rows.set(
        1,
        reportedShelter([
          { kind: 'OPEN', reportedAt: REPORT_ISO },
          { kind: 'FULL', reportedAt: REPORT_ISO },
        ]),
      );
      const { element, fixture } = await open('/shelters/1');
      const times = [...element.querySelectorAll('section[aria-labelledby="info-heading"] time')];
      expect(times.length).toBe(2);
      // The unambiguous machine-readable instant (not only a formatted
      // string) is the report's own ISO instant.
      expect(times[0].getAttribute('datetime')).toBe(REPORT_ISO);
      expect(times[1].getAttribute('datetime')).toBe(REPORT_ISO);
      // The formatted text follows the active UI locale (en default):
      // the month word is the locale witness, the absolute year is present.
      expect(times[0].textContent).toContain('Jul');
      expect(times[0].textContent).toContain('2026');
      // A switch of the UI language re-formats the SAME instant natively
      // (the ru medium format's abbreviated month is the locale witness).
      TestBed.inject(I18nService).setLocale('ru');
      await settle(fixture);
      expect(times[0].textContent).toContain('июл.');
      expect(times[0].textContent).toContain('2026');
    });

    it('no OPEN/CLOSED report in the log: the Status row shows its empty state — never a stale or invented status', async () => {
      shelterGateway.rows.set(
        1,
        reportedShelter([
          { kind: 'FULL', reportedAt: iso(5) },
          { kind: 'SPACE', reportedAt: iso(10) },
        ]),
      );
      const { element } = await open('/shelters/1');
      expect(infoRowValue(element, 'Status')).toBe('No open/closed reports yet');
    });

    it('no band report in the log: the Capacity row shows its empty state', async () => {
      shelterGateway.rows.set(
        1,
        reportedShelter([
          { kind: 'OPEN', reportedAt: iso(5) },
          { kind: 'CLOSED', reportedAt: iso(10) },
        ]),
      );
      const { element } = await open('/shelters/1');
      expect(infoRowValue(element, 'Capacity')).toBe('No how-full reports yet');
    });

    it('an older BE (no communityPulse) shows both empty states', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element } = await open('/shelters/1');
      expect(infoRowValue(element, 'Status')).toBe('No open/closed reports yet');
      expect(infoRowValue(element, 'Capacity')).toBe('No how-full reports yet');
    });

    it('a lifecycle-INACTIVE row keeps its "Closed" lifecycle fact in its own row even when the newest report says Open', async () => {
      // NOTE: the public detail read 404s INACTIVE rows, so this fixture
      // only reaches the page through the test gateway (the admin-facing
      // displays are where the INACTIVE lifecycle fact renders publicly).
      // The last-reported rows must still show the report — the lifecycle
      // fact is not the Status row's job.
      shelterGateway.rows.set(
        1,
        reportedShelter([{ kind: 'OPEN', reportedAt: iso(5) }], { status: 'INACTIVE' }),
      );
      const { element } = await open('/shelters/1');
      const infoSection = element.querySelector('#info-heading')?.closest('section');
      if (!infoSection) throw new Error('the Info section must render');
      const labels = [...infoSection.querySelectorAll('dt')].map((d) =>
        (d.textContent ?? '').trim(),
      );
      expect(labels).toEqual(['Status', 'Capacity']);
      expect(infoRowValue(element, 'Status')).toContain('Last reported as Open');
    });
  });
});
