import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterOutlet } from '@angular/router';
import { ApiError } from '../../core/api-error';
import type { MyReviewDto, ShelterDto, ShelterReviewDto } from '../../core/models';
import { AccountGateway } from '../../gateways/account-gateway';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { ContributionsPanel } from './contributions-panel';

const SHELTER_ROW: ShelterDto = {
  id: 7,
  address: null,
  name: 'Community Cellar',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'USER',
  averageRating: 4.5,
  reviewCount: 2,
  createdAt: '2025-09-01T08:00:00Z',
  description: 'Neighbourhood basement',
  capacity: 12,
};

const REVIEW_ROW: MyReviewDto = {
  shelterId: 7,
  shelterName: 'Community Cellar',
  rating: 4,
  comment: 'Hea varjend',
  createdAt: '2025-09-02T09:00:00Z',
  updatedAt: '2025-09-03T10:00:00Z',
};

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  list = vi.fn();
  get = vi.fn();
  create = vi.fn();
  mine = vi.fn();
  update = vi.fn();
  remove = vi.fn();
  constructor() {
    this.mine.mockResolvedValue([]);
  }
}

class FakeReviewGateway {
  list = vi.fn();
  add = vi.fn();
  updateMine = vi.fn();
  deleteMine = vi.fn();
}

