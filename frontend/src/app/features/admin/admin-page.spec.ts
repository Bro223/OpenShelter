import { Component, type DebugElement } from '@angular/core';
import { readFileSync } from 'node:fs';
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
  GuidanceTranslationDto,
  MediaAssetDto,
  MeResponse,
  TokenResponse,
} from '../../core/models';
import { AdminPage } from './admin-page';
import { I18nService } from '../../core/i18n/i18n.service';

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
  occupancy: { band: 'FULL', lastReportedAt: ago(12 * 60_000), reportCount: 2 },
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
  homeLocale: 'et',
  status: 'DRAFT',
  pinned: false,
  sortOrder: 2,
  heroImageId: null,
  heroImageUrl: null,
  heroImageAlt: null,
  heroImportUrl: null,
  createdBy: 1,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
};

/** A DRAFT carrying a PENDING hero import (guidance-hero-import): the
 *  publish that consumes it is the one that fetches/validates/stores
 *  the image — this fixture is that draft. */
const GUIDANCE_PENDING_IMPORT: AdminGuidancePostDto = {
  ...GUIDANCE_DRAFT,
  heroImageAlt: 'Kelder, vaade sissepääsust',
  heroImportUrl: 'https://cdn.example.com/kelder.jpg',
};

/** The same draft AFTER a successful publish: the import was consumed
 *  (stored asset linked, URL cleared, status PUBLISHED). */
const GUIDANCE_IMPORTED_PUBLISHED: AdminGuidancePostDto = {
  ...GUIDANCE_PENDING_IMPORT,
  status: 'PUBLISHED',
  heroImageId: 9,
  heroImageUrl: '/api/media/deadbeefdeadbeefdeadbeefdeadbeef.jpg',
  heroImportUrl: null,
};

const GUIDANCE_PUBLISHED: AdminGuidancePostDto = {
  id: 11,
  slug: 'varjumine-droonirunnaku-ajal',
  title: 'Varjumine droonirünnaku ajal',
  bodyHtml: '<p>Pöördu peavarjendisse.</p>',
  locale: 'et',
  homeLocale: 'et',
  status: 'PUBLISHED',
  pinned: true,
  sortOrder: 1,
  heroImageId: 5,
  heroImageUrl: '/api/media/0123456789abcdef0123456789abcdef.jpg',
  heroImageAlt: 'Kelder, vaade sissepääsust',
  heroImportUrl: null,
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
  // The public INDEX shape: alternates is null there (kept lean) and no
  // fallback (the index lists only the active locale's posts).
  alternates: null,
  localeFallback: false,
};

/** The translations of GUIDANCE_PUBLISHED (id 11): the et home row (the
 *  post itself) + the en foreign row — ru is missing (the add-button
 *  offers exactly it). */
const TRANSLATION_ROWS: GuidanceTranslationDto[] = [
  {
    id: 401,
    postId: 11,
    locale: 'et',
    slug: 'varjumine-droonirunnaku-ajal',
    title: 'Varjumine droonirünnaku ajal',
    bodyHtml: '<p>Pöördu peavarjendisse.</p>',
    heroImageAlt: 'Kelder, vaade sissepääsust',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
  },
  {
    id: 402,
    postId: 11,
    locale: 'en',
    slug: 'sheltering-during-a-drone-strike',
    title: 'Sheltering during a drone strike',
    bodyHtml: '<p>Move to the shelter.</p>',
    heroImageAlt: 'Basement, view from the entrance',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  },
];

/** The created-ru row the create endpoint returns (test payloads). */
const TRANSLATION_ROW_RU: GuidanceTranslationDto = {
  id: 403,
  postId: 11,
  locale: 'ru',
  slug: 'ukrytie-v-pochode-droonovoy-atakii',
  title: 'Укрытие во время дроновой атаки',
  bodyHtml: '<p>Перейдите в убежище.</p>',
  heroImageAlt: 'Подвал',
  createdAt: '2026-09-03T09:00:00Z',
  updatedAt: '2026-09-03T09:00:00Z',
};

/** The EN-scoped detail of GUIDANCE_PUBLISHED (the foreign-locale edit:
 *  the on-screen row is en while the post's home locale is et). */
