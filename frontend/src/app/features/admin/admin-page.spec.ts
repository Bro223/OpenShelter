import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AdminGateway } from '../../gateways/admin-gateway';
import { AccountGateway } from '../../gateways/account-gateway';
import { AuthGateway } from '../../gateways/auth-gateway';
import { ApiError } from '../../core/api-error';
import { adminGuard } from '../../core/guards';
import { AuthStore } from '../../session/auth-store';
import type {
  AdminReviewReportDto,
  AdminShelterDto,
  AdminShelterReportDto,
  MeResponse,
  TokenResponse,
} from '../../core/models';
import { AdminPage } from './admin-page';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

const ADMIN_PROFILE: MeResponse = {
  name: 'Admin',
  email: 'admin@example.ee',
  phone: '+37250000009',
  nationalIdCode: '49901010001',
  levels: ['EMAIL'],
  isAdmin: true,
};

const REGULAR_PROFILE: MeResponse = {
  ...ADMIN_PROFILE,
  name: 'Regular',
  email: 'user@example.ee',
  isAdmin: false,
};

/** ISO instant N ms in the past — the age copy is deterministic per fixture. */
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

// ---- fixtures ----------------------------------------------------------------

const USER_ROW: AdminShelterDto = {
  id: 7,
  name: 'Kommunaali Varjend',
  address: null,
  source: 'USER',
  status: 'ACTIVE',
  rating: 4.5,
  reviewCount: 2,
  nonexistentReports: 0,
  statusFlag: null,
  occupancy: null,
  capacity: 12,
  submitter: 'Kaja K.',
};

const USER_ROW_HIDDEN: AdminShelterDto = {
  ...USER_ROW,
  id: 8,
  name: 'Peidetud Kelder',
  status: 'INACTIVE',
  rating: null,
  reviewCount: 0,
};

const REGISTRY_ROW: AdminShelterDto = {
  id: 9,
  name: 'Linna Varjend',
  address: 'Lossi 2, Tartu',
  source: 'PAASETEAMET',
  status: 'ACTIVE',
  rating: 3.0,
  reviewCount: 1,
  nonexistentReports: 2,
  statusFlag: 'REPORTED_CLOSED',
  occupancy: { band: 'FULL', reportedAt: ago(12 * 60_000), reportCount: 2 },
  capacity: 50,
  submitter: null,
};

const REPORT_ROW: AdminShelterReportDto = {
  id: 101,
  shelterId: 7,
  shelterName: 'Kommunaali Varjend',
  shelterStatus: 'ACTIVE',
  type: 'NON_EXISTENT',
  detail: null,
  reporterName: 'Toomas T.',
  reporterEmail: 'toomas@example.ee',
  createdAt: ago(3_600_000),
  dismissed: false,
};

const REPORT_ROW_INACTIVE: AdminShelterReportDto = {
  ...REPORT_ROW,
  id: 102,
  shelterId: 8,
  shelterName: 'Peidetud Kelder',
  shelterStatus: 'INACTIVE',
  type: 'OTHER',
  detail: 'The address is wrong',
  createdAt: ago(5 * 60_000),
};

const REVIEW_ROW: AdminReviewReportDto = {
  id: 201,
  shelterId: 7,
  shelterName: 'Kommunaali Varjend',
  reviewId: 301,
  reviewRating: 1,
  reviewComment: 'Tuleb kinni',
  reviewHidden: false,
  reason: 'SPAM',
  detail: null,
  reporterName: 'Toomas T.',
  reporterEmail: 'toomas@example.ee',
  createdAt: ago(3_600_000),
};

const REVIEW_ROW_HIDDEN: AdminReviewReportDto = {
  ...REVIEW_ROW,
  id: 202,
  reviewId: 302,
  reviewRating: 5,
  reviewComment: 'Parim koht',
  reviewHidden: true,
  reason: 'FALSY_DATA',
  detail: 'The shelter never existed',
};

// ---- hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics) ----

class FakeAdminGateway {
  listShelters = vi.fn();
  setShelterStatus = vi.fn();
  deleteShelter = vi.fn();
  listShelterReports = vi.fn();
  dismissShelterReport = vi.fn();
  listReviewReports = vi.fn();
  hideReview = vi.fn();
  restoreReview = vi.fn();
}

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
  myReviews = vi.fn();
}

function apiError(status: number, message: string, path: string): ApiError {
  return ApiError.fromHttp(status, { timestamp: 't', status, error: 'Error', message, path }, path);
}

