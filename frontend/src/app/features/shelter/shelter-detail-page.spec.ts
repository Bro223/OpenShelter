import { Component, type DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import type { ShelterDto, ShelterReviewDto, VerificationLevel } from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { PageShell } from '../../shared/page-shell';
import { LeafletService, SHELTER_ZOOM } from '../../shared/leaflet-service';
import { ShelterDetailPage } from './shelter-detail-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  rows = new Map<number, ShelterDto>();
  get = vi.fn(async (id: number): Promise<ShelterDto> => {
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
    };
    this.rows.set(shelterId, [row]); // author has at most one review
    return row;
  });
  deleteMine = vi.fn(async (shelterId: number): Promise<void> => {
    this.rows.delete(shelterId);
  });
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
  overrides: { authenticated?: boolean; levels?: VerificationLevel[] } = {},
): AuthStore {
  const authenticated = signal(overrides.authenticated ?? false);
  const levels = signal<VerificationLevel[]>(overrides.levels ?? []);
  return {
    authenticated,
    initialized: signal(true),
    levels,
    init: vi.fn(async () => undefined),
    isVerified: () => levels().includes('EMAIL') || levels().includes('PHONE'),
  } as unknown as AuthStore;
}

function registryShelter(overrides: Partial<ShelterDto> = {}): ShelterDto {
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
    ...overrides,
  };
}

function userShelter(overrides: Partial<ShelterDto> = {}): ShelterDto {
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
    ...overrides,
  };
}

const OLD_REVIEW: ShelterReviewDto = {
  id: 11,
  authorName: 'Liis K.',
  rating: 5,
  comment: 'Deep and dry.',
  createdAt: '2025-09-01T08:00:00Z',
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
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('Registry');
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
      expect(element.querySelector('.badge')?.textContent?.trim()).toBe('User-submitted');
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
      // The anonymous prompt (no form) is now about the NEW shelter: its
      // returnUrl must point at /shelters/7, not the previous id.
      expect(text(fixture)).toContain('Log in to rate this shelter.');
      const link = element.querySelector('a[href*="returnUrl"]') as HTMLAnchorElement;
      expect(link?.getAttribute('href')).toBe('/login?returnUrl=%2Fshelters%2F7');
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

    it('anonymous: a login prompt preserving the shelter as returnUrl, no form', async () => {
      const { element } = await open('/shelters/1');

      expect(element.querySelector('form')).toBeNull();
      expect(elText(element)).toContain('Log in to rate this shelter.');
      const link = element.querySelector('a[href*="returnUrl"]') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/login?returnUrl=%2Fshelters%2F1');
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
});
