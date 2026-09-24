import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import localeEnGB from '@angular/common/locales/en-GB';
import { ActivatedRoute, Router, type Params } from '@angular/router';
import type {
  AdminAlertRow,
  AdminAuditRow,
  AdminShelterDto,
  AdminShelterReportDto,
  AdminUserDto,
  MediaAssetDto,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import { BannerComponent } from '../../shared/banner.component';
import { ConfirmAction } from '../../shared/confirm-action';
import { PAGE_SIZE_DEFAULT, parsePage, parseSize } from '../../shared/paging';
import { ADMIN_TAB_DEFAULT, parseAdminTab } from '../../shared/admin-tab';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { Locale } from '../../core/i18n/locale';
import { ApiError } from '../../core/api-error';
import { AlertsPanel } from './alerts-panel';
import { AuditPanel } from './audit-panel';
import { GuidancePanel } from './guidance-panel';
import { GuidanceView } from './guidance-view';
import { MediaPanel } from './media-panel';
import { PagedView } from './paged-view';
import { ReportsPanel } from './reports-panel';
import { SheltersPanel } from './shelters-panel';
import { REJECT_REASON_MAX, SheltersView } from './shelters-view';
import { SiteTextsPanel } from './site-texts-panel';
import { UnconfirmedPanel } from './unconfirmed-panel';
import { UsersPanel } from './users-panel';

registerLocaleData(localeEnGB, 'en-GB');

/** The moderation tabs: the review queue FIRST, the audit trail LAST;
 *  the Users tab sits before the authoring tabs; the guidance and
 *  media-library tabs sit before the audit. URL-backed as the `tab` param:
 *  shared/admin-tab.ts's ADMIN_TABS is this union spelled as data — a new
 *  tab lands in BOTH spellings (the admin spec pins set equality). */
export type AdminTab =
  | 'unconfirmed'
  | 'shelters'
  | 'reports'
  | 'alerts'
  | 'users'
  | 'guidance'
  | 'media'
  | 'settings'
  | 'audit';

/**
 * /admin (adminGuard — admin-kind accounts only; anonymous AND authenticated
 * non-admins are redirected home by the guard, mirroring the backend's
 * 401/403 per request). Nine tabs, each one queue; every tab is an
 * extracted presentational panel (the extracted-panel contract — the page
 * owns the state, the URL-backed views and the gateway calls; the panels
 * render and emit intents). Each list's URL→state→load seam lives one level
 * down in a page-owned view object the template feeds the panel through
 * (SheltersView, GuidanceView, and four PagedView instances for the
 * server-paged tabs) — the state survives tab switches (the lazy-load
 * rule): a visit after a load keeps the in-memory rows.
 *
 *  - UNCONFIRMED (first, default) — the community review queue: every USER
 *    row in the NEW state (client-side filter of the FULL shelters list —
 *    the queue is the whole scope, so it is deliberately un-paged; the
 *    id IS the creation order — the admin projection carries no creation
 *    timestamp). "Mark confirmed" is direct; "Reject" requires a reason
 *    (≤500 chars). Both hit POST /admin/shelters/{id}/review and refetch
 *    the shelters list (the queue recomputes from it; a 409 surfaces the
 *    server message verbatim).
 *  - SHELTERS — every row incl. hidden; USER rows actionable (Hide/
 *    Activate, Delete with a two-tap inline confirm), registry rows
 *    read-only (import-owned — the UI never offers actions for them).
 *    Name/address search (submit-on-enter, URL-backed as the tab-scoped
 *    `shelterQ`), the source chips, the shared page + size control.
 *  - SHELTER REPORTS — the report queue: shelter link, type, reporter,
 *    age, dismiss. The hide-dismissed filter is the queue's first-class
 *    control (a chip group, URL-backed as `excludeDismissed`): the
 *    DEFAULT is 'All' — dismissed rows stay in the queue, DIMMED (audit
 *    trail), nothing is hidden silently; 'Open only' scopes the list AND
 *    the page count to the open reports server-side, agreeing with the
 *    per-shelter open counts the Shelters tab's pins express. Rows whose
 *    shelter is INACTIVE get a "Restore shelter" shortcut.
 *  - ALERTS — the throttle-abuse ring (the daily submission cap 429, the
 *    per-contact OTP cap 429, the near-duplicate rejection 409), newest
 *    first. Read-only and deliberately un-paged: the ring is the
 *    backend's in-memory cap (bounded, no offset/total) — a triage view,
 *    not a durable log.
 *  - GUIDANCE — the post list (title + hero thumbnail, status, locale,
 *    pinned, published date, updated) with create / edit / publish /
 *    unpublish / delete (two-tap). The editor is the inline form (title,
 *    slug, body, hero picker + mandatory-iff-set alt, locale, pinned, and
 *    the create-mode write-and-publish choice); the body is a plain
 *    textarea over the stored (sanitized) HTML. The hero picker sees the
 *    MEDIA library's current page. The admin DTO carries NO publishedAt —
 *    the published-date column merges the permit-all public index by slug
 *    (a merge failure degrades the column to "—", never the list).
 *  - MEDIA LIBRARY — the asset inventory (newest first, paged): thumbnail,
 *    filename, dimensions, size, upload date, reused-by count; the
 *    multipart upload (field `file` — a fresh asset lands on page 1);
 *    delete is API-FIRST — the first tap calls DELETE (unreferenced → 200,
 *    row gone; referenced → 409 naming the affected posts, which arms the
 *    confirm strip that re-issues with confirm=true — never a dead end).
 *  - AUDIT (last) — the read-only moderation trail (lazy load on first
 *    switch): when / moderator / shelter / action / change / reason.
 *    Shelter names are resolved server-side (a deleted shelter reads
 *    "Deleted shelter"); the guidance/media rows read their subjectLabel
 *    snapshot in the same column.
 *  - USERS — the account list, paged: name, e-mail, kind, suspension
 *    state. Suspend is two-tap (arm + confirm, like the shelter delete)
 *    and idempotent server-side; a suspended row is dimmed with a
 *    "Suspended" badge and an Unsuspend action. Admin-kind rows are
 *    listed (the provisioned account is visible) but the Suspend action
 *    is never offered for them (backend 403 — lockout vector). Suspension
 *    stops the ACCOUNT (login/refresh/tokens), not its shelters.
 *  - SETTINGS — the site texts panel (self-contained).
 *
 * The paged lists share the URL discipline: the view IS the URL (a link
 * or a refresh keeps the view) — user-initiated view changes PUSH (back
 * navigates), hand-typed values are clamped and the URL normalized in
 * place (replaceUrl, no history entry for the cosmetic fix), defaults
 * are the param's absence (omit-defaults), and a query-param change that
 * lands mid-load re-loads (the fetch-sequence guard drops the superseded
 * response).
 *
 * Mutations update the in-memory row in place (no full refetch — the
 * backend answers 204 with no body); a rejected mutation surfaces the
 * server message through the page-level error banner (bannerMessage:
 * 403/409 echo the backend message; 401 mid-session is the global
 * interceptor's job). The review actions are the exception: they refetch
 * the shelters list so the unconfirmed queue and the Shelters tab both
 * reflect the new state.
 */
@Component({
  selector: 'app-admin-page',
  imports: [
    BannerComponent,
    TranslatePipe,
    AlertsPanel,
    AuditPanel,
    GuidancePanel,
    MediaPanel,
    ReportsPanel,
    SheltersPanel,
    SiteTextsPanel,
    UnconfirmedPanel,
    UsersPanel,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage implements OnInit, OnDestroy {
  private readonly admin = inject(AdminGateway);
  private readonly publicGuidance = inject(GuidanceGateway);
  private readonly i18n = inject(I18nService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The component's own injector — afterNextRender's injection context
   *  (the map-page's scrollRowIntoView idiom) and the destroy handle for
   *  its callbacks. */
  private readonly injector = inject(Injector);
  /** The admin tabs share ONE route — the paged lists' view (page, size,
   *  the guidance search, the shelters source) AND the active tab (`tab`)
   *  live in its query params (the URL is the state: a link or a refresh
   *  keeps the view — and the tab). */
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ---- tabs ----------------------------------------------------------------
  /** The active tab — the URL's `tab` (the one admin state the page held
   *  in memory only — a reload, a bookmark and a shared link open the same
   *  tab). Parsed from the route snapshot at construction (the initial
   *  queryParams emission then syncs this tab's list; the default tab's
   *  queue still loads in ngOnInit). Absent or illegal reads the default —
   *  the normalizer drops an illegal value, so the signal only ever holds
   *  a legal member (the template's comparisons are injection-safe by
   *  construction). */
  protected readonly tab = signal<AdminTab>(
    parseAdminTab(this.route.snapshot.queryParams['tab']) ?? ADMIN_TAB_DEFAULT,
  );

  // ---- unconfirmed (review-queue) tab ------------------------------------------
  /** The queue's source: the FULL un-paged shelters list — the queue is a
   *  filter of the WHOLE scope, so the Shelters tab's paging must not
   *  hollow it out. null = loading; [] = loaded and empty. */
  protected readonly queueRows = signal<AdminShelterDto[] | null>(null);
  /** The queue: USER rows in the NEW state (client-side filter of the
   *  full list — no extra endpoint), newest first. The backend is
   *  id-ordered (auto-increment id = creation order) and carries NO creation
   *  timestamp on the admin projection (verified against the live API), so
   *  the id IS the creation-order proxy. */
  protected readonly unconfirmedRows = computed(() =>
    (this.queueRows() ?? [])
      .filter((row) => row.source === 'USER' && row.reviewStatus === 'NEW')
      .sort((a, b) => b.id - a.id),
  );
  /** The row whose reject-reason editor is open (null = closed). */
  protected readonly rejectRowFor = signal<AdminShelterDto | null>(null);
  /** The reject reason: required (non-blank — the shared blank validator,
   *  whitespace-only passes Validators.required), at most 500 characters. */
  readonly rejectReason = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(REJECT_REASON_MAX)],
  });

  // ---- shelters tab ----------------------------------------------------------
  // The Shelters tab's state — the URL→state→load seam (the applied
  // shelterQ/source/page/size, the inline-panel and delete-confirm state,
  // the in-flight fetch-sequence guard and every row action) — lives in
  // SheltersView (shelters-view.ts): a page-owned state object the template
  // feeds the panel through, one level below the page so the loaded rows
  // survive tab switches (the lazy-load rule). Its field is declared with
  // the shared UI state below, where the feedback signals it joins are
  // initialized first.
  /** The search input (public so specs can drive it — page convention;
   *  the view owns the control). */
  get searchQuery(): FormControl<string> {
    return this.shelters.searchQuery;
  }
  /** The info-request question editor (public so specs can drive it —
   *  page convention; the view owns the control). */
  get requestMessage(): FormControl<string> {
    return this.shelters.requestMessage;
  }

  // ---- shelter-report tab ----------------------------------------------------
  /** The hide-dismissed filter (a first-class control): true = the OPEN
   *  scope (the endpoint's `excludeDismissed`) — the
   *  dismissed rows are out of the list AND of the page count, agreeing
   *  with the per-shelter open counts the Shelters tab's pins express;
   *  false = the DEFAULT 'All' — everything renders (nothing is hidden
   *  silently; the dismissed rows are dimmed). URL-backed
   *  (`excludeDismissed`, present only when true — the omit-defaults
   *  convention). The paged state (page/size/total, the rows) lives in
   *  the reports view (shared UI state below). */
  protected readonly reportExcludeDismissed = signal(false);

  // ---- alerts tab ------------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly alertsRows = signal<AdminAlertRow[] | null>(null);
  protected readonly alertsLoadError = signal<string | null>(null);

  // ---- users tab ------------------------------------------------------------------
  /** Two-tap suspend/unsuspend confirm (accessibility): the armed row
   *  id, carrying which action was armed — the shared ConfirmAction owns
   *  the state machine, the focus move and the focus restore. The paged
   *  state lives in the users view (shared UI state below). */
  protected readonly userActionConfirm = new ConfirmAction<number, 'suspend' | 'unsuspend'>(
    this.host.nativeElement,
  );

  // ---- media library tab ---------------------------------------------------------
  /** The in-use delete confirm: the armed asset id, carrying the 409's
   *  server message (naming the affected posts) — the strip re-issues the
   *  delete with confirm=true. The paged state (newest first; the
   *  guidance editor's hero picker reuses the current page of the
   *  library) lives in the media view (shared UI state below). */
  protected readonly mediaDeleteInUse = new ConfirmAction<number, string>(this.host.nativeElement);

  // ---- shared UI state ---------------------------------------------------------
  /** One in-flight mutation at a time (the row buttons all share it). */
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** The Shelters tab's URL→state→load seam: constructed here — with the
   *  shared UI state — because it joins the page's feedback (one in-flight
   *  mutation, one banner) and the cross-tab review-action refetch
   *  coordinates through it. The template feeds the panel through it; see
   *  shelters-view.ts for the URL contract. */
  protected readonly shelters = new SheltersView({
    admin: this.admin,
    i18n: this.i18n,
    route: this.route,
    router: this.router,
    host: this.host.nativeElement,
    busy: this.busy,
    error: this.error,
    success: this.success,
    clearFeedback: () => this.clearFeedback(),
    reviewRefetch: () => this.refreshShelters(),
  });

  /** The Guidance tab's URL→state→load seam (the same pattern — the post
   *  list + its search, the editor lifecycle, the translation rows):
   *  constructed here for the same reasons (the shared feedback, the
   *  state must survive tab switches). The media library the editor's
   *  hero picker reads is this page's state, handed over through the
   *  deps. See guidance-view.ts for the URL contract. */
  protected readonly guidance = new GuidanceView({
    admin: this.admin,
    publicGuidance: this.publicGuidance,
    i18n: this.i18n,
    route: this.route,
    router: this.router,
    host: this.host.nativeElement,
    injector: this.injector,
    busy: this.busy,
    error: this.error,
    success: this.success,
    clearFeedback: () => this.clearFeedback(),
    tabActive: () => this.tab() === 'guidance',
    ensureMediaLoaded: () => this.ensureMediaLoaded(),
  });

  /** The four server-paged tabs (the report queue, the accounts, the
   *  media library, the audit trail) share one shape — the URL's namespaced
   *  page/size params, the lazy-load + view-key rules, the in-flight
   *  sequence guard, the out-of-range flag — so they are four instances of
   *  the shared PagedView (see paged-view.ts); only the fetch differs.
   *  The reports instance carries the tab's extra view scope (the
   *  hide-dismissed filter) as the key's extra part. */
  protected readonly reports = new PagedView<AdminShelterReportDto>({
    pageParam: 'reportPage',
    sizeParam: 'reportSize',
    i18n: this.i18n,
    route: this.route,
    router: this.router,
    keyPart: () => String(this.reportExcludeDismissed()),
    fetch: (page, size) =>
      this.admin.listShelterReports({
        excludeDismissed: this.reportExcludeDismissed() || undefined,
        limit: size,
        offset: (page - 1) * size,
      }),
  });
  protected readonly users = new PagedView<AdminUserDto>({
    pageParam: 'userPage',
    sizeParam: 'userSize',
    i18n: this.i18n,
    route: this.route,
    router: this.router,
    fetch: (page, size) => this.admin.listUsers({ limit: size, offset: (page - 1) * size }),
  });
  protected readonly media = new PagedView<MediaAssetDto>({
    pageParam: 'mediaPage',
    sizeParam: 'mediaSize',
    i18n: this.i18n,
    route: this.route,
    router: this.router,
    fetch: (page, size) => this.admin.listMediaAssets({ limit: size, offset: (page - 1) * size }),
  });
  protected readonly audit = new PagedView<AdminAuditRow>({
    pageParam: 'auditPage',
    sizeParam: 'auditSize',
    i18n: this.i18n,
    route: this.route,
    router: this.router,
    fetch: (page, size) => this.admin.listAudit({ limit: size, offset: (page - 1) * size }),
  });

  /** The view IS the URL: every emission (the initial navigation and every
   *  query change — a page/size flip, a chip, a search submit, a
   *  back-button step) parses the paged lists' params, normalizes a
   *  hand-typed value in place (replaceUrl — no history entry for the
   *  cosmetic fix) and re-loads the ACTIVE tab's list when its own params
   *  actually changed (the other tab's params are inert while it is
   *  off-screen). The initial emission loads nothing: the default tab's
   *  queue loads in ngOnInit, and an off-tab list follows the lazy-load
   *  rule on first switch. Unsubscribed in ngOnDestroy. */
  private readonly querySub = this.route.queryParams.subscribe((params) =>
    this.onQueryChange(params),
  );

  /** Parse + normalize the paged lists' params, then sync the active
   *  tab (the public guidance page's idiom, applied per tab). */
  private onQueryChange(params: Params): void {
    if (this.normalizeListParams(params)) {
      return; // the normalized URL re-emits and loads there
    }
    // The active tab (the URL's `tab` — absent reads the default; an
    // illegal value was just normalized out): a URL step that lands on
    // another tab (back/forward, a hand-edited link) applies the same
    // switch a click does — minus the URL write (we are already where
    // the URL says).
    const tab = parseAdminTab(params['tab']) ?? ADMIN_TAB_DEFAULT;
    if (tab !== this.tab()) {
      this.applyTab(tab);
      return;
    }
    switch (tab) {
      case 'guidance':
        this.guidance.syncFromParams(params, false);
        break;
      case 'shelters':
        this.shelters.syncFromParams(params, false);
        break;
      case 'reports':
        this.syncReports(params, false);
        break;
      case 'users':
        this.users.syncFromParams(params, false);
        break;
      case 'media':
        this.media.syncFromParams(params, false);
        break;
      case 'audit':
        this.audit.syncFromParams(params, false);
        break;
    }
  }

  /** A raw value that is not a legal member of the domain (non-numeric,
   *  a size outside 10..100 or off the step of 10, a page below 1, a
   *  source outside the chips' vocabulary) is clamped to the nearest
   *  legal value and the URL is normalized in place (replaceUrl), so the
   *  control and the URL can never quietly disagree. Returns true when a
   *  normalization navigation was issued. */
  private normalizeListParams(params: Params): boolean {
    const canonical: Record<string, string> = { ...params };
    let dirty = false;
    const check = (
      pageRaw: string | null,
      sizeRaw: string | null,
      pName: string,
      sName: string,
    ) => {
      const page = parsePage(pageRaw);
      const size = parseSize(sizeRaw);
      if (page > 1) {
        canonical[pName] = String(page);
      } else {
        delete canonical[pName];
      }
      if (size !== PAGE_SIZE_DEFAULT) {
        canonical[sName] = String(size);
      } else {
        delete canonical[sName];
      }
      if (
        (pageRaw !== null && String(page) !== pageRaw) ||
        (sizeRaw !== null && String(size) !== sizeRaw)
      ) {
        dirty = true;
      }
    };
    check(
      params['guidancePage'] ?? null,
      params['guidanceSize'] ?? null,
      'guidancePage',
      'guidanceSize',
    );
    check(
      params['shelterPage'] ?? null,
      params['shelterSize'] ?? null,
      'shelterPage',
      'shelterSize',
    );
    check(params['reportPage'] ?? null, params['reportSize'] ?? null, 'reportPage', 'reportSize');
    check(params['userPage'] ?? null, params['userSize'] ?? null, 'userPage', 'userSize');
    check(params['mediaPage'] ?? null, params['mediaSize'] ?? null, 'mediaPage', 'mediaSize');
    check(params['auditPage'] ?? null, params['auditSize'] ?? null, 'auditPage', 'auditSize');
    // `source`: the chips' vocabulary is REGISTRY/USER. Anything else — a
    // hand-typed 'ALL' (the no-filter default), a stale pre-lane enum value
    // (PAASETEAMET), garbage — sanitizes to the no-filter default in the
    // request (parseSourceFilter), and the no-filter default is the
    // ABSENCE of the param (the omit-defaults convention), so the stray
    // value is dropped from the URL rather than kept (the URL must not
    // read `source=BOGUS` while the list renders unfiltered).
    const sourceRaw = params['source'] ?? null;
    if (sourceRaw !== null && sourceRaw !== 'REGISTRY' && sourceRaw !== 'USER') {
      delete canonical['source'];
      dirty = true;
    }
    // `excludeDismissed`: the report queue's hide-dismissed filter. Only
    // the literal 'true' is the open scope; anything else — a hand-typed
    // 'false', garbage — sanitizes to the default ('All'), and the
    // default is the ABSENCE of the param (the omit-defaults convention),
    // so the stray value is dropped from the URL.
    const excludeRaw = params['excludeDismissed'] ?? null;
    if (excludeRaw !== null && excludeRaw !== 'true') {
      delete canonical['excludeDismissed'];
      dirty = true;
    }
    // `tab`: the active tab. The default's URL form is the param's ABSENCE
    // (omit-defaults) and anything outside the tabs' vocabulary is dropped
    // — the page falls back to the default tab and the URL reads it back
    // clean (the same discipline as `source` and `excludeDismissed`).
    const tabRaw = params['tab'] ?? null;
    if (tabRaw !== null && (tabRaw === ADMIN_TAB_DEFAULT || parseAdminTab(tabRaw) === null)) {
      delete canonical['tab'];
      dirty = true;
    }
    if (dirty) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: canonical,
        replaceUrl: true,
      });
      return true;
    }
    return false;
  }

  /** The Reports tab's view sync: the tab's scope signal (the filter)
   *  lands from the URL first — it is part of the view's last-applied
   *  key, so the page/size read must see it — then the paged sync
   *  (loading when `firstVisit` or the view changed; the sequence guard
   *  drops a superseded in-flight response). */
  private syncReports(params: Params, firstVisit: boolean): void {
    this.reportExcludeDismissed.set(params['excludeDismissed'] === 'true');
    this.reports.syncFromParams(params, firstVisit);
  }

  ngOnDestroy(): void {
    this.guidance.destroy();
    this.querySub.unsubscribe();
  }

  // -------------------------------------------------------------------------
  // Language control
  // -------------------------------------------------------------------------

  /**
   * The "Content language" select (the Guidance tab — with the content it
   *  scopes): the guidance content language. Persists under its own key
   *  (I18nService.setContentLocale — the UI language is untouched). The
   *  switch's invalidation / re-fetch / editor-close rules live in the
   *  view (see guidance-view.ts). */
  onContentLanguageChange(event: Event): void {
    this.guidance.setContentLocale((event.target as HTMLSelectElement).value as Locale);
  }

  ngOnInit(): void {
    // The Unconfirmed tab (the default) filters the FULL shelters list —
    // that list loads immediately (the queue stays warm for every active
    // tab); the Shelters tab's paged view and the other tabs load lazily
    // on first switch (a visit after a load keeps the in-memory rows —
    // the queue does not refetch itself).
    this.loadQueue();
  }

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------
  /** The tab button's intent: apply the switch, then write the active
   *  tab to the URL — a PUSH (a user-initiated switch is back-
   *  navigable; the back button returns the previous tab and its view).
   *  The clamping of a hand-typed `tab` is the normalizer's replaceUrl
   *  half — no history entry for the cosmetic fix. */
  switchTab(tab: AdminTab): void {
    this.applyTab(tab);
    this.navigateTab(tab);
  }

  /** The switch's shared half — a click and a URL step (back/forward,
   *  a hand-edited link) both apply it: the UI-state reset (feedback,
   *  the inline panels, the armed confirms) and the tab's list sync
   *  (firstVisit — the lazy-load rule). The URL step does not write the
   *  URL back (it already says where we are). */
  private applyTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.clearFeedback();
    this.shelters.closeHistory();
    this.shelters.closeInfo();
    this.shelters.closeInaccurate();
    this.guidance.closeEditor();
    this.guidance.deleteConfirm.disarm();
    this.mediaDeleteInUse.disarm();
    this.userActionConfirm.disarm();
    switch (tab) {
      case 'shelters':
        this.shelters.syncFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'reports':
        this.syncReports(this.route.snapshot.queryParams, true);
        break;
      case 'alerts':
        if (this.alertsRows() === null && this.alertsLoadError() === null) {
          this.loadAlerts();
        }
        break;
      case 'users':
        this.users.syncFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'guidance':
        this.guidance.syncFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'media':
        this.media.syncFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'audit':
        this.audit.syncFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'unconfirmed':
        break; // filters the full list, which loaded in ngOnInit
    }
  }

  /** Write the active tab to the URL (merging the other tabs' params —
   *  they survive the switch; the tabs share one route). The default
   *  tab's form is the param's ABSENCE (omit-defaults); a click on the
   *  already-active tab lands on the same URL — the router skips a
   *  same-URL navigation, so a no-op click adds no history entry. */
  private navigateTab(tab: AdminTab): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (tab === ADMIN_TAB_DEFAULT) {
      delete params['tab'];
    } else {
      params['tab'] = tab;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  // -------------------------------------------------------------------------
  // Unconfirmed (review-queue) tab
  // -------------------------------------------------------------------------
  /** The queue's source: the FULL un-paged shelters list (the queue is a
   *  filter of the whole scope — the Shelters tab's paging must not
   *  hollow it out). The error state is shared with the Shelters tab
   *  (one endpoint, one banner). */
  loadQueue(): void {
    this.queueRows.set(null);
    this.shelters.loadError.set(null);
    this.admin
      .listShelters()
      .then((page) => this.queueRows.set(page.rows))
      .catch((error: unknown) =>
        this.shelters.loadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key))),
      );
  }
  /** "Mark confirmed": direct, no reason (POST /admin/shelters/{id}/review).
   *  The shelters list refetches so both this queue and the Shelters tab
   *  show the new state. */
  async confirmRow(row: AdminShelterDto): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.reviewShelter(row.id, { action: 'CONFIRM' });
      this.success.set(this.i18n.t('admin.shelters.success.confirmed'));
      await this.refreshShelters();
    } catch (error) {
      // A 409 (the row moved since this list load) surfaces the server
      // message verbatim — the admin reloads and re-acts.
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /** Open the inline reject-reason editor for the row. */
  openRejectEditor(row: AdminShelterDto): void {
    this.clearFeedback();
    this.rejectReason.reset('');
    this.rejectRowFor.set(row);
  }

  cancelReject(): void {
    this.rejectRowFor.set(null);
  }

  /** "Reject": the reason is REQUIRED (non-blank, ≤500). On success the
   *  editor closes and the shelters list refetches (the queue recomputes). */
  async rejectRow(row: AdminShelterDto): Promise<void> {
    const reason = this.rejectReason.value.trim();
    if (reason === '' || reason.length > REJECT_REASON_MAX) {
      this.rejectReason.markAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.reviewShelter(row.id, { action: 'REJECT', reason });
      this.success.set(this.i18n.t('admin.shelters.success.rejected'));
      this.rejectRowFor.set(null);
      await this.refreshShelters();
    } catch (error) {
      // The editor STAYS open on failure (the admin keeps the reason).
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Review-action refetch (cross-tab)
  // -------------------------------------------------------------------------
  /** The review actions' refetch — the Unconfirmed tab's confirm/reject,
   *  and the Shelters tab's request-info / mark-inaccurate /
   *  clear-inaccurate row actions (which trigger it through the view):
   *  the queue's full list always (the action changed the queue's
   *  scope), the Shelters tab's page when it is loaded (both views of
   *  the same endpoint — kept quiet, no loading flash over an
   *  already-rendered list; the paged leg's fetch-sequence guard lives
   *  with the view, so a URL-driven load in flight supersedes it). */
  private async refreshShelters(): Promise<void> {
    const page = await this.admin.listShelters();
    this.queueRows.set(page.rows);
    await this.shelters.refreshPagedView();
  }

  // -------------------------------------------------------------------------
  // Shelter-report tab
  // -------------------------------------------------------------------------
  /** The hide-dismissed filter chips' intent: write `excludeDismissed`
   *  to the URL (a link or refresh keeps the scope), which re-loads the
   *  queue in the new scope at page 1 (a scope change voids the page
   *  number — the old one would often land out-of-range). The default
   *  ('All') is the ABSENCE of the param. */
  onReportFilterChange(excludeDismissed: boolean): void {
    if (excludeDismissed === this.reportExcludeDismissed()) {
      return;
    }
    this.clearFeedback();
    this.reports.navigate({
      page: 1,
      extra: { excludeDismissed: excludeDismissed ? 'true' : null },
    });
  }

  /** Mark the report resolved (204, idempotent). With the DEFAULT scope
   *  ('All') the row stays, dimmed (the audit trail — the admin sees
   *  what was resolved); with the OPEN scope the row leaves the list AND
   *  the (open) total — the list and the pin counts stay in agreement. */
  async dismissReport(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.dismissShelterReport(id);
      if (this.reportExcludeDismissed()) {
        this.reports.rows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
        this.reports.total.update((t) => Math.max(0, t - 1));
      } else {
        this.reports.rows.update((rows) =>
          (rows ?? []).map((r) => (r.id === id ? { ...r, dismissed: true } : r)),
        );
      }
      this.success.set(this.i18n.t('admin.reports.success.dismissed'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /** "Restore shelter" shortcut on a report row whose shelter is INACTIVE —
   *  the same manual-restore endpoint as the Shelters tab. Both in-memory
   *  caches (the report row's shelterStatus AND the shelter row, when
   *  loaded) are kept in sync. */
  async restoreShelter(shelterId: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.setShelterStatus(shelterId, 'ACTIVE');
      this.reports.rows.update((rows) =>
        (rows ?? []).map((r) =>
          r.shelterId === shelterId ? { ...r, shelterStatus: 'ACTIVE' } : r,
        ),
      );
      this.shelters.patchShelter(shelterId, { status: 'ACTIVE' });
      this.success.set(this.i18n.t('admin.shelters.success.restored'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Alerts tab
  // -------------------------------------------------------------------------
  loadAlerts(): void {
    this.alertsRows.set(null);
    this.alertsLoadError.set(null);
    this.admin
      .listAlerts()
      .then((rows) => this.alertsRows.set(rows))
      .catch((error: unknown) =>
        this.alertsLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key))),
      );
  }

  // -------------------------------------------------------------------------
  // Users tab
  // -------------------------------------------------------------------------
  /** The accounts list load — the view's load plus the tab's own rule:
   *  a reload disarms the armed suspend confirm (the row it targeted may
   *  have moved pages). */
  loadUsers(): void {
    this.userActionConfirm.disarm();
    this.users.load();
  }

  /** Step 1 of the two-tap confirm: arm the confirm strip for the row. */
  requestUserAction(id: number, action: 'suspend' | 'unsuspend'): void {
    this.clearFeedback();
    this.userActionConfirm.arm(id, action);
  }

  cancelUserAction(): void {
    this.userActionConfirm.cancel();
  }

  /**
   * Step 2: POST /admin/users/{id}/suspend | unsuspend (204, idempotent).
   * The row patches in place (suspendedAt set/cleared) so the badge and the
   * action label flip without a refetch.
   */
  async confirmUserAction(id: number, action: 'suspend' | 'unsuspend'): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      if (action === 'suspend') {
        await this.admin.suspendUser(id);
      } else {
        await this.admin.unsuspendUser(id);
      }
      this.patchUser(id, { suspendedAt: action === 'suspend' ? new Date().toISOString() : null });
      this.success.set(
        this.i18n.t(
          action === 'suspend'
            ? 'admin.users.success.suspended'
            : 'admin.users.success.unsuspended',
        ),
      );
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.userActionConfirm.disarm();
      this.busy.set(false);
    }
  }

  private patchUser(id: number, patch: Partial<AdminUserDto>): void {
    this.users.rows.update((rows) => (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // -------------------------------------------------------------------------
  // Media library tab
  // -------------------------------------------------------------------------

  /** The editor's hero picker reads the library's current page — load it
   *  when the media tab hasn't loaded it yet (the same lazy rule, no
   *  double fetch). The view's `ensureMediaLoaded` dep calls this. */
  private ensureMediaLoaded(): void {
    if (this.media.rows() === null && this.media.loadError() === null) {
      this.media.load();
    }
  }

  /** The file input's chosen file (the media panel resets the input value
   *  FIRST — the same file stays re-selectable): hand it to the upload. */
  onMediaFileChosen(file: File): void {
    void this.uploadMediaFile(file);
  }

  /**
   * POST /admin/media (multipart, field `file`) -> 201 with the stored
   *  asset (the generated name — the client's filename is display metadata
   *  only). The inventory is NEWEST FIRST: on page 1 the new asset
   *  prepends to the page (total +1); on a later page the jump to page 1
   *  (URL write) re-loads so the new row and the total agree with the
   *  server. A rejected upload (400 unsupported / declared-type mismatch,
   *  413 over the cap — the message names the cap) surfaces the server
   *  message through the page banner — the shared error-copy convention.
   */
  async uploadMediaFile(file: File): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      const asset = await this.admin.uploadMediaAsset(file);
      if (this.media.page() > 1) {
        // Newest-first: the fresh asset lands on page 1 — jump there (the
        // query emission re-loads the first page).
        this.media.navigate({ page: 1 });
      } else {
        this.media.rows.update((rows) => [asset, ...(rows ?? [])]);
        this.media.total.update((t) => t + 1);
      }
      this.success.set(this.i18n.t('admin.media.success.uploaded'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * First tap of the media delete: the API decides — an UNREFERENCED asset
   * deletes straight (200, the row goes); a still-referenced one answers
   * 409 naming the affected posts, which arms the confirm strip (the
   *  re-issue with confirm=true) instead of being a dead end.
   */
  async requestMediaDelete(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      const deleted = await this.admin.deleteMediaAsset(id, false);
      this.media.rows.update((rows) => (rows ?? []).filter((r) => r.id !== deleted.id));
      // The (un-paged) library size shrinks — the page count follows
      // (a page left past the end shows the out-of-range notice).
      this.media.total.update((t) => Math.max(0, t - 1));
      this.success.set(this.i18n.t('admin.media.success.deleted'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Still referenced: the 409 message names the affected posts —
        // it is echoed in the confirm strip after the fixed copy.
        this.mediaDeleteInUse.arm(id, error.message);
      } else {
        this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      }
    } finally {
      this.busy.set(false);
    }
  }

  cancelMediaDelete(): void {
    this.mediaDeleteInUse.cancel();
  }

  /**
   * Second tap: DELETE /admin/media/{id}?confirm=true -> 200 (the
   *  pre-delete snapshot). Every referencing post loses BOTH
   *  hero_image_id and hero_image_alt in the same transaction (the posts
   *  still render, with no image) — the affected posts' rows here show
   *  the lost hero on the next list load, so the guidance list refreshes
   *  when it is loaded.
   */
  async confirmMediaDelete(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      const deleted = await this.admin.deleteMediaAsset(id, true);
      this.media.rows.update((rows) => (rows ?? []).filter((r) => r.id !== deleted.id));
      // The (un-paged) library size shrinks — the page count follows
      // (a page left past the end shows the out-of-range notice).
      this.media.total.update((t) => Math.max(0, t - 1));
      this.success.set(this.i18n.t('admin.media.success.deleted'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.mediaDeleteInUse.disarm();
      this.busy.set(false);
    }
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
