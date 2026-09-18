import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { AdminGateway } from '../../gateways/admin-gateway';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { AccountGateway } from '../../gateways/account-gateway';
import { AuthGateway } from '../../gateways/auth-gateway';
import { ApiError } from '../../core/api-error';
import { adminGuard } from '../../core/guards';
import { AuthStore } from '../../session/auth-store';
import type {
  AdminGuidancePostDto,
  AdminShelterDto,
  AdminShelterHistoryEvent,
  AdminShelterReportDto,
  GuidancePostDto,
  MediaAssetDto,
  MeResponse,
  TokenResponse,
} from '../../core/models';
import { AdminPage } from './admin-page';

const PAIR: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

const ADMIN_PROFILE: MeResponse = {
  name: 'Admin',
  email: 'admin@example.ee',
  phone: '+37250000009',
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
  nonexistentReports: 0,
  occupancy: null,
  capacity: 12,
  submitter: 'Kaja K.',
  reviewStatus: 'NEW',
  reviewNote: null,
  locationKind: 'PUBLIC',
  infoRequest: null, // no moderator question on this row
  inaccurate: false, // no mark on this row
};

const USER_ROW_HIDDEN: AdminShelterDto = {
  ...USER_ROW,
  id: 8,
  name: 'Peidetud Kelder',
  status: 'INACTIVE',
  reviewStatus: 'CONFIRMED', // confirmed rows never appear in the queue
};

const REGISTRY_ROW: AdminShelterDto = {
  id: 9,
  name: 'Linna Varjend',
  address: 'Lossi 2, Tartu',
  source: 'PAASETEAMET',
  status: 'ACTIVE',
  nonexistentReports: 2,
  occupancy: { band: 'FULL', reportedAt: ago(12 * 60_000), reportCount: 2 },
  capacity: 50,
  submitter: null,
  reviewStatus: 'CONFIRMED', // registry backfill (D3)
  reviewNote: null,
  locationKind: 'PUBLIC',
  infoRequest: null, // no moderator question
  inaccurate: false, // no mark on this row
};

/** A second NEW community row with a higher (newer) id — the queue
 *  ordering (the admin list is id-ordered; auto-increment id = creation order). */