const GUIDANCE_PUBLISHED_EN: AdminGuidancePostDto = {
  ...GUIDANCE_PUBLISHED,
  locale: 'en',
  slug: 'sheltering-during-a-drone-strike',
  title: 'Sheltering during a drone strike',
  bodyHtml: '<p>Move to the shelter.</p>',
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
  listGuidancePostsPage = vi.fn();
  getGuidancePost = vi.fn();
  createGuidancePost = vi.fn();
  updateGuidancePost = vi.fn();
  publishGuidancePost = vi.fn();
  unpublishGuidancePost = vi.fn();
  deleteGuidancePost = vi.fn();
  reorderGuidanceOrder = vi.fn();
  // The translations (bilingual-guidance): the post's per-locale rows —
  // list/create/delete (the home-locale row is the post itself; the
  // ordinary scoped edit covers updating an existing row).
  listGuidanceTranslations = vi.fn();
  createGuidanceTranslation = vi.fn();
  deleteGuidanceTranslation = vi.fn();
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

/** The paged admin list response (the gateway's PagedRows shape — the
 *  un-paged total always equals the mocked rows' length in the specs;
 *  the paging specs override `total` explicitly). */
function paged<T>(rows: T[]): { rows: T[]; total: number } {
  return { rows, total: rows.length };
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
    // The translations section (bilingual-guidance): open in the ordinary
    // edit-mode tests without a rows fetch. (A bare un-mocked vi.fn() here
    // would return undefined and the sync throw would trip the detail
    // fetch's .catch — which closes the editor by design.)
    admin.listGuidanceTranslations.mockResolvedValue([]);
    admin.createGuidanceTranslation.mockResolvedValue(TRANSLATION_ROW_RU);
    admin.deleteGuidanceTranslation.mockResolvedValue(undefined);
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW, REGISTRY_ROW]));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    // Default call: no filters (the bare /admin/shelters).
    expect(admin.listShelters).toHaveBeenCalledWith();
    expect(element.textContent).toContain('Kommunaali Varjend');
    expect(element.textContent).toContain('Linna Varjend');
    expect(element.textContent).toContain('Lossi 2, Tartu');
    expect(element.textContent).toContain('Päästeamet registry');
    expect(element.textContent).toContain('Kaja K.');
    // Occupancy: firm band + recency (the shared copy; same wire shape as
    // the public list — lastReportedAt, pinned in models-contract.spec.ts).
    expect(element.textContent).toContain('Full · 12 min ago');
  });

  it('a hidden USER row renders dimmed with the Hidden badge and offers Activate, not Hide', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW_HIDDEN]));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    const row = firstRow(element);
    expect(row.classList).toContain('admin-row--hidden');
    expect(row.textContent).toContain('Hidden');
    expect(buttonByText(row, 'Activate')).not.toBeNull();
    expect(buttonByText(row, 'Hide')).toBeNull();
  });

  it('Hide posts INACTIVE and updates the row in place (204 — no refetch)', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    // Two loads total (the queue's full list + the Shelters tab's page) —
    // the hide itself refetched nothing (204 — in-place patch).
    expect(admin.listShelters).toHaveBeenCalledTimes(2);
  });

  it('Activate posts ACTIVE and clears the hidden state', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW_HIDDEN]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([REGISTRY_ROW]));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    const row = firstRow(element);
    expect(row.textContent).toContain('registry');
    expect(row.textContent).toContain('read-only');
    expect(row.querySelectorAll('button').length).toBe(0);
  });

  // ---- shelter history ---------------------------------------------------------

  it('a USER row gets a History button that opens the inline event list', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters
      .mockResolvedValueOnce(paged([USER_ROW])) // queue initial
      .mockResolvedValueOnce(paged([USER_ROW])) // Shelters page initial
      .mockResolvedValueOnce(paged([askedRow])) // queue refresh
      .mockResolvedValueOnce(paged([askedRow])); // Shelters page refresh
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
    // the 204 carries no body — both lists refetch (the server resolves the
    // requester name + timestamp) and the panel closes
    expect(admin.listShelters).toHaveBeenCalledTimes(4);
    expect(element.querySelector('#info-request-message')).toBeNull();
    expect(element.textContent).toContain('Question sent to the submitter.');
  });

  it('a blank question does not POST and shows the field error', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([row]));
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
    admin.listShelters.mockResolvedValue(paged([row]));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Info')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain("Waiting for the submitter's answer.");
    expect(element.querySelector('#info-request-message')).toBeNull();
  });

  it('a 409 from request-info (re-request) keeps the panel open with the question', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    buttonByText(firstRow(element), 'Mark inaccurate')!.click();
    fixture.detectChanges();

    expect(element.querySelector('#mark-inaccurate-reason')).not.toBeNull();
    expect(element.textContent).toContain('Reason (optional)');
  });

  it('marking POSTs the reason, refetches the list, and renders the flag treatment', async () => {
    const markedRow = { ...USER_ROW, inaccurate: true };
    admin.listShelters
      .mockResolvedValueOnce(paged([USER_ROW])) // queue initial
      .mockResolvedValueOnce(paged([USER_ROW])) // Shelters page initial
      .mockResolvedValueOnce(paged([markedRow])) // queue refresh
      .mockResolvedValueOnce(paged([markedRow])); // Shelters page refresh
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
    // the 204 carries no body — both lists refetch and the editor closes
    expect(admin.listShelters).toHaveBeenCalledTimes(4);
    expect(element.querySelector('#mark-inaccurate-reason')).toBeNull();
    expect(element.textContent).toContain('Marked as inaccurate.');
    // the refetched row carries the badge + the single-sourced warning line
    expect(element.querySelector('.badge--inaccurate')?.textContent?.trim()).toBe('Inaccurate');
    expect(element.textContent).toContain('Reported inaccurate — details may be wrong');
  });

  it('a marked row shows the badge + warning and a Clear action (no editor)', async () => {
    const markedRow = { ...USER_ROW, inaccurate: true };
    admin.listShelters
      .mockResolvedValueOnce(paged([markedRow])) // queue initial
      .mockResolvedValueOnce(paged([markedRow])) // Shelters page initial
      .mockResolvedValueOnce(paged([USER_ROW])) // queue refresh
      .mockResolvedValueOnce(paged([USER_ROW])); // Shelters page refresh
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
    expect(admin.listShelters).toHaveBeenCalledTimes(4);
    expect(element.querySelector('.badge--inaccurate')).toBeNull();
    expect(element.textContent).toContain('Inaccurate mark cleared.');
  });

  it('a failed mark keeps the editor open with the reason', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([REGISTRY_ROW]));
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);

    const row = firstRow(element);
    expect(buttonByText(row, 'Mark inaccurate')).toBeNull();
    expect(buttonByText(row, 'Clear inaccurate')).toBeNull();
  });

  it('submitting the search box re-queries with the q filter (server-side substring)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    const { page, element, fixture } = await openAdmin();
    await toShelters(element, fixture);
    expect(admin.listShelters).toHaveBeenLastCalledWith({ limit: 20, offset: 0 });

    page.searchQuery.setValue('  kelder  ');
    const form = element.querySelector('form.admin-search') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(admin.listShelters).toHaveBeenLastCalledWith({ q: 'kelder', limit: 20, offset: 0 }); // trimmed
  });

  it('a 409 from the status endpoint surfaces the server message; the row is unchanged', async () => {
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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

    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
    buttonByText(element, 'Retry')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(element.querySelectorAll('tr.admin-row').length).toBe(1);
  });

  // ---- shelter-report tab ------------------------------------------------------

  it('switching to the reports tab loads the queue lazily; rows carry shelter link, type, reporter, age', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
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

  it('a dampened report row (M9) renders the "Not counted" badge plus a non-empty reason line', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listShelterReports.mockResolvedValue([{ ...REPORT_ROW, id: 103, damped: true }]);
    const { element, fixture } = await openAdmin();
    buttonByText(element, 'Shelter reports')!.click();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    // the row is still fully present (evidence, never deleted) — flagged
    const row = firstRow(element);
    const badge = [...row.querySelectorAll('.badge')].find((b) =>
      (b.textContent ?? '').includes('Not counted'),
    );
    expect(badge, 'the badge shows the plain-language label').toBeDefined();
    // the reason is discoverable IN the row (visible to touch/keyboard
    // users — not a title tooltip alone): present and non-empty
    const reason = row.querySelector('.admin-queue-row__reason');
    expect(reason).not.toBeNull();
    expect((reason?.textContent ?? '').trim()).not.toHaveLength(0);
    expect(row.textContent).toContain('Does not exist');
    expect(buttonByText(row, 'Dismiss')).not.toBeNull(); // dismissable like any row
  });

  it('Dismiss posts the report id; the row stays in the queue, dimmed with the Dismissed badge', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW, USER_ROW_HIDDEN, REGISTRY_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW, USER_ROW_NEWER]));
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
      .mockResolvedValueOnce(paged([USER_ROW]))
      .mockResolvedValueOnce(paged([{ ...USER_ROW, reviewStatus: 'CONFIRMED' }]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
      .mockResolvedValueOnce(paged([USER_ROW]))
      .mockResolvedValueOnce(paged([{ ...USER_ROW, reviewStatus: 'REJECTED', status: 'INACTIVE' }]));
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
    admin.listShelters.mockResolvedValue(paged([USER_ROW]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listShelterReports.mockResolvedValue([]);
    admin.listAudit.mockResolvedValue([]);
    admin.listAlerts.mockResolvedValue([]);
    admin.listUsers.mockResolvedValue([]);
    admin.listGuidancePostsPage.mockResolvedValue(paged([]));
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
    expect(element.textContent).toContain('No guidance posts in en yet.');

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
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    const { element, fixture } = await openAdmin();
    expect(admin.listGuidancePostsPage).not.toHaveBeenCalled();

    await switchTab('Guidance', element, fixture);

    // admin-locale-scope: the list is fetched for the active UI language.
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledWith({ locale: 'en', limit: 20, offset: 0 });
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    // The published row: status badge, locale, pin, hero thumbnail.
    expect(rows[1]!.textContent).toContain('Varjumine droonirünnaku ajal');
    expect(rows[1]!.textContent).toContain('varjumine-droonirunnaku-ajal');
    expect(rows[1]!.textContent).toContain('Published');
    expect(rows[1]!.textContent).toContain('et');
    // The Position column shows the shared sortOrder (admin-locale-scope).
    expect(rows[1]!.querySelectorAll('td')[1]!.textContent!.trim()).toBe('1');
    expect(rows[1]!.querySelectorAll('td')[4]!.textContent!.trim()).toBe('Yes');
    // The Published column is merged from the public index by slug (not '—').
    expect(rows[1]!.querySelectorAll('td')[5]!.textContent!.trim()).not.toBe('—');
    // The draft row: no publication instant (—), no pin.
    expect(rows[0]!.textContent).toContain('Uus juhis (mustand)');
    expect(rows[0]!.textContent).toContain('Draft');
    expect(rows[0]!.querySelectorAll('td')[4]!.textContent!.trim()).toBe('No');
    expect(rows[0]!.querySelectorAll('td')[5]!.textContent!.trim()).toBe('—');
    const thumb = rows[1]!.querySelector<HTMLImageElement>('img.admin-guidance-thumb');
    expect(thumb?.getAttribute('src')).toBe(GUIDANCE_PUBLISHED.heroImageUrl);
  });

  it('the draft row badge says the post is not public (the meaning, not just the state)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
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
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([]));
    const { element, fixture } = await openAdmin();

    await switchTab('Guidance', element, fixture);

    expect(element.textContent).toContain('No guidance posts in en yet.');
    expect(buttonByText(element, 'New post')).not.toBeNull();
  });

  // admin-locale-split replaced the pre-split behavior this used to spec:
  // a UI language switch no longer re-fetches the list (the list is the
  // CONTENT language's, not the UI language's) — the admin-locale-split
  // specs below cover both directions.

  // ---- admin-locale-split: the admin UI language and the content language
  // are INDEPENDENT. The UI language drives the chrome (tab labels, buttons,
  // the scope line's copy); the CONTENT language drives what the guidance
  // list/detail/save/reorder calls scope to. A UI-language switch changes
  // the chrome only — the listed content stays where it was.

  it('a UI language switch changes the admin chrome but leaves the listed content untouched (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });

    // The admin UI language flips to et (the header switcher's path).
    i18nService.setLocale('et');
    await i18nService.ensureCatalog('et');
    await settle(fixture);

    // The chrome follows the UI language: the tab label is re-translated.
    expect(buttonByText(element, 'Guidance')).toBeNull();
    expect(element.textContent).toContain('Juhised'); // et catalog's tab label
    // The listed content is untouched: the list is NOT re-fetched (no
    // content-locale change) and the en-scoped rows still render.
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
    expect(element.textContent).toContain('Varjumine droonirünnaku ajal');
  });

  it('a UI language switch leaves the scoped empty state on the CONTENT locale (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([]));
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    expect(element.textContent).toContain('No guidance posts in en yet.');

    i18nService.setLocale('et');
    await i18nService.ensureCatalog('et');
    await settle(fixture);

    // The empty-state COPY is chrome (re-translated to et), but its {locale}
    // parameter is the CONTENT locale — still en, not the new UI locale —
    // and the list is not re-fetched.
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
    expect(element.textContent).toContain('Keeles en juhiseid pole veel.');
  });

  it('a content language switch changes the listed content and leaves the chrome untouched (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });

    i18nService.setContentLocale('ru');
    await settle(fixture);

    // The list is re-fetched in the NEW content locale (the listed content
    // is now the ru rows)…
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(2);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'ru', limit: 20, offset: 0 });
    // …and the chrome is untouched: the UI language is still en (the tab
    // label keeps the en copy, <html lang> is untouched).
    expect(buttonByText(element, 'Guidance')).not.toBeNull();
    expect(document.documentElement.lang).toBe('en');
  });

  it('the editor detail fetch and save scope to the content locale (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.updateGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    // The content language flips (ru); the UI language flips too (et —
    // chrome only, no content re-fetch).
    i18nService.setContentLocale('ru');
    await settle(fixture);
    i18nService.setLocale('et');
    await i18nService.ensureCatalog('et');
    await settle(fixture);

    const rows = element.querySelectorAll('tbody tr');
    // The row action button is the ET chrome label (the buttons follow the
    // UI language — the chrome, which just flipped to et) — while the
    // detail fetch below must scope to the CONTENT language (ru).
    buttonByText(rows[1]!.querySelector('td.admin-cell--actions')!, 'Muuda')!.click();
    await settle(fixture);
    // The detail fetch scopes to the CONTENT locale (ru), not the UI
    // language (et).
    expect(admin.getGuidancePost).toHaveBeenCalledTimes(1);
    expect(admin.getGuidancePost).toHaveBeenCalledWith(11, 'ru');

    // The prefill is valid (hero + alt paired) — save as-is (the Save
    // button is the ET chrome label): the PUT scopes to the content
    // locale too.
    buttonByText(element, 'Salvesta')!.click();
    await settle(fixture);

    expect(admin.updateGuidancePost).toHaveBeenCalledTimes(1);
    expect(admin.updateGuidancePost.mock.calls[0]![0]).toBe(11);
    expect(admin.updateGuidancePost.mock.calls[0]![2]).toBe('ru');
  });

  it('reorder submits the content locale the rendered list came from (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    admin.reorderGuidanceOrder.mockResolvedValue(undefined);
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });

    // The content language flips (the list re-fetches in et)…
    i18nService.setContentLocale('et');
    await settle(fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(2);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'et', limit: 20, offset: 0 });
    // …and the UI language flips too (chrome only — no re-fetch)…
    i18nService.setLocale('ru');
    await i18nService.ensureCatalog('ru');
    await settle(fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(2);

    // …then a reorder: the submission scopes to the LIST's locale (et),
    // not the UI language (ru).
    const rows = element.querySelectorAll('tbody tr');
    const [, up] = moveButtons(rows[1]!);
    up!.click();
    await settle(fixture);

    expect(admin.reorderGuidanceOrder).toHaveBeenCalledTimes(1);
    expect(admin.reorderGuidanceOrder).toHaveBeenCalledWith([13, 11, 12], 'et');
  });

  it('the admin-language select is gone and the header switcher still changes the chrome (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Settings', element, fixture);

    // The redundant select is gone: no #admin-language-select, no "Admin
    // language" label — the header language switcher IS the chrome control.
    expect(element.querySelector('#admin-language-select')).toBeNull();
    expect(element.textContent).not.toContain('Admin language');

    // A non-default content choice first (so the independence is real)…
    i18nService.setContentLocale('ru');
    await settle(fixture);
    // …then the header switcher's path (I18nService.setLocale): the chrome
    // follows (tab labels re-translate, <html lang> + the persisted key)…
    i18nService.setLocale('et');
    await i18nService.ensureCatalog('et');
    await settle(fixture);

    expect(buttonByText(element, 'Guidance')).toBeNull();
    expect(element.textContent).toContain('Juhised'); // et catalog's label
    expect(document.documentElement.lang).toBe('et');
    expect(localStorage.getItem('openshelter-locale')).toBe('et');
    // …and the content locale — signal AND persisted key — stays put.
    expect(i18nService.contentLocale()).toBe('ru');
    expect(localStorage.getItem('openshelter-admin-content-locale')).toBe('ru');
  });

  it('the content-language control sits on the Guidance tab, re-scopes the list there, and leaves the chrome untouched (admin-locale-split)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_PUBLISHED]));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();

    // The control is no longer on the Settings tab…
    await switchTab('Settings', element, fixture);
    expect(element.querySelector('#content-language-select')).toBeNull();
    // …it is on the Guidance tab (with the content it scopes), reflecting
    // the current content locale…
    await switchTab('Guidance', element, fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
    const contentSel = element.querySelector<HTMLSelectElement>('#content-language-select')!;
    expect(contentSel).not.toBeNull();
    expect(contentSel.value).toBe('en');

    // …and switching it THERE re-fetches the list in the new content locale
    // immediately (the cached rows are invalidated — no stale-locale rows
    // can render on the Guidance tab)…
    contentSel.value = 'ru';
    contentSel.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(2);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'ru', limit: 20, offset: 0 });
    // …while the chrome is untouched (the en tab labels and <html lang>
    // stay) and the choice persists under the content key.
    expect(buttonByText(element, 'Guidance')).not.toBeNull();
    expect(document.documentElement.lang).toBe('en');
    expect(i18nService.contentLocale()).toBe('ru');
    expect(localStorage.getItem('openshelter-admin-content-locale')).toBe('ru');
  });

  it('the guidance list error state shows the banner with Retry; Retry re-loads', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockRejectedValueOnce(
      apiError(503, 'upstream down', '/admin/guidance'),
    );
    const { element, fixture } = await openAdmin();

    await switchTab('Guidance', element, fixture);

    expect(element.textContent).toContain('Something went wrong. Please try again.');
    expect(buttonByText(element, 'Retry')).not.toBeNull();
    expect(buttonByText(element, 'New post')).not.toBeNull();

    admin.listGuidancePostsPage.mockResolvedValueOnce(paged([GUIDANCE_DRAFT]));
    buttonByText(element, 'Retry')!.click();
    await settle(fixture);

    expect(element.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('create: the editor saves a draft (DRAFT status, null hero), the row is appended (the server appends new posts to the manual order)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_PUBLISHED]));
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
    // The editor is closed; the created row is APPENDED (the server adds it
    // at the END of the stored manual order — not newest-first anymore);
    // the success copy.
    expect(element.querySelector('app-guidance-editor')).toBeNull();
    expect(element.textContent).toContain('Post created.');
    const rows = element.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[1]!.textContent).toContain('Uus juhis (mustand)');
  });

  it('create: a 409 slug collision keeps the editor open with the server message', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.updateGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const rows = element.querySelectorAll('tbody tr');
    buttonByText(rows[1]!.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);
    // admin-locale-scope: the detail fetch is scoped to the active UI
    // language (the editor round-trips that locale's content).
    expect(admin.getGuidancePost).toHaveBeenCalledWith(11, 'en');
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
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
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

  // ---- stylesheet pins (the admin stylesheet split) ---------------------------
  // The admin-page.scss -> shared-partial split silently DROPPED the
  // content-language select's rules (a bare native <select> rendered in
  // the styled admin surface — the owner-reported breakage). Text-level
  // pins so a future move cannot drop the styling again without a red
  // spec (nothing in the DOM suite can see a missing stylesheet rule).

  it('the content-language select keeps the app input idiom (admin-page.scss)', () => {
    const scss = readFileSync(
      `${process.cwd()}/src/app/features/admin/admin-page.scss`,
      'utf8',
    );
    const block = scss.match(/\.admin-guidance-language \{[\s\S]*?\n\}/);
    expect(block, 'admin-page.scss must keep the .admin-guidance-language rule').not.toBeNull();
    const rule = block![0];
    expect(rule, 'the language block stays width-capped').toMatch(/max-width: 420px/);
    expect(rule, 'the language block leaves room before the list below').toMatch(
      /margin-bottom: var\(--space-8\)/,
    );
    const select = rule.match(/\n  select \{[\s\S]*?\n  \}/);
    expect(select, '.admin-guidance-language must style its <select>').not.toBeNull();
    expect(select![0], 'the select keeps the 48px target').toMatch(/min-height: 48px/);
    expect(select![0], 'the select inherits the app font').toMatch(/font: inherit/);
    expect(select![0], 'the select takes the app border').toMatch(
      /border: 1px solid var\(--color-border\)/,
    );
    expect(select![0]).toMatch(/border-radius: var\(--radius-md\)/);
    expect(select![0]).toMatch(/background: var\(--color-bg-surface\)/);
    expect(select![0], 'the select never renders on the UA default background').toMatch(
      /color: inherit/,
    );
  });

  it('the active tab fills primary without a ghost border or off-contract text (admin-page.scss)', () => {
    const scss = readFileSync(
      `${process.cwd()}/src/app/features/admin/admin-page.scss`,
      'utf8',
    );
    const block = scss.match(/\.admin-tab--active \{[\s\S]*?\n\}/);
    expect(block, 'admin-page.scss must keep the .admin-tab--active rule').not.toBeNull();
    const rule = block![0];
    // The tab is a ghost button: without this the ghost border rims the
    // primary fill.
    expect(rule, 'the active tab must hide the ghost border').toMatch(/border-color: transparent/);
    // Text on primary is --color-bg-surface (the token contract for text
    // on the primary fill). An undefined var() — the split's
    // --color-text-inverse — silently falls back to the inherited text
    // colour and breaks the light theme's contrast.
    expect(rule, 'the active tab text follows the text-on-primary contract').toMatch(
      /color: var\(--color-bg-surface\)/,
    );
    expect(rule, 'no undefined --color-text-inverse token').not.toMatch(/--color-text-inverse/);
  });

  // ---- the pending hero import (guidance-hero-import) --------------------------
  // The publish call IS the import: the server fetches, validates and
  // stores the draft's heroImportUrl inside it. The 204 carries no body,
  // so the row's (changed) hero reference is re-fetched to keep the list
  // thumbnail honest; a failed import fails the publish (server message
  // echoed, the row stays a draft with the URL intact).

  it('publish with a pending hero import: the row adopts the stored image (the detail re-fetch after the 204)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_PENDING_IMPORT, GUIDANCE_PUBLISHED]));
    admin.publishGuidancePost.mockResolvedValue(undefined);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_IMPORTED_PUBLISHED);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelectorAll('tbody tr')[0]!;
    // No stored asset yet: no thumbnail before the publish.
    expect(draftRow.querySelector('img.admin-guidance-thumb')).toBeNull();

    buttonByText(draftRow.querySelector('td.admin-cell--actions')!, 'Publish')!.click();
    await settle(fixture);

    expect(admin.publishGuidancePost).toHaveBeenCalledWith(12);
    // The import ran inside the publish; the row's hero reference is the
    // re-fetched post (the 204 body carries nothing).
    expect(admin.getGuidancePost).toHaveBeenCalledWith(12, 'en');
    expect(element.querySelectorAll('tbody tr')[0]!.textContent).toContain('Published');
    expect(element.textContent).toContain('Post published.');
    // The result is shown: the stored image's thumbnail is in the row now.
    const row = element.querySelectorAll('tbody tr')[0]!;
    const thumb = row.querySelector('img.admin-guidance-thumb');
    expect(thumb?.getAttribute('src')).toBe('/api/media/deadbeefdeadbeefdeadbeefdeadbeef.jpg');
    expect(thumb?.getAttribute('alt')).toBe('Kelder, vaade sissepääsust');
  });

  it('publish WITHOUT a pending import does not re-fetch the detail (the status patch is enough)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.publishGuidancePost.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelectorAll('tbody tr')[0]!;
    buttonByText(draftRow.querySelector('td.admin-cell--actions')!, 'Publish')!.click();
    await settle(fixture);

    expect(admin.publishGuidancePost).toHaveBeenCalledWith(12);
    expect(admin.getGuidancePost).not.toHaveBeenCalled();
  });

  it('a refused import fails the publish: the server message is echoed, the row stays a draft with the URL intact', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_PENDING_IMPORT, GUIDANCE_PUBLISHED]));
    admin.publishGuidancePost.mockRejectedValue(
      apiError(400, 'heroImportUrl names a refused address', '/admin/guidance/12/publish'),
    );
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelectorAll('tbody tr')[0]!;
    buttonByText(draftRow.querySelector('td.admin-cell--actions')!, 'Publish')!.click();
    await settle(fixture);

    expect(admin.publishGuidancePost).toHaveBeenCalledWith(12);
    // The server's error message is shown (400s are echoed, the
    // error-copy convention) — and the row is still a draft (no patch,
    // no re-fetch: the import left the URL on the draft).
    expect(element.textContent).toContain('heroImportUrl names a refused address');
    expect(element.querySelectorAll('tbody tr')[0]!.textContent).toContain('Draft');
    expect(admin.getGuidancePost).not.toHaveBeenCalled();
    expect(element.textContent).not.toContain('Post published.');
  });

  it('an unreachable import (502) fails the publish with the generic 5xx copy (the error-copy convention)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_PENDING_IMPORT, GUIDANCE_PUBLISHED]));
    admin.publishGuidancePost.mockRejectedValue(
      apiError(502, 'could not be fetched', '/admin/guidance/12/publish'),
    );
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const draftRow = element.querySelectorAll('tbody tr')[0]!;
    buttonByText(draftRow.querySelector('td.admin-cell--actions')!, 'Publish')!.click();
    await settle(fixture);

    expect(element.textContent).toContain('Something went wrong. Please try again.');
    expect(element.textContent).not.toContain('could not be fetched'); // 5xx bodies are never echoed
    expect(element.querySelectorAll('tbody tr')[0]!.textContent).toContain('Draft');
    expect(admin.getGuidancePost).not.toHaveBeenCalled();
  });

  it('unpublish: the 204 flips the row in place to Draft', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
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
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
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

  // ---- translations (bilingual-guidance) ---------------------------------
  //
  // The open post's per-locale rows live in the section under the
  // editor: add a missing locale (the editor recreates in
  // translation-authoring mode — the CREATE endpoint, never update),
  // delete a foreign one (the two-tap confirm; the home-locale row is
  // never offered the trigger).

describe('translations (bilingual-guidance)', () => {
  it('the section shows the loading state while the rows load', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    // The rows load is deliberately pending — the section stays in its
    // loading state.
    admin.listGuidanceTranslations.mockReturnValue(new Promise(() => {}));
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    const row = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(row.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);

    const section = element.querySelector<HTMLElement>('.admin-guidance-translations')!;
    expect(section.querySelector('.admin-guidance-translations__state')!.textContent).toContain(
      'Loading translations',
    );
  });

  it('the section shows the empty state for a shell post with no translation rows', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.listGuidanceTranslations.mockResolvedValue([]);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    const row = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(row.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);

    const section = element.querySelector<HTMLElement>('.admin-guidance-translations')!;
    expect(section.querySelector('.admin-guidance-translations__state')!.textContent).toContain(
      'No translations yet',
    );
  });

  it('opening a post in edit mode loads its translation rows and offers only the missing locales', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.listGuidanceTranslations.mockResolvedValue(TRANSLATION_ROWS);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    const row = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(row.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);

    expect(admin.listGuidanceTranslations).toHaveBeenCalledTimes(1);
    expect(admin.listGuidanceTranslations).toHaveBeenCalledWith(11);
    const section = element.querySelector<HTMLElement>('.admin-guidance-translations')!;
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('Translations');
    // The home-locale row is marked 'home' and NEVER offered the delete;
    // the foreign row carries exactly one trigger.
    expect(section.textContent).toContain('home');
    expect(section.querySelectorAll('[data-confirm-trigger]').length).toBe(1);
    // Only the missing locale (ru) is offered for authoring.
    expect(buttonByText(section, 'Add ru translation')).not.toBeNull();
    expect(buttonByText(section, 'Add et translation')).toBeNull();
    expect(buttonByText(section, 'Add en translation')).toBeNull();
  });

  it('creating a missing translation calls the CREATE endpoint (not the update one), keeps the editor open in the ordinary edit mode, and re-loads the rows', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.listGuidanceTranslations.mockResolvedValue(TRANSLATION_ROWS);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    const row = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(row.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);

    const section = () => element.querySelector<HTMLElement>('.admin-guidance-translations')!;
    buttonByText(section(), 'Add ru translation')!.click();
    await settle(fixture);
    // The editor re-created in translation-authoring mode (heading swap) …
    expect(element.querySelector('.guidance-editor__heading')!.textContent).toContain(
      'Add a translation',
    );
    // …the prefill is valid (the shared hero + alt are paired) — save as-is.
    buttonByText(element, 'Save')!.click();
    await settle(fixture);

    expect(admin.createGuidanceTranslation).toHaveBeenCalledTimes(1);
    expect(admin.createGuidanceTranslation.mock.calls[0]![0]).toBe(11);
    expect(admin.createGuidanceTranslation.mock.calls[0]![1]).toEqual({
      locale: 'ru',
      title: GUIDANCE_PUBLISHED.title,
      body: GUIDANCE_PUBLISHED.bodyHtml,
      heroImageAlt: GUIDANCE_PUBLISHED.heroImageAlt,
    });
    expect(admin.updateGuidancePost).not.toHaveBeenCalled();
    expect(admin.createGuidancePost).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Translation created.');
    // The editor STAYED open, back in the ordinary edit mode …
    expect(element.querySelector('app-guidance-editor')).not.toBeNull();
    expect(element.querySelector('.guidance-editor__heading')!.textContent).toContain(
      'Edit guidance post',
    );
    // …and the section re-loaded the rows.
    expect(admin.listGuidanceTranslations).toHaveBeenCalledTimes(2);
  });

  it('deleting a translation is two-tap: the first tap only arms, Cancel disarms, the confirm sends the DELETE', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED);
    admin.listGuidanceTranslations
      .mockResolvedValueOnce(TRANSLATION_ROWS)
      .mockResolvedValueOnce([TRANSLATION_ROWS[0]!]);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    const row = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(row.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);

    const section = () => element.querySelector<HTMLElement>('.admin-guidance-translations')!;
    // Tap 1: arm only — the prompt is visible, nothing is sent.
    buttonByText(section(), 'Delete translation')!.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Delete the en translation of this post?');
    expect(admin.deleteGuidanceTranslation).not.toHaveBeenCalled();
    // Cancel: disarm — still nothing sent.
    buttonByText(section(), 'Cancel')!.click();
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Delete the en translation of this post?');
    expect(admin.deleteGuidanceTranslation).not.toHaveBeenCalled();
    // Tap 1 + Tap 2: the DELETE goes out (post id + locale), the success
    // shows and the rows re-load (the en row is gone from the fake).
    buttonByText(section(), 'Delete translation')!.click();
    fixture.detectChanges();
    buttonByText(section(), 'Confirm delete')!.click();
    await settle(fixture);
    expect(admin.deleteGuidanceTranslation).toHaveBeenCalledTimes(1);
    expect(admin.deleteGuidanceTranslation).toHaveBeenCalledWith(11, 'en');
    expect(element.textContent).toContain('Translation deleted.');
    expect(admin.listGuidanceTranslations).toHaveBeenCalledTimes(2);
    expect(section().textContent).not.toContain('sheltering-during-a-drone-strike');
  });

  it('deleting the row the editor is SHOWING (a foreign-locale edit) closes the editor and re-loads the list', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged([GUIDANCE_DRAFT, GUIDANCE_PUBLISHED]));
    admin.listMediaAssets.mockResolvedValue([]);
    admin.getGuidancePost.mockResolvedValue(GUIDANCE_PUBLISHED_EN);
    admin.listGuidanceTranslations.mockResolvedValue(TRANSLATION_ROWS);
    const i18nService = TestBed.inject(I18nService);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    // The content language flips to en: the list re-fetches and the
    // editor will show the EN row (post.locale 'en', homeLocale 'et').
    i18nService.setContentLocale('en');
    await settle(fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
    const row = element.querySelectorAll('tbody tr')[1]!;
    buttonByText(row.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
    await settle(fixture);
    expect(admin.getGuidancePost).toHaveBeenCalledWith(11, 'en');

    const section = () => element.querySelector<HTMLElement>('.admin-guidance-translations')!;
    buttonByText(section(), 'Delete translation')!.click();
    fixture.detectChanges();
    buttonByText(section(), 'Confirm delete')!.click();
    await settle(fixture);

    expect(admin.deleteGuidanceTranslation).toHaveBeenCalledWith(11, 'en');
    // The shown row (the content-locale row) is gone: the editor closes
    // and the list re-loads in the en scope.
    expect(element.querySelector('app-guidance-editor')).toBeNull();
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
  });
});

  // ---- editor reveal: the form is found, not hunted (scroll + focus) -------
  //
  // The editor opens at the TOP of the Guidance tab while the row that
  // triggered it may sit at the BOTTOM of a long list. An explicit
  // Edit/New therefore REVEALS the freshly rendered editor: it scrolls the
  // editor region into view and moves focus to the form's first field —
  // only AFTER the row's data is loaded and the form has rendered (edit
  // mode fetches the detail first), never on the click, and never on an
  // unrelated re-render. The scroll honours prefers-reduced-motion (the
  // repo's motion policy — page-shell.scss: the OS reduce request removes
  // the motion, the state still flips): an instant jump instead of a
  // smooth one. The open editor is visually obvious via the accent border
  // while the form has focus (the .admin-editor :focus-within rule).

  describe('editor reveal (scroll + focus after data load)', () => {
    let scrollSpy: ReturnType<typeof vi.fn>;
    /** The element a reveal scrolled — the spy's `this` (scrollIntoView is
     *  a METHOD: the receiver is not among the recorded arguments). */
    let scrolledElement: Element | null;
    const originalScrollIntoView = Element.prototype.scrollIntoView;

    beforeEach(() => {
      // jsdom does not implement scrollIntoView — stub it (and restore
      // after): the reveal specs spy on it (map-page's convention).
      scrolledElement = null;
      scrollSpy = vi.fn(function (this: Element) {
        scrolledElement = this;
      });
      Element.prototype.scrollIntoView = scrollSpy as unknown as Element['scrollIntoView'];
    });

    afterEach(() => {
      const proto = Element.prototype as { scrollIntoView?: unknown };
      if (originalScrollIntoView) {
        proto.scrollIntoView = originalScrollIntoView;
      } else {
        delete proto.scrollIntoView;
      }
      // jsdom itself has no matchMedia — remove the reduced-motion spec's
      // seam so it cannot leak into another test.
      delete (window as { matchMedia?: unknown }).matchMedia;
    });

    /** The motion seam: jsdom has NO matchMedia at all, so the test defines
     *  the property explicitly (a spy would need it to exist). */
    function stubReducedMotion(reduced: boolean): void {
      const mql = {
        matches: reduced,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockReturnValue(mql),
        configurable: true,
        writable: true,
      });
    }

    it('an Edit on the LAST row brings the editor into view and focuses it (the form is not a hunt)', async () => {
      admin.listShelters.mockResolvedValue(paged([]));
      admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS)); // 11, 13, 12
      publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
      admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
      admin.getGuidancePost.mockResolvedValue(GUIDANCE_DRAFT); // id 12's detail
      const { element, fixture } = await openAdmin();
      await switchTab('Guidance', element, fixture);

      // Nothing has scrolled or taken focus yet…
      expect(scrollSpy).not.toHaveBeenCalled();

      // The LAST row (id 12 — the bottom of the list) is the edit target.
      const rows = element.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
      buttonByText(rows[2]!.querySelector('td.admin-cell--actions')!, 'Edit')!.click();

      // The editor shows its LOADING state first (the detail fetch); the
      // reveal may only run AFTER the detail landed and the form rendered.
      await settle(fixture);
      expect(admin.getGuidancePost).toHaveBeenCalledTimes(1);
      expect(admin.getGuidancePost).toHaveBeenCalledWith(12, 'en');

      // The editor region is scrolled into view (smooth — motion is on)…
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      const region = element.querySelector('.admin-editor')!;
      expect(scrolledElement).toBe(region);
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'start', behavior: 'smooth' }),
      );
      // …and focus lands on the form's FIRST field (the title) — a
      // keyboard user starts inside the form, not somewhere arbitrary.
      expect(document.activeElement).toBe(element.querySelector<HTMLInputElement>('#ge-title')!);
    });

    it('"New post" reveals the create editor the same way (no fetch to wait for)', async () => {
      admin.listShelters.mockResolvedValue(paged([]));
      admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
      publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
      admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
      const { element, fixture } = await openAdmin();
      await switchTab('Guidance', element, fixture);

      buttonByText(element, 'New post')!.click();
      await settle(fixture);

      expect(scrollSpy).toHaveBeenCalledTimes(1);
      const region = element.querySelector('.admin-editor')!;
      expect(scrolledElement).toBe(region);
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'start', behavior: 'smooth' }),
      );
      expect(document.activeElement).toBe(element.querySelector<HTMLInputElement>('#ge-title')!);
    });

    it('an unrelated re-render (a row patch with the editor open) scrolls nothing and steals no focus', async () => {
      admin.listShelters.mockResolvedValue(paged([]));
      admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
      publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
      admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
      admin.getGuidancePost.mockResolvedValue(GUIDANCE_DRAFT);
      admin.unpublishGuidancePost.mockResolvedValue(undefined);
      const { element, fixture } = await openAdmin();
      await switchTab('Guidance', element, fixture);

      // Open the editor on the last row — the ONE legitimate reveal…
      const rows = element.querySelectorAll('tbody tr');
      buttonByText(rows[2]!.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
      await settle(fixture);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      const titleInput = element.querySelector<HTMLInputElement>('#ge-title')!;
      expect(document.activeElement).toBe(titleInput);

      // …now an UNRELATED re-render: unpublish the FIRST row (id 11) — the
      // row patches in place, the whole Guidance tab re-renders, the open
      // editor re-renders with its already-loaded post.
      const firstRow = element.querySelectorAll('tbody tr')[0]!;
      buttonByText(firstRow.querySelector('td.admin-cell--actions')!, 'Unpublish')!.click();
      await settle(fixture);

      expect(admin.unpublishGuidancePost).toHaveBeenCalledTimes(1);
      expect(admin.unpublishGuidancePost).toHaveBeenCalledWith(11);
      // No new scroll, no focus change — the form stays exactly where the
      // admin left it.
      expect(scrollSpy).toHaveBeenCalledTimes(1); // still exactly one
      expect(document.activeElement).toBe(titleInput);
    });

    it('the reveal scroll is instant under prefers-reduced-motion (the repo motion policy)', async () => {
      stubReducedMotion(true);
      admin.listShelters.mockResolvedValue(paged([]));
      admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
      publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
      admin.listMediaAssets.mockResolvedValue([MEDIA_ROW]);
      admin.getGuidancePost.mockResolvedValue(GUIDANCE_DRAFT);
      const { element, fixture } = await openAdmin();
      await switchTab('Guidance', element, fixture);

      const rows = element.querySelectorAll('tbody tr');
      buttonByText(rows[2]!.querySelector('td.admin-cell--actions')!, 'Edit')!.click();
      await settle(fixture);

      // The state still flips — the editor lands in view — but without
      // motion: 'instant', not 'smooth'.
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrolledElement).toBe(element.querySelector('.admin-editor')!);
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'start', behavior: 'instant' }),
      );
      // …and focus still lands on the form.
      expect(document.activeElement).toBe(element.querySelector<HTMLInputElement>('#ge-title')!);
    });

    it('the open editor is visually obvious while in focus (the accent border, admin-page.scss)', () => {
      const scss = readFileSync(
        `${process.cwd()}/src/app/features/admin/admin-page.scss`,
        'utf8',
      );
      const block = scss.match(/\.admin-editor \{[\s\S]*?\n\}/);
      expect(block, 'admin-page.scss must keep the .admin-editor rule').not.toBeNull();
      expect(
        block![0],
        'the editor must take the primary accent border while the form has focus',
      ).toContain(':focus-within');
      expect(block![0]).toMatch(/border-color: var\(--color-primary\)/);
    });
  });

  // ---- guidance manual ordering (guidance-manual-order D6) ------------------

  /** A third guidance row so the order has three distinct positions. */
  const GUIDANCE_THIRD: AdminGuidancePostDto = {
    ...GUIDANCE_PUBLISHED,
    id: 13,
    slug: 'kolmas-juhis',
    title: 'Kolmas juhis',
    pinned: false,
  };

  /** The server-confirmed order used by the ordering tests. */
  const ORDERED_ROWS: AdminGuidancePostDto[] = [
    GUIDANCE_PUBLISHED, // id 11
    GUIDANCE_THIRD, // id 13
    GUIDANCE_DRAFT, // id 12
  ];

  /** The row's three move buttons, in template order (top, up, down). */
  function moveButtons(row: Element): HTMLButtonElement[] {
    return Array.from(row.querySelectorAll<HTMLButtonElement>('.admin-guidance-move button'));
  }

  // (The move buttons' PRESENTATION — the three 48px buttons, the
  //  boundary disable-states, the accessible names — is pinned in
  //  guidance-order-list.spec.ts, the panel that renders them; this
  //  spec covers the same buttons through the page's DOM + gateway.)

  it('"Up" moves the row one step up, submits the FULL list, reorders in place — no reload', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    admin.reorderGuidanceOrder.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const rows = element.querySelectorAll('tbody tr');
    // Click the 'Up' button of the middle row (id 13, 'Kolmas juhis').
    const [, up] = moveButtons(rows[1]!);
    up!.click();
    await settle(fixture);

    // The full ordered id list (13 moved ahead of 11; 12 untouched).
    expect(admin.reorderGuidanceOrder).toHaveBeenCalledTimes(1);
    expect(admin.reorderGuidanceOrder).toHaveBeenCalledWith([13, 11, 12], 'en');
    // No list reload — the table reordered in place from the submitted list.
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);
    const after = element.querySelectorAll('tbody tr');
    expect(after[0]!.textContent).toContain('Kolmas juhis');
    expect(after[1]!.textContent).toContain('Varjumine droonirünnaku ajal');
    expect(element.textContent).toContain('Order saved.');
  });

  it('"To top" from the bottom row submits the list with that id first', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    admin.reorderGuidanceOrder.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const rows = element.querySelectorAll('tbody tr');
    const [toTop] = moveButtons(rows[2]!);
    toTop!.click();
    await settle(fixture);

    expect(admin.reorderGuidanceOrder).toHaveBeenCalledWith([12, 11, 13], 'en');
    const after = element.querySelectorAll('tbody tr');
    expect(after[0]!.textContent).toContain('Uus juhis (mustand)');
  });

  it('drag & drop: dragging a row onto another submits the full list with the dragged row at the target position; dragend clears the highlight', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    admin.reorderGuidanceOrder.mockResolvedValue(undefined);
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    // jsdom cannot start a native drag, so plain DragEvents carrying a
    // fake dataTransfer are dispatched at the ROWS — the panel's row
    // bindings handle them one-to-one, exactly as in a real browser.
    const dragEvent = (type: string): DragEvent => {
      const e = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(e, 'dataTransfer', {
        value: { effectAllowed: '', dropEffect: '', setData: vi.fn() },
      });
      return e;
    };

    // Drag row 1 (id 11) onto row 3 (id 12).
    const rows = element.querySelectorAll('tbody tr');
    rows[0]!.dispatchEvent(dragEvent('dragstart'));
    rows[2]!.dispatchEvent(dragEvent('dragover'));
    fixture.detectChanges();
    // The drop target is highlighted.
    expect(rows[2]!.classList.contains('admin-row--drag-over')).toBe(true);

    rows[2]!.dispatchEvent(dragEvent('drop'));
    await settle(fixture);
    // 11 moved to the last position: [13, 12, 11] — and the table
    // reordered in place from the confirmed list (no reload).
    expect(admin.reorderGuidanceOrder).toHaveBeenCalledWith([13, 12, 11], 'en');
    expect(admin.listGuidancePostsPage).toHaveBeenCalledTimes(1);

    rows[0]!.dispatchEvent(dragEvent('dragend'));
    fixture.detectChanges();
    // The highlight is gone again (the class is the observable state).
    expect(rows[2]!.classList.contains('admin-row--drag-over')).toBe(false);
  });

  it('a rejected reorder (400) keeps the last confirmed order and shows the error', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue(paged(ORDERED_ROWS));
    publicGuidance.list.mockResolvedValue([PUBLIC_POST]);
    admin.reorderGuidanceOrder.mockRejectedValueOnce(
      apiError(400, 'postIds contains unknown post ids: [77]', '/admin/guidance/order'),
    );
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);

    const rows = element.querySelectorAll('tbody tr');
    const [, up] = moveButtons(rows[1]!);
    up!.click();
    await settle(fixture);

    // The order is UNCHANGED (the server wrote nothing) …
    const after = element.querySelectorAll('tbody tr');
    expect(after[0]!.textContent).toContain('Varjumine droonirünnaku ajal');
    expect(after[1]!.textContent).toContain('Kolmas juhis');
    // … and the error is visible.
    expect(element.textContent).toContain('postIds contains unknown post ids: [77]');
  });

  // ---- media library tab (crisis-guidance D8) --------------------------------

  it('the media tab lazy-loads and renders rows (filename, dimensions, size, usage, thumbnail)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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
    admin.listShelters.mockResolvedValue(paged([]));
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

  // ---- admin table badges: compact, content-sized labels -------------------

  it('the table badges size to their content — no cell stretch, no mid-label wrap (_admin-shared.scss)', () => {
    // The .badge rule is the shared admin surface: the single source is
    // the _admin-shared.scss partial (@used by the page and every tab
    // panel that renders badges), so the pin reads the partial.
    const scss = readFileSync(
      `${process.cwd()}/src/app/features/admin/_admin-shared.scss`,
      'utf8',
    );
    const badge = scss.match(/\.badge \{[\s\S]*?\n\}/);
    expect(badge, '_admin-shared.scss must keep the .badge rule').not.toBeNull();
    const rule = badge![0];
    // The pill is exactly its label's width: the name cell's inner flex
    // wrapper (.admin-cell__name-body, the table-separator fix) is a
    // COLUMN flex, so a badge that is a direct child of it inherits the
    // container's default cross-axis stretch and renders as a FULL-WIDTH
    // bar (the owner-reported "badges are too long").
    expect(rule, 'the badge must size to its content').toMatch(/width: fit-content/);
    // …and a flex item that cannot be squeezed or grown on the main axis
    // either (row flex contexts: queue titles, action bodies).
    expect(rule, 'the badge must not stretch or shrink as a flex item').toMatch(
      /flex: 0 0 auto/,
    );
    // The label stays ONE line in every locale — the long ET/RU values are
    // long, not wrapped mid-label.
    expect(rule, 'the badge label must never wrap mid-label').toMatch(/white-space: nowrap/);
  });


/** The pagination's Next button (its text carries an &nbsp; — match on the
 *  aria-label instead of the visible text). */
function nextButton(element: HTMLElement): HTMLButtonElement {
  return Array.from(element.querySelectorAll<HTMLButtonElement>('.pagination button')).find(
    (b) => b.getAttribute('aria-label') === 'Next',
  )!;
}

// ---- paged list view state (admin-page-size / admin-guidance-search) --------

describe('AdminPage paged list view state', () => {
  it('guidance search: submit writes q to the URL, resets the page to 1; clear removes it (namespaced paging params)', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage
      .mockResolvedValueOnce({ rows: [GUIDANCE_PUBLISHED], total: 25 }) // page 1
      .mockResolvedValueOnce({ rows: [GUIDANCE_DRAFT], total: 25 }) // page 2
      .mockResolvedValueOnce({ rows: [GUIDANCE_PUBLISHED], total: 1 }) // searched page 1
      .mockResolvedValueOnce({ rows: [GUIDANCE_PUBLISHED], total: 25 }); // cleared page 1
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    // Defaults are omitted from the URL (page 1, size 20) — and the
    // admin's params are NAMESPACEd (never bare page/size — the tabs
    // share one route).
    expect(router.url).toBe('/admin');
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
    // Page 2 through the shared control.
    nextButton(element).click();
    await settle(fixture);
    expect(router.url).toContain('guidancePage=2');
    expect(router.url).not.toContain('page=2');
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 20 });
    // The search submit: the term lands in the URL AND the page resets
    // to 1 (a new filter has its own page 1).
    const input = element.querySelector<HTMLInputElement>('#guidance-search')!;
    typeValue(input, '  kelder  ', fixture);
    (element.querySelector('.admin-guidance-search') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(router.url).toContain('q=kelder');
    expect(router.url).not.toContain('guidancePage');
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({
      locale: 'en',
      q: 'kelder',
      limit: 20,
      offset: 0,
    });
    // The explicit clear: `q` is gone, the unfiltered scope is back.
    buttonByText(element, 'Clear')!.click();
    await settle(fixture);
    expect(router.url).not.toContain('q=');
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
  });

  it('guidance size change clamps the stranded page to the last page at the new size', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage
      .mockResolvedValueOnce({ rows: [GUIDANCE_PUBLISHED], total: 25 }) // page 1
      .mockResolvedValueOnce({ rows: [GUIDANCE_DRAFT], total: 25 }) // page 2
      .mockResolvedValueOnce({ rows: [GUIDANCE_PUBLISHED, GUIDANCE_DRAFT], total: 25 }); // size 100, page 1
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    nextButton(element).click();
    await settle(fixture);
    expect(router.url).toContain('guidancePage=2');
    // A size flip to 100 strands page 2 (the scope now fits ONE page) —
    // the clamp lands on page 1, never a dead page.
    const select = element.querySelector('.pagination select') as HTMLSelectElement;
    select.value = '100';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(router.url).toContain('guidanceSize=100');
    expect(router.url).not.toContain('guidancePage');
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 100, offset: 0 });
  });

  it('guidance out-of-range page: the notice + first-page action, never a bare empty list', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage
      .mockResolvedValueOnce({ rows: [], total: 25 }) // page 9 of 2 — empty server page
      .mockResolvedValueOnce({ rows: [GUIDANCE_PUBLISHED], total: 25 }); // back to page 1
    const { element, fixture } = await openAdmin();
    await router.navigate(['/admin'], { queryParams: { guidancePage: '9' } });
    await fixture.whenStable();
    await switchTab('Guidance', element, fixture);
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 160 });
    expect(element.textContent).toContain('Page 9 does not exist \u2014 the list ends at page 2.');
    buttonByText(element, 'Show the first page')!.click();
    await settle(fixture);
    expect(router.url).not.toContain('guidancePage');
    expect(admin.listGuidancePostsPage).toHaveBeenLastCalledWith({ locale: 'en', limit: 20, offset: 0 });
  });

  it('guidance manual order is offered only while the whole scope fits one page', async () => {
    admin.listShelters.mockResolvedValue(paged([]));
    admin.listGuidancePostsPage.mockResolvedValue({ rows: [GUIDANCE_PUBLISHED], total: 25 });
    const { element, fixture } = await openAdmin();
    await switchTab('Guidance', element, fixture);
    // 25 rows at 20/page = two pages: the whole reorder is off (the
    // full-list order PUT is all-rows-by-nature) — move buttons disabled,
    // the hint points at the size selector.
    const disabledBtn = element.querySelector('.admin-guidance-move button') as HTMLButtonElement;
    expect(disabledBtn.disabled).toBe(true);
    expect(element.querySelector('.admin-guidance-hint')!.textContent).toContain('100');
    // A search whose scope fits one page re-opens the gate.
    admin.listGuidancePostsPage.mockResolvedValue({ rows: [GUIDANCE_PUBLISHED], total: 1 });
    const input = element.querySelector<HTMLInputElement>('#guidance-search')!;
    typeValue(input, 'one', fixture);
    const formEl = element.querySelector('.admin-guidance-search') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const enabledBtns = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.admin-guidance-move button'),
    );
    // The single row: top/up disabled (boundary), down disabled (boundary)
    // — but the LIST is reorderable (the hint flipped back).
    expect(element.querySelector('.admin-guidance-hint')!.textContent).toContain('in this order');
    expect(enabledBtns.length).toBe(3);
  });

  it('shelters source chips are URL-backed and compose with the search (AND); the search resets the page', async () => {
    admin.listShelters.mockResolvedValue({ rows: [USER_ROW], total: 25 });
    const { element, fixture } = await openAdmin();
    await toShelters(element, fixture);
    expect(admin.listShelters).toHaveBeenLastCalledWith({ limit: 20, offset: 0 });
    // The chip writes `source` to the URL (a link/refresh keeps it) and
    // the backend receives it.
    buttonByText(element, 'Registry')!.click();
    await settle(fixture);
    expect(router.url).toContain('source=REGISTRY');
    expect(admin.listShelters).toHaveBeenLastCalledWith({ source: 'REGISTRY', limit: 20, offset: 0 });
    // Page 2 of the filtered scope…
    nextButton(element).click();
    await settle(fixture);
    expect(router.url).toContain('shelterPage=2');
    expect(admin.listShelters).toHaveBeenLastCalledWith({ source: 'REGISTRY', limit: 20, offset: 20 });
    // …the search composes WITH the chip (AND on the server) and resets
    // the page to 1.
    const page = fixture.debugElement.query(By.directive(AdminPage))!.componentInstance as AdminPage;
    page.searchQuery.setValue('kelder');
    (element.querySelector('form.admin-search') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(router.url).toContain('source=REGISTRY');
    expect(router.url).not.toContain('shelterPage');
    expect(admin.listShelters).toHaveBeenLastCalledWith({ source: 'REGISTRY', q: 'kelder', limit: 20, offset: 0 });
    // The All chip removes the filter (the param is omitted from the URL).
    buttonByText(element, 'All')!.click();
    await settle(fixture);
    expect(router.url).not.toContain('source=');
    expect(admin.listShelters).toHaveBeenLastCalledWith({ q: 'kelder', limit: 20, offset: 0 });
  });

  it('shelters out-of-range page: the notice + first-page action (the total is from the header)', async () => {
    admin.listShelters.mockResolvedValue({ rows: [], total: 25 });
    const { element, fixture } = await openAdmin();
    await router.navigate(['/admin'], { queryParams: { shelterPage: '4', shelterSize: '10' } });
    await fixture.whenStable();
    await toShelters(element, fixture);
    expect(admin.listShelters).toHaveBeenLastCalledWith({ limit: 10, offset: 30 });
    expect(element.textContent).toContain('Page 4 does not exist \u2014 the list ends at page 3.');
    buttonByText(element, 'Show the first page')!.click();
    await settle(fixture);
    expect(router.url).not.toContain('shelterPage');
    expect(router.url).toContain('shelterSize=10');
    expect(admin.listShelters).toHaveBeenLastCalledWith({ limit: 10, offset: 0 });
  });
});
});