class FakeAccountGateway {
  me = vi.fn();
  updateProfile = vi.fn();
  requestEmailChange = vi.fn();
  confirmEmailChange = vi.fn();
  requestPhoneChange = vi.fn();
  confirmPhoneChange = vi.fn();
  myReviews = vi.fn();
  constructor() {
    this.myReviews.mockResolvedValue([]);
  }
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

/** One macrotask tick — lets the fire-and-forget gateway loads settle. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('ContributionsPanel', () => {
  let shelters: FakeShelterGateway;
  let reviews: FakeReviewGateway;
  let account: FakeAccountGateway;

  async function open(): Promise<{
    page: ContributionsPanel;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<ContributionsPanel>>;
  }> {
    const fixture = TestBed.createComponent(ContributionsPanel);
    fixture.detectChanges(); // ngOnInit -> both loads start
    await flush();
    fixture.detectChanges();
    return {
      page: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
      fixture,
    };
  }

  function buttonByText(element: HTMLElement, label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      (b.textContent ?? '').includes(label),
    );
  }

  beforeEach(() => {
    shelters = new FakeShelterGateway();
    reviews = new FakeReviewGateway();
    account = new FakeAccountGateway();
    TestBed.configureTestingModule({
      imports: [ContributionsPanel, RouterOutlet],
      providers: [
        provideRouter([]),
        { provide: ShelterGateway, useValue: shelters as unknown as ShelterGateway },
        { provide: ReviewGateway, useValue: reviews as unknown as ReviewGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
      ],
    });
  });

  // ---- loading / empty / error states ---------------------------------------

  it('loads both lists in parallel and renders the rows', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    account.myReviews.mockResolvedValue([REVIEW_ROW]);
    const { element } = await open();

    // shelter row: name + shared rating summary (W24)
    expect(element.textContent).toContain('Community Cellar');
    expect(element.textContent).toContain('★ 4.5 · 2 reviews');
    // review row: shelter link + comment
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));
    expect(links.some((a) => a.getAttribute('href') === '/shelters/7')).toBe(true);
    expect(element.textContent).toContain('Hea varjend');
  });

  it('shows the empty shelter state with a /submit link and the plain empty review state', async () => {
    const { element } = await open();

    expect(element.textContent).toContain("You haven't submitted any shelters yet.");
    expect(element.querySelector('a[href="/submit"]')).not.toBeNull();
    expect(element.textContent).toContain("You haven't written any reviews yet.");
  });

  it('a failed shelter load shows the error state and Retry re-fetches', async () => {
    const failure = ApiError.fromNetwork();
    shelters.mine.mockRejectedValue(failure);
    const { element, fixture } = await open();

    expect(element.querySelector('a[href="/submit"]')).toBeNull();
    expect(element.textContent).toContain('Cannot reach the backend');
    expect(buttonByText(element, 'Retry')).not.toBeNull();

    // the backend is back — Retry fetches and the row renders
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    fixture.debugElement.componentInstance.loadShelters();
    await flush();
    fixture.detectChanges();

    expect(element.textContent).toContain('Community Cellar');
  });

  it('a failed review load shows the error state and Retry re-fetches', async () => {
    account.myReviews.mockRejectedValue(ApiError.fromNetwork());
    const { element, fixture } = await open();

    expect(element.textContent).toContain("You haven't submitted any shelters yet."); // shelters still fine
    const reviewSection = element.querySelectorAll('h3')[1];
    expect(reviewSection?.nextElementSibling?.textContent).toContain('Cannot reach the backend');

    account.myReviews.mockResolvedValue([REVIEW_ROW]);
    fixture.debugElement.componentInstance.loadReviews();
    await flush();
    fixture.detectChanges();

    expect(element.textContent).toContain('Hea varjend');
  });

  // ---- shelter rows: edit ----------------------------------------------------

  it('Edit pre-fills the inline form from the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    fixture.detectChanges();

    expect(page.editName.value).toBe('Community Cellar');
    expect(page.editDescription.value).toBe('Neighbourhood basement');
    expect(page.editCapacity.value).toBe(12);
    expect(page.editLatitude.value).toBe(59.437);
    expect(page.editLongitude.value).toBe(24.754);
    expect(element.querySelector('#contrib-name')).not.toBeNull();
  });

  it('saving a valid shelter edit calls the gateway and updates the row in place', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const updated: ShelterDto = { ...SHELTER_ROW, name: 'Renamed Cellar', capacity: 20 };
    shelters.update.mockResolvedValue(updated);
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    page.editName.setValue('Renamed Cellar');
    page.editCapacity.setValue(20);

    await page.saveShelterEdit();
    fixture.detectChanges();

    expect(shelters.update).toHaveBeenCalledTimes(1);
    expect(shelters.update).toHaveBeenCalledWith(7, {
      name: 'Renamed Cellar',
      latitude: 59.437,
      longitude: 24.754,
      description: 'Neighbourhood basement',
      capacity: 20,
    });
    // the row moved in place (no refetch: mine was only called once)
    expect(shelters.mine).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Renamed Cellar');
    expect(element.querySelector('#contrib-name')).toBeNull(); // form closed
  });

  it('does not save an invalid shelter edit and shows the field errors', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    page.editName.setValue('   '); // whitespace-only fails the @NotBlank mirror
    await page.saveShelterEdit();
    fixture.detectChanges();

    expect(shelters.update).not.toHaveBeenCalled();
    expect(element.textContent).toContain('A name (up to 200 characters) is required.');
    expect(element.querySelector('#contrib-name')).not.toBeNull(); // still open
  });

  it('a rejected shelter edit (403) shows a row error and keeps the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    shelters.update.mockRejectedValue(
      apiError(403, 'only the author may modify this shelter', '/api/shelters/7'),
    );
    const { page, element, fixture } = await open();

    page.startEditShelter(SHELTER_ROW);
    page.editName.setValue('Varastatud');
    await page.saveShelterEdit();
    fixture.detectChanges();

    expect(element.textContent).toContain('only the author may modify this shelter');
    // row unchanged and still present, form still open
    expect(element.textContent).toContain('Community Cellar');
    expect(element.querySelector('#contrib-name')).not.toBeNull();
  });

  // ---- shelter rows: two-step delete ----------------------------------------

  it('shelter delete requires the second step, then removes the row (and its review row)', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    account.myReviews.mockResolvedValue([REVIEW_ROW]);
    shelters.remove.mockResolvedValue(undefined);
    const { page, element, fixture } = await open();

    page.requestDeleteShelter(7);
    fixture.detectChanges();

    // step 1: the confirm strip is armed, nothing deleted yet
    expect(element.textContent).toContain('Its reviews will be removed as well');
    expect(shelters.remove).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Community Cellar');

    page.confirmDeleteShelter(7);
    await flush();
    fixture.detectChanges();

    expect(shelters.remove).toHaveBeenCalledTimes(1);
    expect(shelters.remove).toHaveBeenCalledWith(7);
    // the shelter row is gone...
    expect(element.textContent).toContain("You haven't submitted any shelters yet.");
    // ...and the cascaded review row came with it (DB ON DELETE CASCADE mirrored)
    expect(element.textContent).not.toContain('Hea varjend');
  });

  it('cancel between the two steps deletes nothing', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    const { page, element, fixture } = await open();

    page.requestDeleteShelter(7);
    fixture.detectChanges();
    page.cancelDeleteShelter();
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Confirm delete');
    expect(shelters.remove).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Community Cellar');
  });

  it('a rejected shelter delete (403) shows a row error and keeps the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    shelters.remove.mockRejectedValue(
      apiError(403, 'only the author may modify this shelter', '/api/shelters/7'),
    );
    const { page, element, fixture } = await open();

    page.requestDeleteShelter(7);
    page.confirmDeleteShelter(7);
    await flush();
    fixture.detectChanges();

    expect(element.textContent).toContain('only the author may modify this shelter');
    expect(element.textContent).toContain('Community Cellar'); // row unchanged
    // the confirm strip reset — the user can retry
    expect(buttonByText(element, 'Delete')).not.toBeNull();
  });

  // ---- review rows: edit + delete -------------------------------------------

  it('review edit pre-fills rating + comment and saving updates the row via updateMine', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    account.myReviews.mockResolvedValue([REVIEW_ROW]);
    const updatedReview: ShelterReviewDto = {
      id: 1,
      authorName: 'Mari',
      rating: 5,
      comment: 'Uus kommentaar',
      createdAt: '2025-09-02T09:00:00Z',
    };
    reviews.updateMine.mockResolvedValue(updatedReview);
    const { page, element, fixture } = await open();

    page.startEditReview(REVIEW_ROW);
    fixture.detectChanges();

    expect(page.editRating()).toBe(4); // pre-filled from the row
    expect(page.editComment.value).toBe('Hea varjend');
    expect(element.querySelector('#contrib-review-comment')).not.toBeNull();

    page.editRating.set(5);
    page.editComment.setValue('Uus kommentaar');
    await page.saveReviewEdit();
    fixture.detectChanges();

    expect(reviews.updateMine).toHaveBeenCalledTimes(1);
    expect(reviews.updateMine).toHaveBeenCalledWith(7, 5, 'Uus kommentaar');
    // row updated in place (no refetch: myReviews called once)
    expect(account.myReviews).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Uus kommentaar');
    expect(element.querySelector('#contrib-review-comment')).toBeNull(); // form closed
  });

  it('review delete requires the second step, then removes the row', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    account.myReviews.mockResolvedValue([REVIEW_ROW]);
    reviews.deleteMine.mockResolvedValue(undefined);
    const { page, element, fixture } = await open();

    page.requestDeleteReview(7);
    fixture.detectChanges();

    expect(element.textContent).toContain('Delete your review of this shelter?');
    expect(reviews.deleteMine).not.toHaveBeenCalled();

    page.confirmDeleteReview(7);
    await flush();
    fixture.detectChanges();

    expect(reviews.deleteMine).toHaveBeenCalledTimes(1);
    expect(reviews.deleteMine).toHaveBeenCalledWith(7);
    expect(element.textContent).toContain("You haven't written any reviews yet.");
    // the shelter row itself is untouched
    expect(element.textContent).toContain('Community Cellar');
  });

  it('a rejected review delete (403) keeps the row and shows a row error', async () => {
    shelters.mine.mockResolvedValue([SHELTER_ROW]);
    account.myReviews.mockResolvedValue([REVIEW_ROW]);
    reviews.deleteMine.mockRejectedValue(
      apiError(403, 'only the author may delete this review', '/api/shelters/7/reviews/mine'),
    );
    const { page, element, fixture } = await open();

    page.requestDeleteReview(7);
    page.confirmDeleteReview(7);
    await flush();
    fixture.detectChanges();

    expect(element.textContent).toContain('only the author may delete this review');
    expect(element.textContent).toContain('Hea varjend'); // row unchanged
  });
});
