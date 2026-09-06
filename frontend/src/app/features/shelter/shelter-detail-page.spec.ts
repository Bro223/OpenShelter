import { Component, type DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../core/auth-store';
import type { ShelterDto, ShelterReviewDto, VerificationLevel } from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { PageShell } from '../../shared/page-shell';
import { ShelterDetailPage } from './shelter-detail-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  rows = new Map<number, ShelterDto>();
  get = vi.fn(async (id: number): Promise<ShelterDto> => {
    const row = this.rows.get(id);
    if (row === undefined) {
      throw ApiError.fromHttp(
        404,
        { timestamp: 't', status: 404, error: 'Not Found', message: 'Shelter not found', path: `x` },
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
    const row: ShelterReviewDto = {
      id: this.nextId++,
      authorName: 'Marek T.',
      rating,
      comment,
      createdAt: '2025-09-10T09:30:00Z',
    };
    const existing = this.rows.get(shelterId) ?? [];
    this.rows.set(shelterId, [...existing, row]);
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

/** AuthStore-shaped fake — real signals so zoneless CD stays reactive. */
function fakeAuthStore(
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
    addLevel: (level: VerificationLevel) =>
      level !== 'SMART_ID' && !levels().includes(level) ? levels.update((l) => [...l, level]) : undefined,
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
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    shelterGateway = new FakeShelterGateway();
    reviewGateway = new FakeReviewGateway();
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
      ],
    });
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
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture, router };
  }

  async function settle(fixture: ReturnType<typeof TestBed.createComponent<PageShell>>): Promise<void> {
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
      expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('4.5 out of 5');
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
      expect((form.querySelector('button[type="submit"]') as HTMLButtonElement).textContent).toContain(
        'Save review',
      );
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
        { id: 11, authorName: 'Marek T.', rating: 2, comment: 'Old take', createdAt: '2025-09-01T08:00:00Z' },
      ]);
      reviewGateway.add = vi.fn(async (shelterId: number, rating: number, comment: string | null) => {
        const updated: ShelterReviewDto = {
          id: 11,
          authorName: 'Marek T.',
          rating,
          comment,
          createdAt: '2025-09-01T08:00:00Z',
        };
        reviewGateway.rows.set(shelterId, [updated]);
        return updated;
      });

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
      reviewGateway.add = vi.fn(async (shelterId: number, rating: number, comment: string | null) => {
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
      });

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
});
