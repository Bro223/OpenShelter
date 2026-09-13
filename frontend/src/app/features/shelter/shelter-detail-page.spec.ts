import { Component, type DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import type {
  ShelterDetailDto,
  ShelterDto,
  ShelterReviewDto,
  VerificationLevel,
} from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { PageShell } from '../../shared/page-shell';
import { LeafletService, SHELTER_ZOOM } from '../../shared/leaflet-service';
import { ShelterDetailPage } from './shelter-detail-page';

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
  /** Trust layer (shelter-trust-and-reports) — resolves void by default. */
  report = vi.fn(async (): Promise<void> => undefined);
  reportOccupancy = vi.fn(async (): Promise<void> => undefined);
}

/** In-memory upserting review store mirroring the backend semantics. */
class FakeReviewGateway {
  rows = new Map<number, ShelterReviewDto[]>();
  private nextId = 100;

  list = vi.fn(async (shelterId: number): Promise<ShelterReviewDto[]> => {
    return this.rows.get(shelterId) ?? [];
  });
  add = vi.fn(async (shelterId: number, rating: number, comment: string | null) => {
    // The backend keeps ONE review per (shelter, user): a POST by the same
    // author upserts in place (200 update after the 201) — same id, new
    // rating/comment. Reviewer F6: the old append diverged from that.
    const existing = this.rows.get(shelterId) ?? [];
    const mine = existing.find((r) => r.authorName === 'Marek T.');
    const row: ShelterReviewDto = {
      id: mine?.id ?? this.nextId++,
      authorName: 'Marek T.',
      rating,
      comment,
      createdAt: mine?.createdAt ?? '2025-09-10T09:30:00Z',
      hidden: false,
    };
    this.rows.set(
      shelterId,
      mine ? existing.map((r) => (r.authorName === 'Marek T.' ? row : r)) : [...existing, row],
    );
    return row;
  });
  updateMine = vi.fn(async (shelterId: number, rating: number, comment: string | null) => {
    const row: ShelterReviewDto = {
      id: this.nextId++,
      authorName: 'Marek T.',
      rating,
      comment,
      createdAt: '2025-09-10T09:30:00Z',
      hidden: false,
    };
    this.rows.set(shelterId, [row]); // author has at most one review
    return row;
  });
  deleteMine = vi.fn(async (shelterId: number): Promise<void> => {
    this.rows.delete(shelterId);
  });
  /** Trust layer (shelter-trust-and-reports D2) — resolves void by default. */
  reportReview = vi.fn(async (): Promise<void> => undefined);
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
    // admin-moderation D5: the shell's nav item reads this — default false.
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
    averageRating: 4.5,
    reviewCount: 2,
    createdAt: '2025-09-01T08:00:00Z',
    description: null,
    capacity: null,
    submitterVerified: false, // registry rows have no creator (D3)
    nonexistentReports: 0,
    statusFlag: null,
    occupancy: null,
    reviewStatus: 'CONFIRMED', // registry backfill (D3)
    locationKind: 'PUBLIC',
    yourOccupancyBand: null, // the detail projection's extra field (D5)
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
    averageRating: null,
    reviewCount: 0,
    description: 'Neighbourhood basement',
    capacity: 12,
    reviewStatus: 'NEW', // D3: existing USER rows backfill NEW (amber)
    ...overrides,
  };
}

const OLD_REVIEW: ShelterReviewDto = {
  id: 11,
  authorName: 'Liis K.',
  rating: 5,
  comment: 'Deep and dry.',
  createdAt: '2025-09-01T08:00:00Z',
  hidden: false,
};

/** Navigation targets (real app routes; stubs keep the test shell small). */
@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ template: '<p>login stub</p>' })
class LoginStub {}

@Component({ template: '<p>verify stub</p>' })
class VerifyStub {}