@Component({ template: '<p>stub</p>' })
class Stub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('AdminPage', () => {
  let admin: FakeAdminGateway;
  let auth: FakeAuthGateway;
  let account: FakeAccountGateway;
  let store: AuthStore;
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    localStorage.clear();
    admin = new FakeAdminGateway();
    auth = new FakeAuthGateway();
    account = new FakeAccountGateway();
    admin.setShelterStatus.mockResolvedValue(undefined);
    admin.deleteShelter.mockResolvedValue(undefined);
    admin.dismissShelterReport.mockResolvedValue(undefined);
    admin.hideReview.mockResolvedValue(undefined);
    admin.restoreReview.mockResolvedValue(undefined);
    account.myReviews.mockResolvedValue([]);
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        // The REAL guard on the route (admin-moderation D2): the spec tests
        // the redirect through the actual canActivate, not a stand-in.
        provideRouter([
          { path: 'map', component: Stub },
          { path: 'shelters/:id', component: Stub },
          { path: 'admin', component: AdminPage, canActivate: [adminGuard] },
        ]),
        { provide: AdminGateway, useValue: admin as unknown as AdminGateway },
        { provide: AccountGateway, useValue: account as unknown as AccountGateway },
        { provide: AuthGateway, useValue: auth as unknown as AuthGateway },
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  async function openAdmin(profile: MeResponse = ADMIN_PROFILE) {
    account.me.mockResolvedValue(profile);
    auth.login.mockResolvedValue(PAIR);
    // Boot like the real app: init() settles FIRST (anonymous), then login —
    // an initialized store makes the guard skip its own init path.
    await store.init();
    await store.login(profile.email, 's3cret');
    await router.navigateByUrl('/admin');
    await fixture.whenStable();
    // Let the fire-and-forget tab load settle, then re-render.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const debug: DebugElement = fixture.debugElement.query(By.directive(AdminPage));
    if (!debug) {
      throw new Error('AdminPage not rendered');
    }
    return {
      page: debug.componentInstance,
      element: debug.nativeElement as HTMLElement,
      fixture,
    };
  }

  function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
    return (
      [...root.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => (b.textContent ?? '').trim() === text,
      ) ?? null
    );
  }

  function firstRow(root: HTMLElement): HTMLElement {
    const row = root.querySelector('tr.admin-row, li.admin-queue-row');
    if (!row) {
      throw new Error('no admin row rendered');
    }
    return row as HTMLElement;
  }

  // ---- guard (admin-moderation D2) ------------------------------------------

  it('redirects an anonymous visitor to the home map (the page never loads)', async () => {
    await router.navigateByUrl('/admin');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/map');
    expect(fixture.debugElement.query(By.directive(AdminPage))).toBeNull();
    expect(admin.listShelters).not.toHaveBeenCalled();
  });

  it('redirects an authenticated NON-admin to the home map too', async () => {
    account.me.mockResolvedValue(REGULAR_PROFILE);
    auth.login.mockResolvedValue(PAIR);
    await store.init();
    await store.login('user@example.ee', 's3cret');
    expect(store.isAdmin()).toBe(false);

    await router.navigateByUrl('/admin');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/map');
    expect(fixture.debugElement.query(By.directive(AdminPage))).toBeNull();
  });

  // ---- shelters tab ------------------------------------------------------------

  it('renders for an admin and loads the shelters table with all columns', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW, REGISTRY_ROW]);
    const { element } = await openAdmin();

    // Default call: no filters (the bare /admin/shelters).
    expect(admin.listShelters).toHaveBeenCalledWith(undefined);
    expect(element.textContent).toContain('Kommunaali Varjend');
    expect(element.textContent).toContain('Linna Varjend');
    expect(element.textContent).toContain('Lossi 2, Tartu');
    expect(element.textContent).toContain('Paasteamet registry');
    expect(element.textContent).toContain('★ 4.5 · 2 reviews');
    expect(element.textContent).toContain('Kaja K.');
    // Occupancy: firm band + recency (the shared copy, reportedAt mapped).
    expect(element.textContent).toContain('Full · 12 min ago');
    // The statusFlag flag badge, same vocabulary as the public UI.
    expect(element.textContent).toContain('Reported closed');
  });

  it('a hidden USER row renders dimmed with the Hidden badge and offers Activate, not Hide', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW_HIDDEN]);
    const { element } = await openAdmin();

    const row = firstRow(element);
    expect(row.classList).toContain('admin-row--hidden');
    expect(row.textContent).toContain('Hidden');
    expect(buttonByText(row, 'Activate')).not.toBeNull();
    expect(buttonByText(row, 'Hide')).toBeNull();
  });

  it('Hide posts INACTIVE and updates the row in place (204 — no refetch)', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Hide')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.setShelterStatus).toHaveBeenCalledTimes(1);
    expect(admin.setShelterStatus).toHaveBeenCalledWith(7, 'INACTIVE');
    const row = firstRow(element);
    expect(row.textContent).toContain('Hidden');
    expect(row.classList).toContain('admin-row--hidden');
    expect(buttonByText(row, 'Activate')).not.toBeNull();
    expect(element.textContent).toContain('Shelter hidden.');
    expect(admin.listShelters).toHaveBeenCalledTimes(1); // still the original load
  });

  it('Activate posts ACTIVE and clears the hidden state', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW_HIDDEN]);
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Activate')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.setShelterStatus).toHaveBeenCalledWith(8, 'ACTIVE');
    const row = firstRow(element);
    expect(row.textContent).not.toContain('Hidden');
    expect(buttonByText(row, 'Hide')).not.toBeNull();
    expect(element.textContent).toContain('Shelter restored.');
  });

  it('Delete is a two-tap confirm: arming shows the strip, Confirm deletes the row', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Delete')!.click();
    fixture.detectChanges();

    // Step 1 armed — nothing was called yet.
    expect(admin.deleteShelter).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Delete this shelter permanently?');

    buttonByText(element, 'Confirm delete')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.deleteShelter).toHaveBeenCalledTimes(1);
    expect(admin.deleteShelter).toHaveBeenCalledWith(7);
    expect(element.querySelectorAll('tr.admin-row').length).toBe(0);
    expect(element.textContent).toContain('Shelter deleted.');
  });

  it('the delete confirm Cancel keeps the row and calls nothing', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Delete')!.click();
    fixture.detectChanges();
    buttonByText(element, 'Cancel')!.click();
    fixture.detectChanges();

    expect(admin.deleteShelter).not.toHaveBeenCalled();
    expect(element.querySelectorAll('tr.admin-row').length).toBe(1);
    expect(element.textContent).not.toContain('Delete this shelter permanently?');
  });

  it('registry rows are read-only: the muted registry hint, zero action buttons', async () => {
    admin.listShelters.mockResolvedValue([REGISTRY_ROW]);
    const { element } = await openAdmin();

    const row = firstRow(element);
    expect(row.textContent).toContain('registry');
    expect(row.textContent).toContain('read-only');
    expect(row.querySelectorAll('button').length).toBe(0);
  });

  it('submitting the search box re-queries with the q filter (server-side substring)', async () => {
    admin.listShelters.mockResolvedValue([]);
    const { page, element } = await openAdmin();
    expect(admin.listShelters).toHaveBeenLastCalledWith(undefined);

    page.searchQuery.setValue('  kelder  ');
    const form = element.querySelector('form.admin-search') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(admin.listShelters).toHaveBeenLastCalledWith({ q: 'kelder' }); // trimmed
  });

  it('a 409 from the status endpoint surfaces the server message; the row is unchanged', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.setShelterStatus.mockRejectedValue(
      apiError(409, 'registry rows are import-owned', '/admin/shelters/7/status'),
    );
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Hide')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('registry rows are import-owned');
    expect(firstRow(element).textContent).not.toContain('Hidden');
  });

  it('a failed load shows the error state with a Retry that re-queries', async () => {
    admin.listShelters.mockRejectedValue(ApiError.fromNetwork());
    const { element, fixture } = await openAdmin();

    expect(element.textContent).toContain('Cannot reach the backend');
    expect(element.querySelector('tr.admin-row')).toBeNull();

    admin.listShelters.mockResolvedValue([USER_ROW]);
    buttonByText(element, 'Retry')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(element.querySelectorAll('tr.admin-row').length).toBe(1);
  });

  // ---- shelter-report tab ------------------------------------------------------

  it('switching to the reports tab loads the queue lazily; rows carry shelter link, type, reporter, age', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listShelterReports.mockResolvedValue([REPORT_ROW]);
    const { element, fixture } = await openAdmin();

    expect(admin.listShelterReports).not.toHaveBeenCalled(); // lazy — shelters tab only
    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.listShelterReports).toHaveBeenCalledTimes(1);
    expect(admin.listShelterReports).toHaveBeenCalledWith();
    expect(element.querySelector('a[href="/shelters/7"]')).not.toBeNull();
    expect(element.textContent).toContain('Does not exist');
    expect(element.textContent).toContain('Toomas T. <toomas@example.ee>');
    expect(element.textContent).toContain('1 h ago');
  });

  it('Dismiss posts the report id; the row stays in the queue, dimmed with the Dismissed badge', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listShelterReports.mockResolvedValue([REPORT_ROW]);
    const { element, fixture } = await openAdmin();
    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    buttonByText(firstRow(element), 'Dismiss')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.dismissShelterReport).toHaveBeenCalledTimes(1);
    expect(admin.dismissShelterReport).toHaveBeenCalledWith(101);
    const row = firstRow(element);
    expect(row.classList).toContain('admin-row--dismissed');
    expect(row.textContent).toContain('Dismissed');
    expect(buttonByText(row, 'Dismiss')).toBeNull(); // idempotent — no second tap offered
    expect(element.textContent).toContain('Report dismissed.');
  });

  it('a report row whose shelter is INACTIVE gets the restore-shelter shortcut', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listShelterReports.mockResolvedValue([REPORT_ROW_INACTIVE]);
    const { element, fixture } = await openAdmin();
    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(buttonByText(firstRow(element), 'Restore shelter')).not.toBeNull();
    buttonByText(firstRow(element), 'Restore shelter')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    // The manual-restore endpoint, keyed by SHELTER id…
    expect(admin.setShelterStatus).toHaveBeenCalledTimes(1);
    expect(admin.setShelterStatus).toHaveBeenCalledWith(8, 'ACTIVE');
    // …and the row's live status updates in place (the shortcut is gone).
    const row = firstRow(element);
    expect(buttonByText(row, 'Restore shelter')).toBeNull();
    expect(element.textContent).toContain('Shelter restored.');
  });

  // ---- review-report tab ---------------------------------------------------------

  it('switching to the review tab loads the queue; Hide posts the REVIEW id, not the row id', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listReviewReports.mockResolvedValue([REVIEW_ROW]);
    const { element, fixture } = await openAdmin();

    expect(admin.listReviewReports).not.toHaveBeenCalled();
    buttonByText(element, 'Review reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.listReviewReports).toHaveBeenCalledTimes(1);
    // Excerpt: the comment is visible; reason label + reporter + age.
    expect(element.textContent).toContain('Tuleb kinni');
    expect(element.textContent).toContain('Spam');
    expect(element.textContent).toContain('Toomas T. <toomas@example.ee>');

    buttonByText(firstRow(element), 'Hide')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.hideReview).toHaveBeenCalledTimes(1);
    expect(admin.hideReview).toHaveBeenCalledWith(301); // reviewId — NOT 201
    const row = firstRow(element);
    expect(row.textContent).toContain('Hidden');
    expect(buttonByText(row, 'Restore')).not.toBeNull();
    expect(buttonByText(row, 'Hide')).toBeNull();
  });

  it('a hidden review renders the Hidden badge and a Restore that posts /restore', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listReviewReports.mockResolvedValue([REVIEW_ROW_HIDDEN]);
    const { element, fixture } = await openAdmin();
    buttonByText(element, 'Review reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const row = firstRow(element);
    expect(row.textContent).toContain('Hidden');
    expect(row.textContent).toContain('Falsy data');
    expect(row.textContent).toContain('The shelter never existed');
    expect(buttonByText(row, 'Restore')).not.toBeNull();
    expect(buttonByText(row, 'Hide')).toBeNull();

    buttonByText(row, 'Restore')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.restoreReview).toHaveBeenCalledTimes(1);
    expect(admin.restoreReview).toHaveBeenCalledWith(302); // reviewId
    expect(firstRow(element).textContent).not.toContain('Hidden');
    expect(buttonByText(firstRow(element), 'Hide')).not.toBeNull();
    expect(element.textContent).toContain('Review restored.');
  });

  it('a rejected review hide (403) surfaces the server message and leaves the row untouched', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listReviewReports.mockResolvedValue([REVIEW_ROW]);
    admin.hideReview.mockRejectedValue(
      apiError(403, 'admin access required', '/admin/reviews/301/hide'),
    );
    const { element, fixture } = await openAdmin();
    buttonByText(element, 'Review reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    buttonByText(firstRow(element), 'Hide')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('admin access required');
    expect(firstRow(element).textContent).not.toContain('Hidden');
  });

  // ---- empty states ---------------------------------------------------------------

  it('shows a plain empty state per tab when the queues are empty', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listShelterReports.mockResolvedValue([]);
    admin.listReviewReports.mockResolvedValue([]);
    const { element, fixture } = await openAdmin();

    expect(element.textContent).toContain('No shelters.');
    expect(element.textContent).not.toContain('No reports.');

    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No reports.');

    buttonByText(element, 'Review reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No review reports.');
  });
});