const USER_ROW_NEWER: AdminShelterDto = {
  ...USER_ROW,
  id: 10,
  name: 'Uus Kelder',
  submitter: 'Maret M.',
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
  damped: false,
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

/** The edit-history fixture: ascending, snapshot-named, the
 *  EDITED row's changes parsed server-side (capacity first set: from null). */
const HISTORY_EVENTS: AdminShelterHistoryEvent[] = [
  {
    id: 1,
    shelterName: 'Kommunaali Varjend',
    actorName: 'Kaja K.',
    action: 'CREATED',
    changes: [],
    createdAt: ago(2 * 3_600_000),
  },
  {
    id: 2,
    shelterName: 'Kommunaali Varjend',
    actorName: 'Kaja K.',
    action: 'EDITED',
    changes: [
      { field: 'name', from: 'Vananimi', to: 'Kommunaali Varjend' },
      { field: 'capacity', from: null, to: '12' },
    ],
    createdAt: ago(3_600_000),
  },
];

// guidance + media fixtures (crisis-guidance D8) ----------------------------

const GUIDANCE_DRAFT: AdminGuidancePostDto = {
  id: 12,
  slug: 'uus-juhis',
  title: 'Uus juhis (mustand)',
  bodyHtml: '<p>Keha</p>',
  locale: 'et',
  status: 'DRAFT',
  pinned: false,
  heroImageId: null,
  heroImageUrl: null,
  heroImageAlt: null,
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
};

const GUIDANCE_PUBLISHED: AdminGuidancePostDto = {
  id: 11,
  slug: 'varjumine-droonirunnaku-ajal',
  title: 'Varjumine droonirünnaku ajal',
  bodyHtml: '<p>Pöördu peavarjendisse.</p>',
  locale: 'et',
  status: 'PUBLISHED',
  pinned: true,
  heroImageId: 5,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-02T09:00:00Z',
};

/** The public index row (permit-all) — the Published column's instant is
 *  merged from here by slug (the admin DTO has no publishedAt). */
const PUBLIC_POST: GuidancePostDto = {
  slug: 'varjumine-droonirunnaku-ajal',
  title: 'Varjumine droonirünnaku ajal',
  bodyHtml: null,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  pinned: true,
  locale: 'et',
  publishedAt: '2026-09-02T12:00:00Z',
  updatedAt: '2026-09-02T09:00:00Z',
};

const MEDIA_ROW: MediaAssetDto = {
  id: 5,
  url: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  storedFilename: '0123456789abcdef0123456789abcdef.jpg',
  originalFilename: 'kelder.jpg',
  contentType: 'image/jpeg',
  width: 1600,
  height: 900,
  sizeBytes: 204800,
  createdAt: '2026-09-01T09:00:00Z',
  reusedBy: 1,
};

const MEDIA_ROW_UNUSED: MediaAssetDto = {
  id: 6,
  url: '/api/media/fedcba9876543210fedcba9876543210.png',
  storedFilename: 'fedcba9876543210fedcba9876543210.png',
  originalFilename: 'maapilt.png',
  contentType: 'image/png',
  width: 800,
  height: 600,
  sizeBytes: 51200,
  createdAt: '2026-09-02T09:00:00Z',
  reusedBy: 0,
};

// ---- hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics) ----

class FakeAdminGateway {
  listShelters = vi.fn();
  setShelterStatus = vi.fn();
  deleteShelter = vi.fn();
  listShelterReports = vi.fn();
  dismissShelterReport = vi.fn();
  reviewShelter = vi.fn();
  listAudit = vi.fn();
  listAlerts = vi.fn();
  listShelterHistory = vi.fn();
  requestInfo = vi.fn();
  markInaccurate = vi.fn();
  clearInaccurate = vi.fn();
  listUsers = vi.fn();
  suspendUser = vi.fn();
  unsuspendUser = vi.fn();
  listGuidancePosts = vi.fn();
  getGuidancePost = vi.fn();
  createGuidancePost = vi.fn();
  updateGuidancePost = vi.fn();
  publishGuidancePost = vi.fn();
  unpublishGuidancePost = vi.fn();
  deleteGuidancePost = vi.fn();
  listMediaAssets = vi.fn();
  uploadMediaAsset = vi.fn();
  deleteMediaAsset = vi.fn();
}

/** The permit-all public guidance index — the guidance tab merges the
 *  publication instants from it (the admin DTO has no publishedAt). */
class FakeGuidanceGateway {
  list = vi.fn();
  getBySlug = vi.fn();
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
  let publicGuidance: FakeGuidanceGateway;
  let auth: FakeAuthGateway;
  let account: FakeAccountGateway;
  let store: AuthStore;
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(() => {
    localStorage.clear();
    admin = new FakeAdminGateway();
    publicGuidance = new FakeGuidanceGateway();
    auth = new FakeAuthGateway();
    account = new FakeAccountGateway();
    admin.setShelterStatus.mockResolvedValue(undefined);
    admin.deleteShelter.mockResolvedValue(undefined);
    admin.dismissShelterReport.mockResolvedValue(undefined);
    admin.reviewShelter.mockResolvedValue({ ok: true });
    admin.listAudit.mockResolvedValue([]);
    admin.listAlerts.mockResolvedValue([]);
    admin.listShelterHistory.mockResolvedValue([]);
    admin.listUsers.mockResolvedValue([]);
    admin.suspendUser.mockResolvedValue(undefined);
    admin.unsuspendUser.mockResolvedValue(undefined);
    publicGuidance.list.mockResolvedValue([]);
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
        { provide: GuidanceGateway, useValue: publicGuidance as unknown as GuidanceGateway },
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

  /** Let a fire-and-forget load settle (the page's own promise chains). */
  async function settle(fixture: {
    whenStable(): Promise<unknown>;
    detectChanges(): void;
  }): Promise<void> {
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  /** Click a tab button and let its lazy load settle. */
  async function switchTab(
    name: string,
    element: HTMLElement,
    fixture: { whenStable(): Promise<unknown>; detectChanges(): void },
  ): Promise<void> {
    buttonByText(element, name)!.click();
    await settle(fixture);
  }

  /** The editor's title/body inputs live in the child component's template. */
  function inputById(root: HTMLElement, id: string): HTMLInputElement | HTMLTextAreaElement | null {
    return root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
  }

  /** Set a reactive control's value through the DOM (dispatch 'input', then
   *  change detection) — the established spec convention. */
  function typeValue(
    el: HTMLInputElement | HTMLTextAreaElement,
    value: string,
    fx: { detectChanges(): void },
  ): void {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fx.detectChanges();
  }

  function firstRow(root: HTMLElement): HTMLElement {
    const row = root.querySelector('tr.admin-row, li.admin-queue-row');
    if (!row) {
      throw new Error('no admin row rendered');
    }
    return row as HTMLElement;
  }

  /** The default tab is Unconfirmed — the shelters-tab tests switch over
   *  first (the shelters list itself already loaded in ngOnInit). */
  async function toShelters(
    element: HTMLElement,
    fx: ReturnType<typeof TestBed.createComponent<Host>>,
  ): Promise<void> {
    buttonByText(element, 'Shelters')!.click();
    await fx.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fx.detectChanges();
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
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    // Default call: no filters (the bare /admin/shelters).
    expect(admin.listShelters).toHaveBeenCalledWith(undefined);
    expect(element.textContent).toContain('Kommunaali Varjend');
    expect(element.textContent).toContain('Linna Varjend');
    expect(element.textContent).toContain('Lossi 2, Tartu');
    expect(element.textContent).toContain('Päästeamet registry');
    expect(element.textContent).toContain('Kaja K.');
    // Occupancy: firm band + recency (the shared copy, reportedAt mapped).
    expect(element.textContent).toContain('Full · 12 min ago');
  });

  it('a hidden USER row renders dimmed with the Hidden badge and offers Activate, not Hide', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW_HIDDEN]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    const row = firstRow(element);
    expect(row.classList).toContain('admin-row--hidden');
    expect(row.textContent).toContain('Hidden');
    expect(buttonByText(row, 'Activate')).not.toBeNull();
    expect(buttonByText(row, 'Hide')).toBeNull();
  });

  it('Hide posts INACTIVE and updates the row in place (204 — no refetch)', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

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
    await toShelters(element, fixture);

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
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Delete')!.click();
    fixture.detectChanges();

    // Step 1 armed — nothing was called yet.
    expect(admin.deleteShelter).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Delete this shelter permanently?');
    // The prompt is a live region, so arming is announced.
    expect(element.querySelector('.admin-confirm[role="status"]')).not.toBeNull();

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
    await toShelters(element, fixture);

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
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    const row = firstRow(element);
    expect(row.textContent).toContain('registry');
    expect(row.textContent).toContain('read-only');
    expect(row.querySelectorAll('button').length).toBe(0);
  });

  // ---- shelter history ---------------------------------------------------------

  it('a USER row gets a History button that opens the inline event list', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.listShelterHistory.mockResolvedValue(HISTORY_EVENTS);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'History')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.listShelterHistory).toHaveBeenCalledWith(7);
    // ascending events: action label, actor, and the parsed field changes
    // (absent side renders as —, the first-set capacity)
    expect(element.textContent).toContain('Created');
    expect(element.textContent).toContain('Edited');
    expect(element.textContent).toContain('Kaja K.');
    expect(element.textContent).toContain('name: Vananimi → Kommunaali Varjend');
    expect(element.textContent).toContain('capacity: — → 12');
  });

  it('the History toggle closes the panel on a second click', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.listShelterHistory.mockResolvedValue(HISTORY_EVENTS);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'History')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.admin-history')).not.toBeNull();

    buttonByText(element, 'Close history')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.admin-history')).toBeNull();
  });

  it('a failed history load closes the panel and surfaces the server message', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.listShelterHistory.mockRejectedValue(apiError(404, 'Gone', '/admin/shelters/7/history'));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'History')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('.admin-history')).toBeNull();
    expect(element.textContent).toContain('Gone');
  });

  // ---- info request --------------------------------------------------------------

  it('a USER row gets an Info button that opens the question editor', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();

    expect(element.querySelector('#info-request-message')).not.toBeNull();
    expect(element.textContent).toContain('Question for the submitter');
  });

  it('sending the question POSTs it, refetches the list, and closes the panel', async () => {
    const askedRow = {
      ...USER_ROW,
      infoRequest: {
        message: 'Kas varjend on avatud?',
        requestedAt: ago(60_000),
        requestedByName: 'Admin',
        replyMessage: null,
        repliedAt: null,
      },
    };
    admin.listShelters.mockResolvedValueOnce([USER_ROW]).mockResolvedValueOnce([askedRow]);
    admin.requestInfo.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#info-request-message')!;
    textarea.value = 'Kas varjend on avatud?';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(element, 'Send')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.requestInfo).toHaveBeenCalledWith(7, 'Kas varjend on avatud?');
    // the 204 carries no body — the list refetches (the server resolves the
    // requester name + timestamp) and the panel closes
    expect(admin.listShelters).toHaveBeenCalledTimes(2);
    expect(element.querySelector('#info-request-message')).toBeNull();
    expect(element.textContent).toContain('Question sent to the submitter.');
  });

  it('a blank question does not POST and shows the field error', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { page, element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();
    // whitespace-only passes Validators.required — the blank validator is the pin
    const textarea = element.querySelector<HTMLTextAreaElement>('#info-request-message')!;
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const send = buttonByText(element, 'Send');
    expect(send?.disabled).toBe(true);
    // the disabled button is the guard — touch the control to pin the error copy
    page.requestMessage.markAsTouched();
    fixture.detectChanges();

    expect(admin.requestInfo).not.toHaveBeenCalled();
    expect(element.textContent).toContain('A question is required');
  });

  it('a row with an answered request shows the exchange read-only (no editor)', async () => {
    const row = {
      ...USER_ROW,
      infoRequest: {
        message: 'Kas varjund on avatud?',
        requestedAt: ago(3 * 3_600_000),
        requestedByName: 'Admin',
        replyMessage: 'Jah, avatud on.',
        repliedAt: ago(600_000),
      },
    };
    admin.listShelters.mockResolvedValue([row]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Info request');
    expect(element.textContent).toContain('Jah, avatud on.');
    expect(element.querySelector('#info-request-message')).toBeNull();
  });

  it('a row with a pending request shows the waiting note (no answer yet)', async () => {
    const row = {
      ...USER_ROW,
      infoRequest: {
        message: 'Kas varjund on avatud?',
        requestedAt: ago(3_600_000),
        requestedByName: 'Admin',
        replyMessage: null,
        repliedAt: null,
      },
    };
    admin.listShelters.mockResolvedValue([row]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain("Waiting for the submitter's answer.");
    expect(element.querySelector('#info-request-message')).toBeNull();
  });

  it('a 409 from request-info (re-request) keeps the panel open with the question', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.requestInfo.mockRejectedValue(
      apiError(
        409,
        'This shelter already has an information request',
        '/admin/shelters/7/request-info',
      ),
    );
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#info-request-message')!;
    textarea.value = 'Uus küsimus?';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(element, 'Send')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('This shelter already has an information request');
    // the editor stays open (the admin keeps the question)
    expect(element.querySelector('#info-request-message')).not.toBeNull();
  });

  // ---- mark inaccurate ---------------------------------------------------------------

  it('an unmarked USER row gets a Mark inaccurate button that opens the reason editor', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Mark inaccurate')!.click();
    fixture.detectChanges();

    expect(element.querySelector('#mark-inaccurate-reason')).not.toBeNull();
    expect(element.textContent).toContain('Reason (optional)');
  });

  it('marking POSTs the reason, refetches the list, and renders the flag treatment', async () => {
    const markedRow = { ...USER_ROW, inaccurate: true };
    admin.listShelters.mockResolvedValueOnce([USER_ROW]).mockResolvedValueOnce([markedRow]);
    admin.markInaccurate.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Mark inaccurate')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#mark-inaccurate-reason')!;
    textarea.value = 'Uks on suletud';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(element, 'Mark inaccurate')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.markInaccurate).toHaveBeenCalledWith(7, 'Uks on suletud');
    // the 204 carries no body — the list refetches and the editor closes
    expect(admin.listShelters).toHaveBeenCalledTimes(2);
    expect(element.querySelector('#mark-inaccurate-reason')).toBeNull();
    expect(element.textContent).toContain('Marked as inaccurate.');
    // the refetched row carries the badge + the single-sourced warning line
    expect(element.querySelector('.badge--inaccurate')?.textContent?.trim()).toBe('Inaccurate');
    expect(element.textContent).toContain('Reported inaccurate — details may be wrong');
  });

  it('a marked row shows the badge + warning and a Clear action (no editor)', async () => {
    const markedRow = { ...USER_ROW, inaccurate: true };
    admin.listShelters.mockResolvedValueOnce([markedRow]).mockResolvedValueOnce([USER_ROW]);
    admin.clearInaccurate.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    expect(element.querySelector('.badge--inaccurate')).not.toBeNull();
    expect(element.textContent).toContain('Reported inaccurate — details may be wrong');
    expect(buttonByText(firstRow(element), 'Mark inaccurate')).toBeNull();

    buttonByText(firstRow(element), 'Clear inaccurate')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(admin.clearInaccurate).toHaveBeenCalledWith(7);
    expect(admin.listShelters).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.badge--inaccurate')).toBeNull();
    expect(element.textContent).toContain('Inaccurate mark cleared.');
  });

  it('a failed mark keeps the editor open with the reason', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.markInaccurate.mockRejectedValue(
      apiError(409, 'registry rows are import-owned', '/admin/shelters/7/mark-inaccurate'),
    );
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Mark inaccurate')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#mark-inaccurate-reason')!;
    textarea.value = 'Uks on suletud';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(element, 'Mark inaccurate')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('registry rows are import-owned');
    // the editor stays open (the admin keeps the reason)
    expect(element.querySelector('#mark-inaccurate-reason')).not.toBeNull();
    expect((element.querySelector('#mark-inaccurate-reason') as HTMLTextAreaElement).value).toBe(
      'Uks on suletud',
    );
  });

  it('registry rows get no mark/clear actions', async () => {
    admin.listShelters.mockResolvedValue([REGISTRY_ROW]);
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    const row = firstRow(element);
    expect(buttonByText(row, 'Mark inaccurate')).toBeNull();
    expect(buttonByText(row, 'Clear inaccurate')).toBeNull();
  });

  it('submitting the search box re-queries with the q filter (server-side substring)', async () => {
    admin.listShelters.mockResolvedValue([]);
    const { page, element, fixture } = await openAdmin();
    await toShelters(element, fixture);
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
    await toShelters(element, fixture);

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

  it('a dampened report row (M9) renders the Dampened marker', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listShelterReports.mockResolvedValue([{ ...REPORT_ROW, id: 103, damped: true }]);
    const { element, fixture } = await openAdmin();
    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    // the row is still fully present (evidence, never deleted) — flagged
    const row = firstRow(element);
    expect(row.textContent).toContain('Dampened');
    expect(row.textContent).toContain('Does not exist');
    expect(buttonByText(row, 'Dismiss')).not.toBeNull(); // dismissable like any row
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

  // ---- unconfirmed (review-queue) tab ------------------------------------------

  it('opens on the Unconfirmed tab: only USER+NEW rows, with the queue columns', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW, USER_ROW_HIDDEN, REGISTRY_ROW]);
    const { element } = await openAdmin();

    // The default tab is Unconfirmed (the queue filters the shelters list —
    // no extra endpoint call).
    const active = element.querySelector<HTMLButtonElement>('.admin-tab--active');
    expect(active?.textContent?.trim()).toBe('Unconfirmed');
    const rows = element.querySelectorAll('tr.admin-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Kommunaali Varjend');
    expect(rows[0].textContent).toContain('Kaja K.');
    expect(rows[0].textContent).toContain('Mark confirmed');
    expect(rows[0].textContent).toContain('Reject');
    // The CONFIRMED community row and the registry row are NOT in the queue.
    expect(element.textContent).not.toContain('Peidetud Kelder');
    expect(element.textContent).not.toContain('Linna Varjend');
  });

  it('the queue is ordered by id, newest first', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW, USER_ROW_NEWER]);
    const { element } = await openAdmin();

    const names = [...element.querySelectorAll('.admin-row .admin-cell--name')].map(
      (c) => c.textContent?.trim() ?? '',
    );
    expect(names[0]).toContain('Uus Kelder'); // higher id — first
    expect(names[1]).toContain('Kommunaali Varjend'); // lower id — second
  });

  it('Mark confirmed posts CONFIRM (no reason) and refreshes the queue', async () => {
    // First load: the row is NEW; after the action the refresh returns it
    // CONFIRMED (dropped from the queue).
    admin.listShelters
      .mockResolvedValueOnce([USER_ROW])
      .mockResolvedValueOnce([{ ...USER_ROW, reviewStatus: 'CONFIRMED' }]);
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Mark confirmed')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.reviewShelter).toHaveBeenCalledTimes(1);
    expect(admin.reviewShelter).toHaveBeenCalledWith(7, { action: 'CONFIRM' });
    expect(element.textContent).toContain('Location confirmed.');
    // The queue recomputed from the refresh — now empty.
    expect(element.querySelectorAll('tr.admin-row').length).toBe(0);
    expect(element.textContent).toContain('No unconfirmed community locations.');
  });

  it('Reject requires a reason: the editor opens inline, empty/blank is blocked with an error', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Reject')!.click();
    fixture.detectChanges();

    const textarea = element.querySelector<HTMLTextAreaElement>('#reject-reason');
    expect(textarea).not.toBeNull();
    const rejectButton = buttonByText(firstRow(element), 'Reject');
    expect(rejectButton).not.toBeNull();
    expect(rejectButton?.disabled).toBe(true); // blank reason — disabled

    // Type a blank reason: the guard rejects it WITHOUT calling the API.
    const page = fixture.debugElement.query(By.directive(AdminPage))!
      .componentInstance as AdminPage;
    page.rejectReason.setValue('   ');
    fixture.detectChanges();
    expect(rejectButton?.disabled).toBe(true);

    page.rejectRow(row7());
    await fixture.whenStable();
    fixture.detectChanges();
    expect(admin.reviewShelter).not.toHaveBeenCalled();
    expect(element.textContent).toContain('A reason is required (max 500 characters).');

    function row7(): typeof USER_ROW {
      return USER_ROW;
    }
  });

  it('Reject with a reason posts REJECT + reason, closes the editor, refreshes the queue', async () => {
    admin.listShelters
      .mockResolvedValueOnce([USER_ROW])
      .mockResolvedValueOnce([{ ...USER_ROW, reviewStatus: 'REJECTED', status: 'INACTIVE' }]);
    const { page, element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Reject')!.click();
    fixture.detectChanges();
    page.rejectReason.setValue('Could not verify the address');
    fixture.detectChanges();

    buttonByText(firstRow(element), 'Reject')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.reviewShelter).toHaveBeenCalledTimes(1);
    expect(admin.reviewShelter).toHaveBeenCalledWith(7, {
      action: 'REJECT',
      reason: 'Could not verify the address',
    });
    expect(element.textContent).toContain('Location rejected.');
    // The editor is gone and the queue recomputed (the row is no longer NEW).
    expect(element.querySelector('#reject-reason')).toBeNull();
    expect(element.textContent).toContain('No unconfirmed community locations.');
  });

  it('a 409 from the review endpoint surfaces the server message verbatim; the queue keeps the row', async () => {
    admin.listShelters.mockResolvedValue([USER_ROW]);
    admin.reviewShelter.mockRejectedValue(
      apiError(409, 'shelter state changed, reload', '/admin/shelters/7/review'),
    );
    const { element, fixture } = await openAdmin();

    buttonByText(firstRow(element), 'Mark confirmed')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const banner = element.querySelector('.banner--error') as HTMLElement | null;
    expect(banner?.textContent).toContain('shelter state changed, reload');
    expect(element.querySelectorAll('tr.admin-row').length).toBe(1);
  });

  // ---- alerts tab ---------------------------------------------------------------

  it('switching to the Alerts tab loads the ring lazily; rows render when/type/subject/detail/retry-after', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listAlerts.mockResolvedValue([
      {
        id: 42,
        kind: 'near-duplicate',
        subject: 'user:77',
        detail: 'Near-duplicate of shelter #12 (409)',
        retryAfterSeconds: null,
        at: ago(2 * 60_000),
      },
      {
        id: 41,
        kind: 'otp-contact-cap',
        subject: 'contact:spam@hammer.ee',
        detail: 'OTP contact cap reached (429)',
        retryAfterSeconds: 24 * 3600 - 300,
        at: ago(5 * 60_000),
      },
    ]);
    const { element, fixture } = await openAdmin();

    expect(admin.listAlerts).not.toHaveBeenCalled(); // lazy — alerts tab only
    buttonByText(element, 'Alerts')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.listAlerts).toHaveBeenCalledTimes(1);
    expect(admin.listAlerts).toHaveBeenCalledWith();
    const rows = element.querySelectorAll('tr.admin-row');
    expect(rows.length).toBe(2);
    // Newest first: the 2-min-old 409 row, then the 5-min-old 429 row.
    expect(rows[0].textContent).toContain('Near-duplicate submission');
    expect(rows[0].textContent).toContain('user:77');
    expect(rows[0].textContent).toContain('shelter #12');
    expect(rows[0].textContent).toContain('—'); // no retry-after on the 409
    expect(rows[1].textContent).toContain('OTP contact cap');
    expect(rows[1].textContent).toContain('contact:spam@hammer.ee');
    expect(rows[1].textContent).toContain('23 h 55 min'); // human-formatted
  });

  // ---- audit tab ----------------------------------------------------------------

  it('switching to the Audit tab loads the trail lazily; rows render when/moderator/shelter/action/change/reason', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([
      {
        id: 9001,
        createdAt: ago(5 * 60_000),
        moderatorName: 'Anu T.',
        shelterId: 7,
        shelterName: 'Kommunaali Varjend',
        action: 'CONFIRM',
        previousStatus: 'NEW',
        newStatus: 'CONFIRMED',
        reason: null,
      },
      {
        id: 9002,
        createdAt: ago(10 * 60_000),
        moderatorName: 'Anu T.',
        shelterId: 12,
        shelterName: 'Deleted shelter',
        action: 'DELETE',
        previousStatus: 'INACTIVE',
        newStatus: null,
        reason: null,
      },
      {
        id: 9003,
        createdAt: ago(15 * 60_000),
        moderatorName: 'Bert B.',
        shelterId: 8,
        shelterName: 'Peidetud Kelder',
        action: 'REJECT',
        previousStatus: 'NEW',
        newStatus: 'INACTIVE',
        reason: 'Could not verify',
      },
    ]);
    const { element, fixture } = await openAdmin();

    expect(admin.listAudit).not.toHaveBeenCalled(); // lazy — audit tab only
    buttonByText(element, 'Audit log')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.listAudit).toHaveBeenCalledTimes(1);
    expect(admin.listAudit).toHaveBeenCalledWith();
    const rows = element.querySelectorAll('tr.admin-row');
    expect(rows.length).toBe(3);
    // Row 1: action label + the status transition + the null reason dash.
    expect(rows[0].textContent).toContain('Confirmed');
    expect(rows[0].textContent).toContain('NEW → CONFIRMED');
    expect(rows[0].textContent).toContain('Anu T.');
    expect(rows[0].textContent).toContain('Kommunaali Varjend');
    // Row 2: the server-resolved name of a deleted shelter, one-sided change.
    expect(rows[1].textContent).toContain('Deleted shelter');
    expect(rows[1].textContent).toContain('Delete');
    expect(rows[1].textContent).toContain('INACTIVE');
    // Row 3: the reason cell is filled.
    expect(rows[2].textContent).toContain('Rejected');
    expect(rows[2].textContent).toContain('Could not verify');
  });

  it('the audit trail labels the mark-inaccurate actions (M10 slice 4)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([
      {
        id: 9101,
        createdAt: ago(5 * 60_000),
        moderatorName: 'Anu T.',
        shelterId: 7,
        shelterName: 'Kommunaali Varjend',
        action: 'MARK_INACCURATE',
        previousStatus: 'NEW',
        newStatus: 'NEW',
        reason: 'Uks on suletud',
      },
      {
        id: 9102,
        createdAt: ago(10 * 60_000),
        moderatorName: 'Anu T.',
        shelterId: 7,
        shelterName: 'Kommunaali Varjend',
        action: 'CLEAR_INACCURATE',
        previousStatus: 'NEW',
        newStatus: 'NEW',
        reason: null,
      },
    ]);
    const { element, fixture } = await openAdmin();

    buttonByText(element, 'Audit log')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const rows = element.querySelectorAll('tr.admin-row');
    expect(rows[0].textContent).toContain('Marked inaccurate');
    expect(rows[0].textContent).toContain('Uks on suletud');
    expect(rows[1].textContent).toContain('Inaccurate cleared');
  });

  it('an empty audit trail shows the empty state', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([]);
    const { element, fixture } = await openAdmin();

    buttonByText(element, 'Audit log')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(element.textContent).toContain('No moderation actions yet.');
  });

  // ---- users tab ---------------------------------------------------------------

  it('switching to the Users tab loads accounts lazily; rows render name/e-mail/kind/status', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listUsers.mockResolvedValue([
      { id: 301, name: 'Siht', email: 'siht@example.ee', kind: 'REGISTERED', suspendedAt: null },
      { id: 302, name: 'Admin', email: 'admin@example.ee', kind: 'ADMIN', suspendedAt: null },
    ]);
    const { element, fixture } = await openAdmin();

    expect(admin.listUsers).not.toHaveBeenCalled(); // lazy — users tab only
    buttonByText(element, 'Users')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.listUsers).toHaveBeenCalledTimes(1);
    const rows = element.querySelectorAll('tr.admin-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Siht');
    expect(rows[0].textContent).toContain('siht@example.ee');
    expect(rows[0].textContent).toContain('REGISTERED');
    expect(rows[0].textContent).toContain('Active');
    // the suspend action is offered on the active registered row
    expect(rows[0].textContent).toContain('Suspend');
    // the admin row is listed (visible) but not suspendable
    expect(rows[1].textContent).toContain('ADMIN');
    expect(rows[1].textContent).toContain('Not suspendable');
  });

  it('suspending is two-tap: the confirm strip arms, confirms, and patches the row in place', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listUsers.mockResolvedValue([
      { id: 301, name: 'Siht', email: 'siht@example.ee', kind: 'REGISTERED', suspendedAt: null },
    ]);
    const { element, fixture } = await openAdmin();

    buttonByText(element, 'Users')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const row = firstRow(element);
    buttonByText(row, 'Suspend')!.click();
    fixture.detectChanges();
    // armed: the confirm strip replaces the action buttons
    expect(row.textContent).toContain('Suspend this account?');
    expect(row.textContent).toContain('Confirm suspend');
    // The prompt is a live region, so arming is announced.
    expect(row.querySelector('.admin-confirm[role="status"]')).not.toBeNull();

    buttonByText(row, 'Confirm suspend')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.suspendUser).toHaveBeenCalledTimes(1);
    expect(admin.suspendUser).toHaveBeenCalledWith(301);
    // patched in place: the badge + dimmed row, the action flips to Unsuspend
    expect(firstRow(element).textContent).toContain('Suspended');
    expect(firstRow(element).textContent).toContain('Unsuspend');
    expect(firstRow(element).classList).toContain('admin-row--dismissed');
  });

  it('unsuspending flips the row back to Active', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listUsers.mockResolvedValue([
      {
        id: 301,
        name: 'Siht',
        email: 'siht@example.ee',
        kind: 'REGISTERED',
        suspendedAt: ago(60_000),
      },
    ]);
    const { element, fixture } = await openAdmin();

    buttonByText(element, 'Users')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const row = firstRow(element);
    buttonByText(row, 'Unsuspend')!.click();
    fixture.detectChanges();
    expect(row.textContent).toContain("Restore this account's access?");
    buttonByText(row, 'Confirm unsuspend')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(admin.unsuspendUser).toHaveBeenCalledWith(301);
    expect(firstRow(element).textContent).toContain('Active');
  });

  it('the audit trail renders user-scoped rows with the account subject and new labels', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([
      {
        id: 9101,
        createdAt: ago(2 * 60_000),
        moderatorName: 'Admin',
        shelterId: null,
        shelterName: 'Account: Siht (siht@example.ee)',
        action: 'USER_SUSPEND',
        previousStatus: null,
        newStatus: null,
        reason: null,
      },
    ]);
    const { element, fixture } = await openAdmin();

    buttonByText(element, 'Audit log')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const rows = element.querySelectorAll('tr.admin-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('User suspended');
    expect(rows[0].textContent).toContain('Account: Siht (siht@example.ee)');
    // the column header is "Subject" since user rows share the trail
    expect(element.textContent).toContain('Subject');
  });

  // ---- empty states ---------------------------------------------------------------

  it('shows a plain empty state per tab when the queues are empty', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listShelterReports.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([]);
    admin.listAlerts.mockResolvedValue([]);
    admin.listUsers.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([]);
    const { element, fixture } = await openAdmin();

    // Default tab: the unconfirmed queue is empty (no shelters at all).
    expect(element.textContent).toContain('No unconfirmed community locations.');

    buttonByText(element, 'Shelters')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No shelters.');

    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No reports.');

    buttonByText(element, 'Alerts')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No throttled or abusive activity yet.');

    buttonByText(element, 'Users')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No accounts yet.');

    buttonByText(element, 'Guidance')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No guidance posts yet.');

    buttonByText(element, 'Media library')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No images in the library yet.');

    buttonByText(element, 'Audit log')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No moderation actions yet.');
  });

  // ---- guidance tab (crisis-guidance D3/D8) ---------------------------------

  it('the guidance tab lazy-loads and renders rows (status, locale, pin, merged published date, hero)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]);
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    const { element, fixture } = await openAdmin();
    expect(admin.listGuidancePosts).not.toHaveBeenCalled();

    await switchTab('Guidance', element, fixture);

    expect(admin.listGuidancePosts).toHaveBeenCalledTimes(1);
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    // The published row: status badge, locale, pin, hero thumbnail.
    expect(rows[1]!.textContent).toContain('Varjumine droonirünnaku ajal');
    expect(rows[1]!.textContent).toContain('varjumine-droonirunnaku-ajal');
    expect(rows[1]!.textContent).toContain('Published');
    expect(rows[1]!.textContent).toContain('et');
    expect(rows[1]!.querySelectorAll('td')[3]!.textContent!.trim()).toBe('Yes');
    // The Published column is merged from the public index by slug (not '—').
    expect(rows[1]!.querySelectorAll('td')[4]!.textContent!.trim()).not.toBe('—');
    // The draft row: no publication instant (—), no pin.
    expect(rows[0]!.textContent).toContain('Uus juhis (mustand)');
    expect(rows[0]!.textContent).toContain('Draft');
    expect(rows[0]!.querySelectorAll('td')[3]!.textContent!.trim()).toBe('No');
    expect(rows[0]!.querySelectorAll('td')[4]!.textContent!.trim()).toBe('—');
    const thumb = rows[1]!.querySelector<HTMLImageElement>('img.admin-guidance-thumb');
    expect(thumb?.getAttribute('src')).toBe(GUIDANCE_PUBLISHED.heroImageUrl);
  });

  it('the draft row badge says the post is not public (the meaning, not just the state)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]);
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    const { element, fixture } = await openAdmin();

    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelector<HTMLElement>('tr.admin-row');
    expect(draftRow).not.toBeNull();
    const badge = draftRow!.querySelector('.badge--draft');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('Draft — not public');
    // The way out sits in the same row: the Publish action.
    expect(buttonByText(draftRow!, 'Publish')).not.toBeNull();
  });

  it('the guidance list shows the empty state (with the New post button)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([]);
    const { element, fixture } = await openAdmin();

    await switchTab('Guidance', element, fixture);

    expect(element.textContent).toContain('No guidance posts yet.');
    expect(buttonByText(element, 'New post')).not.toBeNull();
  });

  it('the guidance list error state shows the banner with Retry; Retry re-loads', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockRejectedValueOnce(
      apiError(503, 'upstream down', '/admin/guidance'),
    );
    const { element, fixture } = await openAdmin();

    await switchTab('Guidance', element, fixture);

    expect(element.textContent).toContain('Something went wrong. Please try again.');
    expect(buttonByText(element, 'Retry')).not.toBeNull();
    expect(buttonByText(element, 'New post')).not.toBeNull();

    admin.listGuidancePosts.mockResolvedValueOnce([GUIDANCE_DRAFT]);
    buttonByText(element, 'Retry')!.click();
    await settle(fixture);

    expect(element.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('create: the editor saves a draft (DRAFT status, null hero), the row is prepended', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_PUBLISHED]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
    admin.createGuidancePost.mockResolvedValue(GUIDANCE_DRAFT);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    buttonByText(element, 'New post')!.click();
    await settle(fixture);
    expect(element.querySelector('app-guidance-editor')).not.toBeNull();

    typeValue(inputById(element, 'ge-title')!, 'Uus juhis (mustand)', fixture);
    typeValue(inputById(element, 'ge-body')!, '<p>Keha</p>', fixture);
    buttonByText(element, 'Save')!.click();
    await settle(fixture);

    expect(admin.createGuidancePost).toHaveBeenCalledTimes(1);
    const payload = admin.createGuidancePost.mock.calls[0]![0];
    expect(payload.title).toBe('Uus juhis (mustand)');
    expect(payload.status).toBe('DRAFT');
    expect(payload.heroImageId).toBeNull();
    expect(payload.heroImageAlt).toBeNull();
    // The editor is closed; the created row is at the top; the success copy.
    expect(element.querySelector('app-guidance-editor')).toBeNull();
    expect(element.textContent).toContain('Post created.');
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain('Uus juhis (mustand)');
  });

  it('create: a 409 slug collision keeps the editor open with the server message', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([]);
    admin.createGuidancePost.mockRejectedValue(
      apiError(409, 'slug "uus-juhis" is already in use', '/admin/guidance'),
    );
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    buttonByText(element, 'New post')!.click();
    await settle(fixture);
    typeValue(inputById(element, 'ge-title')!, 'Uus juhis', fixture);
    typeValue(inputById(element, 'ge-body')!, '<p>Keha</p>', fixture);
    buttonByText(element, 'Save')!.click();
    await settle(fixture);

    expect(element.querySelector('app-guidance-editor')).not.toBeNull();
    expect(element.textContent).toContain('slug "uus-juhis" is already in use');
  });

  it('edit: opens with the fetched post; Save PUTs the update body (no status field)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.updateGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const rows = element.querySelectorAll('tbody tr');
    buttonByText(rows[1]!.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);
    expect(admin.getGuidancePost).toHaveBeenCalledWith(11);
    expect(element.querySelector('app-guidance-editor')).not.toBeNull();

    // The prefill is valid (hero + alt paired) — save as-is.
    buttonByText(element, 'Save')!.click();
    await settle(fixture);

    expect(admin.updateGuidancePost).toHaveBeenCalledTimes(1);
    expect(admin.updateGuidancePost.mock.calls[0]![0]).toBe(11);
    const body = admin.updateGuidancePost.mock.calls[0]![1];
    expect(body.status).toBeUndefined();
    expect(body.title).toBe(GUIDANCE_PUBLISHED.title);
    expect(body.heroImageId).toBe(5);
    expect(body.heroImageAlt).toBe(GUIDANCE_PUBLISHED.heroImageAlt);
    expect(element.querySelector('app-guidance-editor')).toBeNull();
    expect(element.textContent).toContain('Post updated.');
  });

  it('publish: the 204 flips the row in place to Published (and the index is re-fetched)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]);
    admin.publishGuidancePost.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelectorAll('tbody tr')[0]!;
    expect(draftRow.textContent).toContain('Draft');
    buttonByText(draftRow.querySelector('td.admin-cell--actions')!, 'Publish')!.click();
    await settle(fixture);

    expect(admin.publishGuidancePost).toHaveBeenCalledWith(12);
    expect(element.querySelectorAll('tbody tr')[0]!.textContent).toContain('Published');
    expect(element.textContent).toContain('Post published.');
    // loadGuidance's refresh + publish's refresh.
    expect(publicGuidance.list).toHaveBeenCalledTimes(2);
  });

  it('unpublish: the 204 flips the row in place to Draft', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]);
    admin.unpublishGuidancePost.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const publishedRow = element.querySelectorAll('tbody tr')[1]!;
    expect(publishedRow.textContent).toContain('Published');
    buttonByText(publishedRow.querySelector('td.admin-cell--actions')!, 'Unpublish')!.click();
    await settle(fixture);

    expect(admin.unpublishGuidancePost).toHaveBeenCalledWith(11);
    expect(element.querySelectorAll('tbody tr')[1]!.textContent).toContain('Draft');
    expect(element.textContent).toContain('Post unpublished.');
  });

  it('delete: two-tap confirm, then the row is removed', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listGuidancePosts.mockResolvedValue([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]);
    admin.deleteGuidancePost.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelectorAll('tbody tr')[0]!;
    buttonByText(draftRow.querySelector('td.admin-cell--actions')!, 'Delete')!.click();
    fixture.detectChanges();
    // The strip is armed (the shared two-tap confirm); nothing is sent yet.
    expect(element.textContent).toContain('Delete this post permanently?');
    expect(admin.deleteGuidancePost).not.toHaveBeenCalled();

    buttonByText(element, 'Confirm delete')!.click();
    await settle(fixture);

    expect(admin.deleteGuidancePost).toHaveBeenCalledWith(12);
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
    expect(element.textContent).toContain('Post deleted.');
  });

  // ---- media library tab (crisis-guidance D8) --------------------------------

  it('the media tab lazy-loads and renders rows (filename, dimensions, size, usage, thumbnail)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW, MEDIA_ROW_UNUSED]);
    const { element, fixture } = await openAdmin();
    expect(admin.listMediaAssets).not.toHaveBeenCalled();

    await switchTab('Media library', element, fixture);

    expect(admin.listMediaAssets).toHaveBeenCalledTimes(1);
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain('kelder.jpg');
    expect(rows[0]!.textContent).toContain('1600 × 900');
    expect(rows[0]!.textContent).toContain('200 KB');
    expect(rows[0]!.querySelectorAll('td')[5]!.textContent!.trim()).toBe('1');
    expect(rows[1]!.textContent).toContain('maapilt.png');
    expect(rows[1]!.textContent).toContain('800 × 600');
    expect(rows[1]!.textContent).toContain('50 KB');
    const thumb = rows[0]!.querySelector<HTMLImageElement>('img.admin-media-thumb');
    expect(thumb?.getAttribute('src')).toBe(MEDIA_ROW.url);
  });

  it('upload: choosing a file POSTs the multipart and prepends the returned row', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
    admin.uploadMediaAsset.mockResolvedValue(MEDIA_ROW_UNUSED);
    const { element, fixture } = await openAdmin();
    await switchTab('Media library', element, fixture);

    const input = element.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error('no file input rendered');
    }
    const file = new File(['x'.repeat(51200)], 'maapilt.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await settle(fixture);

    expect(admin.uploadMediaAsset).toHaveBeenCalledWith(file);
    expect(element.textContent).toContain('Image uploaded.');
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain('maapilt.png');
  });

  it('upload: a rejected upload shows the banner and keeps the old list', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
    admin.uploadMediaAsset.mockRejectedValue(
      apiError(413, 'image exceeds the 5 MB cap', '/admin/media'),
    );
    const { element, fixture } = await openAdmin();
    await switchTab('Media library', element, fixture);

    const input = element.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error('no file input rendered');
    }
    const file = new File(['x'.repeat(51200)], 'big.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await settle(fixture);

    expect(element.textContent).toContain('image exceeds the 5 MB cap');
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('media delete of an unused asset: the bare DELETE resolves, the row is removed (no dialog)', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW, MEDIA_ROW_UNUSED]);
    admin.deleteMediaAsset.mockResolvedValue(MEDIA_ROW_UNUSED);
    const { element, fixture } = await openAdmin();
    await switchTab('Media library', element, fixture);

    const unusedRow = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(unusedRow.querySelector('td.admin-cell--actions')!, 'Delete')!.click();
    await settle(fixture);

    expect(admin.deleteMediaAsset).toHaveBeenCalledTimes(1);
    expect(admin.deleteMediaAsset).toHaveBeenCalledWith(6, false);
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
    expect(element.textContent).toContain('Image deleted.');
  });

  it('media delete of an in-use asset: 409 arms the confirm; the re-issue sends confirm=true', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW, MEDIA_ROW_UNUSED]);
    const conflict = apiError(
      409,
      'still used by Guidance post "Varjumine" (varjumine)',
      '/admin/media/5',
    );
    admin.deleteMediaAsset.mockRejectedValueOnce(conflict).mockResolvedValueOnce(MEDIA_ROW);
    const { element, fixture } = await openAdmin();
    await switchTab('Media library', element, fixture);

    const inUseRow = element.querySelectorAll('tbody tr')[0]!;
    buttonByText(inUseRow.querySelector('td.admin-cell--actions')!, 'Delete')!.click();
    await settle(fixture);

    // First tap → the bare DELETE → the 409 arms the strip with the server's message.
    expect(admin.deleteMediaAsset).toHaveBeenCalledTimes(1);
    expect(admin.deleteMediaAsset).toHaveBeenLastCalledWith(5, false);
    expect(element.textContent).toContain('This image is still used by a guidance post');
    expect(element.textContent).toContain('still used by Guidance post "Varjumine" (varjumine)');

    buttonByText(element, 'Delete anyway')!.click();
    await settle(fixture);

    expect(admin.deleteMediaAsset).toHaveBeenCalledTimes(2);
    expect(admin.deleteMediaAsset).toHaveBeenLastCalledWith(5, true);
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
    expect(element.textContent).toContain('Image deleted.');
  });

  it('media delete cancel: the strip closes without a second call', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW, MEDIA_ROW_UNUSED]);
    const conflict = apiError(
      409,
      'still used by Guidance post "Varjumine" (varjumine)',
      '/admin/media/5',
    );
    admin.deleteMediaAsset.mockRejectedValueOnce(conflict);
    const { element, fixture } = await openAdmin();
    await switchTab('Media library', element, fixture);

    const inUseRow = element.querySelectorAll('tbody tr')[0]!;
    buttonByText(inUseRow.querySelector('td.admin-cell--actions')!, 'Delete')!.click();
    await settle(fixture);
    expect(admin.deleteMediaAsset).toHaveBeenCalledTimes(1);

    buttonByText(element, 'Cancel')!.click();
    fixture.detectChanges();

    expect(element.textContent).not.toContain('This image is still used by a guidance post');
    expect(admin.deleteMediaAsset).toHaveBeenCalledTimes(1);
  });

  // ---- audit labels for the new actions (crisis-guidance D12) ---------------

  it('the audit trail labels the guidance and media actions', async () => {
    admin.listShelters.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([
      {
        id: 9201,
        createdAt: ago(2 * 60_000),
        moderatorName: 'Admin',
        shelterId: null,
        shelterName: 'Guidance post "Varjumine" (varjumine)',
        action: 'GUIDANCE_PUBLISH',
        previousStatus: null,
        newStatus: null,
        reason: null,
      },
      {
        id: 9202,
        createdAt: ago(4 * 60_000),
        moderatorName: 'Admin',
        shelterId: null,
        shelterName: 'Media asset "kelder.jpg" (0123.jpg)',
        action: 'MEDIA_DELETE',
        previousStatus: null,
        newStatus: null,
        reason: null,
      },
    ]);
    const { element, fixture } = await openAdmin();

    await switchTab('Audit log', element, fixture);

    const rows = element.querySelectorAll('tbody tr');
    expect(rows[0]!.textContent).toContain('Guidance published');
    expect(rows[1]!.textContent).toContain('Media asset deleted');
  });
});