describe('ShelterDetailPage (/shelters/:id)', () => {
  let shelterGateway: FakeShelterGateway;
  let reviewGateway: FakeReviewGateway;
  let leaflet: FakeLeafletService;
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    shelterGateway = new FakeShelterGateway();
    reviewGateway = new FakeReviewGateway();
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
        { provide: ReviewGateway, useValue: reviewGateway as unknown as ReviewGateway },
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

  function elText(el: HTMLElement | null): string {
    return el?.textContent ?? '';
  }

  function starButtons(element: HTMLElement): HTMLButtonElement[] {
    return [...element.querySelectorAll<HTMLButtonElement>('.star-btn')];
  }

  function submitReview(element: HTMLElement, stars: number, comment?: string): void {
    const form = element.querySelector('form') as HTMLFormElement;
    if (comment !== undefined) {
      const textarea = form.querySelector('#review-comment') as HTMLTextAreaElement;
      textarea.value = comment;
      textarea.dispatchEvent(new Event('input'));
    }
    starButtons(element)[stars - 1].click();
    form.requestSubmit();
  }

  describe('reading (public)', () => {
    it('renders the shelter header, rating summary and the review list', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const { element, fixture } = await open('/shelters/1');
      expect(shelterGateway.get).toHaveBeenCalledWith(1);
      expect(reviewGateway.list).toHaveBeenCalledWith(1);

      expect(text(fixture)).toContain('Tallinn Central Shelter');
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Paasteamet registry');
      expect(text(fixture)).toContain('Tornimäe 1, Tallinn');
      // Rating summary: stars + numeric + count.
      expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
        '4.5 out of 5',
      );
      expect(text(fixture)).toContain('4.5');
      expect(text(fixture)).toContain('2 reviews');
      // No reviews were seeded for this shelter — the empty state shows.
      expect(text(fixture)).toContain('No reviews yet.');
    });

    it('renders a USER row null-safely: no address, "No ratings yet", description + capacity', async () => {
      shelterGateway.rows.set(7, userShelter());
      const { element, fixture } = await open('/shelters/7');

      expect(text(fixture)).toContain('Community Cellar');
      expect(element.querySelector('.shelter-detail__address')).toBeNull(); // null address
      expect(text(fixture)).toContain('No ratings yet');
      expect(text(fixture)).not.toContain('0.0'); // never an invented zero
      expect(element.querySelector('[role="img"]')).toBeNull(); // no star strip without ratings
      expect(text(fixture)).toContain('Neighbourhood basement');
      expect(text(fixture)).toContain('Capacity: 12');
      // The trust-state label (community-review-queue): NEW -> "Newly added"
      // (replacing the old "User-submitted" provenance wording).
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Newly added');
    });

    it('a NEW community row carries the unverified warning block next to the provenance chip', async () => {
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

    it('a PRIVATE row shows the private badge and the resident-offered note (D7)', async () => {
      shelterGateway.rows.set(9, userShelter({ id: 9, locationKind: 'PRIVATE' }));
      const { element, fixture } = await open('/shelters/9');

      const badge = element.querySelector<HTMLElement>('.badge--private');
      expect(badge?.textContent?.trim()).toBe('Private location');
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

    it('header badge shows the other provenance values: MUNICIPALITY and CONFIRMED USER', async () => {
      shelterGateway.rows.set(
        2,
        registryShelter({ id: 2, name: 'Pärnu Municipal Shelter', source: 'MUNICIPALITY' }),
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
      const { element, fixture } = await open('/shelters/1');
      expect(text(fixture)).toContain('Loading shelter…');
      expect(element.querySelector('.review-list')).toBeNull();

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
      // The anonymous prompt (no form) is now about the NEW shelter — plain
      // text only (no inline login button on the page).
      expect(text(fixture)).toContain('Log in to rate this shelter.');
      expect(element.querySelector('a[href*="returnUrl"]')).toBeNull();
    });

    it('a failed REVIEWS half keeps the loaded shelter and shows the reviews error (N11)', async () => {
      shelterGateway.rows.set(1, registryShelter());
      const failure = ApiError.fromHttp(
        500,
        { timestamp: 't', status: 500, error: 'Server Error', message: 'boom', path: '/x' },
        '/api/shelters/1/reviews',
      );
      reviewGateway.list = vi.fn(async () => {
        throw failure;
      }) as never;
      const { element, fixture } = await open('/shelters/1');

      // The shelter half succeeded — it renders, no page-level error banner.
      expect(text(fixture)).toContain('Tallinn Central Shelter');
      expect(element.querySelector('.banner--error')).toBeNull();
      // The reviews half failed — its own error state, no list. 5xx uses the
      // fixed generic server-error copy (shared error-copy, N6).
      expect(element.querySelector('.detail-state--error')?.textContent).toContain(
        'Something went wrong. Please try again.',
      );
      expect(element.querySelector('.review-list')).toBeNull();
      void fixture;
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
      expect(element.querySelector('.review-list')).toBeNull();
    });
  });

  describe('my review area (auth branching)', () => {
    beforeEach(() => {
      shelterGateway.rows.set(1, registryShelter());
    });

    it('anonymous: a plain-text login prompt, no inline button, no form', async () => {
      const { element } = await open('/shelters/1');

      expect(element.querySelector('form')).toBeNull();
      expect(elText(element)).toContain('Log in to rate this shelter.');
      // The header login is the single entry point — the detail page itself
      // carries no inline login link.
      expect(element.querySelector('a[href*="returnUrl"]')).toBeNull();
    });

    it('authenticated but unverified: a verify prompt with a /verify link, no form', async () => {
      setSession(true);
      const { element } = await open('/shelters/1');

      expect(element.querySelector('form')).toBeNull();
      expect(elText(element)).toContain('Verify your email or phone to rate this shelter.');
      // N1: the verify prompt preserves the shelter as returnUrl too.
      const link = element.querySelector('a[href*="returnUrl"]') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/verify?returnUrl=%2Fshelters%2F1');
    });

    it('verified: the review form is shown (star picker + comment + save)', async () => {
      setSession(true, ['EMAIL']);
      const { element } = await open('/shelters/1');

      const form = element.querySelector('form') as HTMLFormElement;
      expect(form).not.toBeNull();
      expect(starButtons(element)).toHaveLength(5);
      expect(form.querySelector('#review-comment')).not.toBeNull();
      expect(
        (form.querySelector('button[type="submit"]') as HTMLButtonElement).textContent,
      ).toContain('Save review');
    });

    it('the authenticated variant waits for the auth boot to settle (F6)', async () => {
      // A signed-in user mid-reload: the session signals say authenticated,
      // but init() has not DECISIVELY settled (the shell's gate pattern).
      // Without the initialized() gate the section flashes the un-
      // authenticated variant (and, once authenticated flips but levels are
      // still empty, the WRONG authenticated sub-variant — the verify
      // prompt instead of the form).
      store.authenticated.set(true);
      store.levels.set(['EMAIL']);
      store.initialized.set(false);
      const { element, fixture } = await open('/shelters/1');

      expect(elText(element)).toContain('Log in to rate this shelter.');
      expect(element.querySelector('form')).toBeNull();
      expect(elText(element)).not.toContain('Verify your email or phone');

      store.initialized.set(true);
      await settle(fixture);
      expect(element.querySelector('form')).not.toBeNull();
      expect(elText(element)).not.toContain('Log in to rate this shelter.');
    });
  });

  describe('writes (verified only)', () => {
    beforeEach(() => {
      setSession(true, ['EMAIL']);
      shelterGateway.rows.set(1, registryShelter({ reviewCount: 1, averageRating: 5 }));
      reviewGateway.rows.set(1, [OLD_REVIEW]);
    });

    it('first review: POST add, appears after refetch, form switches to edit mode', async () => {
      const { element, fixture } = await open('/shelters/1');
      // Existing review list renders.
      expect(element.querySelector('.review-list')).not.toBeNull();
      expect(elText(element)).toContain('Liis K.');

      submitReview(element, 4, 'Solid spot');
      await settle(fixture);

      // The add went out with the picked rating + comment.
      expect(reviewGateway.add).toHaveBeenCalledTimes(1);
      expect(reviewGateway.add).toHaveBeenCalledWith(1, 4, 'Solid spot');
      // Refetch: shelter + reviews fetched a second time.
      expect(shelterGateway.get).toHaveBeenCalledTimes(2);
      expect(reviewGateway.list).toHaveBeenCalledTimes(2);
      // The new review is in the list; success notice shown.
      expect(text(fixture)).toContain('Marek T.');
      expect(text(fixture)).toContain('Solid spot');
      expect(text(fixture)).toContain('Your review was saved.');
      // The form is now in edit mode (delete available) seeded from my review.
      expect(elText(element)).toContain('Update your review');
      expect(element.querySelector('.btn--danger')).not.toBeNull();
    });

    it('second review: PUT /mine updates instead of duplicating', async () => {
      const { element, fixture } = await open('/shelters/1');
      submitReview(element, 4, 'First pass');
      await settle(fixture);
      expect(reviewGateway.add).toHaveBeenCalledTimes(1);
      expect(reviewGateway.updateMine).not.toHaveBeenCalled();

      submitReview(element, 2, 'Changed my mind');
      await settle(fixture);

      expect(reviewGateway.updateMine).toHaveBeenCalledTimes(1);
      expect(reviewGateway.updateMine).toHaveBeenCalledWith(1, 2, 'Changed my mind');
      expect(text(fixture)).toContain('Your review was updated.');
      // No duplicate: the fake keeps exactly one row for the author.
      const rows = await reviewGateway.list(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ rating: 2, comment: 'Changed my mind' });
    });

    it('prior-session review: POST returns 200-updated, page adopts it to edit mode', async () => {
      // Reviewer W4: the backend POST upserts — if the user already has a
      // review from a PREVIOUS session (page cannot know: no isMine in the
      // DTO), POST returns 200 with the UPDATED single row. The page must
      // treat that as an adoption (edit mode), never duplicate the row.
      const { element, fixture } = await open('/shelters/1');

      // Backend semantics: author has one review server-side; a POST by the
      // same user updates it in place (single row, changed rating).
      reviewGateway.rows.set(1, [
        {
          id: 11,
          authorName: 'Marek T.',
          rating: 2,
          comment: 'Old take',
          createdAt: '2025-09-01T08:00:00Z',
          hidden: false,
        },
      ]);
      reviewGateway.add = vi.fn(
        async (shelterId: number, rating: number, comment: string | null) => {
          const updated: ShelterReviewDto = {
            id: 11,
            authorName: 'Marek T.',
            rating,
            comment,
            createdAt: '2025-09-01T08:00:00Z',
            hidden: false,
          };
          reviewGateway.rows.set(shelterId, [updated]);
          return updated;
        },
      );

      submitReview(element, 5, 'Rethought');
      await settle(fixture);

      // The page POSTed (add), because it had no way to know the row was its own.
      expect(reviewGateway.add).toHaveBeenCalledTimes(1);
      expect(reviewGateway.add).toHaveBeenCalledWith(1, 5, 'Rethought');
      expect(reviewGateway.updateMine).not.toHaveBeenCalled();
      // Refetched list holds ONE row — the upsert never duplicated it.
      const rows = await reviewGateway.list(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ rating: 5, comment: 'Rethought' });
      // The saved review was adopted as "mine": the form is now in edit mode
      // with delete available (design 06-CONTEXT decision 2).
      expect(elText(element)).toContain('Update your review');
      expect(element.querySelector('.btn--danger')).not.toBeNull();
    });

    it('rating summary refetches after a write and reflects the new average', async () => {
      // Reviewer W4: the M5 spec says "the rating summary refetches" — assert
      // the DISPLAYED value updates, not merely that get() was called twice.
      // (This test overrides the describe's beforeEach seed: start from a
      // shelter with no reviews.)
      shelterGateway.rows.set(1, registryShelter({ reviewCount: 0, averageRating: null }));
      reviewGateway.rows.set(1, []);
      const { element, fixture } = await open('/shelters/1');
      expect(elText(element)).toContain('No ratings yet');

      // Simulate the backend aggregate changing as a side effect of the POST.
      reviewGateway.add = vi.fn(
        async (shelterId: number, rating: number, comment: string | null) => {
          const row: ShelterReviewDto = {
            id: 200,
            authorName: 'Marek T.',
            rating,
            comment,
            createdAt: '2025-09-10T09:30:00Z',
            hidden: false,
          };
          reviewGateway.rows.set(shelterId, [row]);
          shelterGateway.rows.set(
            shelterId,
            registryShelter({ reviewCount: 1, averageRating: rating }),
          );
          return row;
        },
      );

      submitReview(element, 4, 'Solid spot');
      await settle(fixture);

      // The refetched shelter carries the new aggregate — visible in the DOM.
      expect(elText(element)).toContain('4.0');
      expect(elText(element)).not.toContain('No ratings yet');
    });

    it('delete: removes the review, refetches, form returns to add mode', async () => {
      const { element, fixture } = await open('/shelters/1');
      submitReview(element, 4, 'To be deleted');
      await settle(fixture);
      expect(text(fixture)).toContain('Marek T.');

      (element.querySelector('.btn--danger') as HTMLButtonElement).click();
      await settle(fixture);

      expect(reviewGateway.deleteMine).toHaveBeenCalledTimes(1);
      expect(reviewGateway.deleteMine).toHaveBeenCalledWith(1);
      expect(text(fixture)).toContain('Your review was deleted.');
      expect(text(fixture)).not.toContain('Marek T.');
      // Back to add mode — delete button gone again.
      expect(element.querySelector('.btn--danger')).toBeNull();
      expect(elText(element)).toContain('Rate this shelter');
    });

    it('FakeReviewGateway mirrors the backend upsert: one row per (shelter, user) (F6)', async () => {
      const first = await reviewGateway.add(1, 4, 'take one');
      const second = await reviewGateway.add(1, 2, 'take two');

      // Upsert keeps the row id (in-place update, not a new row).
      expect(second.id).toBe(first.id);
      const rows = await reviewGateway.list(1);
      // Same author: exactly one row, with the new values...
      const mine = rows.filter((r) => r.authorName === 'Marek T.');
      expect(mine).toHaveLength(1);
      expect(mine[0]).toMatchObject({ rating: 2, comment: 'take two' });
      // ...and other authors' rows are untouched.
      expect(rows).toContain(OLD_REVIEW);
    });

    it('a failed post-write refetch clears the success notice (N12)', async () => {
      const { element, fixture } = await open('/shelters/1');

      submitReview(element, 4, 'Solid spot');
      await settle(fixture);
      expect(text(fixture)).toContain('Your review was saved.');

      // The second (post-write) refetch fails: the notice must not stack
      // above the error banner.
      shelterGateway.get = vi.fn(async () => {
        throw ApiError.fromNetwork();
      }) as never;
      // Trigger another write -> its refetch now fails.
      submitReview(element, 2, 'Changed my mind');
      await settle(fixture);

      expect(element.querySelector('.banner--error')?.textContent).toContain(
        'Cannot reach the backend',
      );
      expect(text(fixture)).not.toContain('Your review was updated.');
      expect(text(fixture)).not.toContain('Your review was saved.');
    });

    it('a failed save shows the error banner and keeps the form in add mode', async () => {
      const forbidden = ApiError.fromHttp(
        403,
        {
          timestamp: 't',
          status: 403,
          error: 'Forbidden',
          message: 'reviews require a verified account',
          path: '/api/shelters/1/reviews',
        },
        '/api/shelters/1/reviews',
      );
      reviewGateway.add = vi.fn(async () => {
        throw forbidden;
      }) as never;
      const { element, fixture } = await open('/shelters/1');

      submitReview(element, 4, 'Should fail');
      await settle(fixture);

      expect(element.querySelector('.banner--error')?.textContent).toContain(
        'reviews require a verified account',
      );
      // No my-review state was adopted; the form is still in add mode.
      expect(elText(element)).toContain('Rate this shelter');
      expect(element.querySelector('.btn--danger')).toBeNull();
      expect(reviewGateway.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigate actions (Google Maps walking + Apple Maps, D3)', () => {
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

      const navigate = linkByText(element, 'Navigate');
      expect(navigate).toBeDefined();
      expect(navigate?.getAttribute('href')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=59.43700,24.75400&travelmode=walking',
      );
      expect(navigate?.getAttribute('target')).toBe('_blank');
      expect(navigate?.getAttribute('rel')).toBe('noopener');

      const apple = linkByText(element, 'Open in Apple Maps');
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

    it('renders the coordinate line with tabular numerals (D6)', async () => {
      const { element } = await open('/shelters/1');

      const coords = element.querySelector('.shelter-detail__coords');
      expect(coords).not.toBeNull();
      expect(coords?.classList.contains('num-tabular')).toBe(true);
      expect(coords?.textContent?.trim()).toBe('59.43700, 24.75400');
    });

    it('a USER row (null address) still gets both links and the coordinate line', async () => {
      shelterGateway.rows.set(7, userShelter());
      const { element } = await open('/shelters/7');

      expect(linkByText(element, 'Navigate')?.getAttribute('href')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=59.43700,24.75400&travelmode=walking',
      );
      expect(linkByText(element, 'Open in Apple Maps')?.getAttribute('href')).toBe(
        'https://maps.apple.com/?daddr=59.43700,24.75400&q=Community%20Cellar',
      );
      expect(element.querySelector('.shelter-detail__coords')?.textContent).toContain(
        '59.43700, 24.75400',
      );
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

    it('a 404 after create destroys the map (the not-found branch unmounts the container) (M4)', async () => {
      // /shelters/999 is a VALID id the gateway 404s: the container is
      // mounted at view-init (map created), then the 404 flip to the
      // not-found branch unmounts it — the live map must be destroyed.
      await open('/shelters/999');

      expect(leaflet.created).toBe(1);
      expect(leaflet.destroyed).toBe(1);
    });

    it('a 404 -> valid-id re-navigation shows a working (re-created) map (M4)', async () => {
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

    it('an invalid id after a loaded page destroys the map (M4)', async () => {
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
  //   header badges (D1/D6) · shelter report (D2/D6) · per-review report
  //   (D2/D6) · "report how full" picker (D5/D6).
  // All endpoints mocked; 409 → the plain sentence-case line (D6).
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

    const LIIS_REVIEW: ShelterReviewDto = {
      id: 21,
      authorName: 'Liis K.',
      rating: 4,
      comment: 'Solid.',
      createdAt: '2025-09-02T08:00:00Z',
      hidden: false,
    };

    /** The section hosting the given heading id. */
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

    it('header: reported / status-flag / occupancy badges render beside the provenance badge', async () => {
      shelterGateway.rows.set(
        1,
        registryShelter({
          name: 'Trusty Shelter',
          nonexistentReports: 2,
          statusFlag: 'CONFIRMED_OPEN',
          occupancy: { band: 'FULL', reportCount: 2, lastReportedAt: minutesAgo(12) },
        }),
      );
      const { element } = await open('/shelters/1');

      expect(element.querySelector('.badge--reported')?.textContent?.trim()).toBe('Reported');
      expect(element.querySelector('.badge--open')?.textContent?.trim()).toBe('Confirmed open');
      expect(element.querySelector('.badge--occupancy')?.textContent?.trim()).toBe(
        'Full · 12 min ago',
      );
      // Provenance is the FIRST badge — the trust badges are appended, never replacing it.
      const badges = [...element.querySelectorAll('.shelter-detail__title-row .badge')].map((b) =>
        (b as HTMLElement).textContent?.trim(),
      );
      expect(badges).toContain('Paasteamet registry');
      expect(badges).toHaveLength(4);
    });

    it('unreported shelter: no reported/status/occupancy badges in the header', async () => {
      const { element } = await open('/shelters/1');

      expect(element.querySelector('.badge--reported')).toBeNull();
      expect(element.querySelector('.badge--closed')).toBeNull();
      expect(element.querySelector('.badge--open')).toBeNull();
      expect(element.querySelector('.badge--occupancy')).toBeNull();
    });

    // ----- shelter report (D2/D6) --------------------------------------

    it('verified: the shelter Report picker opens with the five D2 types and a free-text area for OTHER', async () => {
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
      expect(radios.map((r) => r.value)).toEqual([
        'NON_EXISTENT',
        'CLOSED',
        'OPEN_CONFIRMED',
        'WRONG_LOCATION',
        'OTHER',
      ]);
      expect(section!.textContent).toContain('It does not exist');
      expect(section!.textContent).toContain('It is closed');
      expect(section!.textContent).toContain('It is open');
      expect(section!.textContent).toContain('The location is wrong');
      expect(section!.textContent).toContain('Something else');
      // Free-text appears only once OTHER is picked (it is optional text,
      // max 500 — no other type sends a detail).
      expect(form.querySelector('#report-detail')).toBeNull();

      pickRadio(form, 'Something else');
      fixture.detectChanges(); // zoneless: flush the reportType signal update
      const detail = form.querySelector<HTMLTextAreaElement>('#report-detail');
      expect(detail).not.toBeNull();
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

    it('verified: 409 duplicate renders the server\u2019s standard message in place of the picker (D6)', async () => {
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

    it('anonymous: the report section shows a plain login prompt (D5 anonymous variant)', async () => {
      setSession(false);
      const { element } = await open('/shelters/1');

      const section = sectionOf(element, 'report-shelter-heading');
      expect(section).not.toBeNull();
      expect(section!.textContent).toContain('Log in to report this shelter.');
      expect(section!.querySelector('form')).toBeNull();
      expect(section!.querySelector('button')).toBeNull();
    });

    // ----- per-review report (D2/D6) -------------------------------------

    it("verified: other people's reviews get a per-review Report picker with the four D2 reasons", async () => {
      reviewGateway.rows.set(1, [LIIS_REVIEW]);
      const { element, fixture } = await open('/shelters/1');

      const row = [...element.querySelectorAll('.review')].find((r) =>
        (r.textContent ?? '').includes('Liis K.'),
      )!;
      const reportBtn = [...row.querySelectorAll('button')].find(
        (b) => (b.textContent ?? '').trim() === 'Report',
      );
      expect(reportBtn).not.toBeNull();
      reportBtn!.click();
      await settle(fixture);

      const form = row.querySelector('form')!;
      const radios = [...form.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
      expect(radios.map((r) => r.value)).toEqual(['FALSY_DATA', 'NOT_RELEVANT', 'SPAM', 'OTHER']);
      expect(row.textContent).toContain('False or misleading');
      expect(row.textContent).toContain('Not relevant');
      expect(row.textContent).toContain('Spam');
      expect(row.textContent).toContain('Something else');
      expect(row.textContent).not.toContain('It does not exist'); // shelter types never leak into review reasons
    });

    it('verified: submitting a review report POSTs the right body, shows the one-line success, closes the picker', async () => {
      reviewGateway.rows.set(1, [LIIS_REVIEW]);
      const { element, fixture } = await open('/shelters/1');
      const row = [...element.querySelectorAll('.review')].find((r) =>
        (r.textContent ?? '').includes('Liis K.'),
      )!;
      [...row.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      await settle(fixture);
      const form = row.querySelector('form')!;

      pickRadio(form, 'Spam');
      form.requestSubmit();
      await settle(fixture);

      expect(reviewGateway.reportReview).toHaveBeenCalledTimes(1);
      expect(reviewGateway.reportReview).toHaveBeenCalledWith(1, 21, { reason: 'SPAM' });
      // Success is the shared page banner, not a row-local line.
      expect(text(fixture)).toContain('Your report was submitted.');
      expect(row.querySelector('form')).toBeNull();
    });

    it('verified: 409 review report renders the server\u2019s standard message (D6)', async () => {
      reviewGateway.reportReview.mockRejectedValueOnce(
        ApiError.fromHttp(
          409,
          {
            timestamp: '2026-01-01T00:00:00Z',
            status: 409,
            error: 'Conflict',
            message: 'This report has already been submitted',
            path: '/api/shelters/1/reviews/21/report',
          },
          '/api/shelters/1/reviews/21/report',
        ),
      );
      reviewGateway.rows.set(1, [LIIS_REVIEW]);
      const { element, fixture } = await open('/shelters/1');
      const row = [...element.querySelectorAll('.review')].find((r) =>
        (r.textContent ?? '').includes('Liis K.'),
      )!;
      [...row.querySelectorAll('button')]
        .find((b) => (b.textContent ?? '').trim() === 'Report')!
        .click();
      await settle(fixture);
      const form = row.querySelector('form')!;
      pickRadio(form, 'Not relevant');
      form.requestSubmit();
      await settle(fixture);

      expect(reviewGateway.reportReview).toHaveBeenCalledWith(1, 21, {
        reason: 'NOT_RELEVANT',
      });
      // The picker stays open with the plain line — no dialog, no banner.
      const status = row.querySelector('.report-status');
      expect(status?.textContent?.trim()).toBe('This report has already been submitted');
    });

    it('own (hidden) review row: no Report button, only the "Hidden" mark (D6: never reportable by you)', async () => {
      reviewGateway.rows.set(1, [
        LIIS_REVIEW,
        {
          id: 12,
          authorName: 'Marek T.',
          rating: 3,
          comment: 'Okay, I guess.',
          createdAt: '2025-09-05T10:00:00Z',
          hidden: true,
        },
      ]);
      const { element } = await open('/shelters/1');

      const ownRow = [...element.querySelectorAll('.review')].find((r) =>
        (r.textContent ?? '').includes('Hidden'),
      )!;
      expect(ownRow).toBeDefined();
      // The neutral mark is present (no tooltip, no icon).
      const hiddenMark = ownRow.querySelector('.review__hidden');
      expect(hiddenMark?.textContent?.trim()).toBe('Hidden');
      // No report affordance on own rows.
      const reportBtn = [...ownRow.querySelectorAll('button')].find(
        (b) => (b.textContent ?? '').trim() === 'Report',
      );
      expect(reportBtn).toBeUndefined();
      // Other people's rows in the same list still offer Report.
      const otherRow = [...element.querySelectorAll('.review')].find((r) =>
        (r.textContent ?? '').includes('Liis K.'),
      )!;
      expect(
        [...otherRow.querySelectorAll('button')].some(
          (b) => (b.textContent ?? '').trim() === 'Report',
        ),
      ).toBe(true);
    });

    it('unverified reviews: no per-review Report buttons at all (verified-only)', async () => {
      reviewGateway.rows.set(1, [LIIS_REVIEW]);
      setSession(true, []);
      const { element } = await open('/shelters/1');

      const rows = element.querySelectorAll('.review');
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          [...row.querySelectorAll('button')].some(
            (b) => (b.textContent ?? '').trim() === 'Report',
          ),
        ).toBe(false);
      }
    });

    // ----- report how full (D5/D6) ---------------------------------------

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

    it('verified: the aggregate line shows the occupancy summary beside the picker (D6: neutral)', async () => {
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

    it('anonymous: the occupancy section shows the login prompt (D5 anonymous variant)', async () => {
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
  });
});
