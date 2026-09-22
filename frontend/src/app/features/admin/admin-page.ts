import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  OnDestroy,
  afterNextRender,
  computed,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import localeEnGB from '@angular/common/locales/en-GB';
import { ActivatedRoute, Router, type Params } from '@angular/router';
import type {
  AdminAlertKind,
  AdminAlertRow,
  AdminAuditAction,
  AdminAuditRow,
  AdminGuidancePostDto,
  AdminShelterDto,
  AdminShelterHistoryEvent,
  AdminShelterReportDto,
  AdminUserDto,
  GuidanceStatus,
  GuidanceTranslationDto,
  MediaAssetDto,
  ShelterSourceFilter,
  ShelterStatus,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import { BannerComponent } from '../../shared/banner.component';
import { ConfirmAction } from '../../shared/confirm-action';
import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZES,
  clampPage,
  lastPage,
  parsePage,
  parseSize,
} from '../../shared/paging';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { Locale } from '../../core/i18n/locale';
import { LOCALES } from '../../core/i18n/locale';
import { ApiError } from '../../core/api-error';
import type { GuidanceEditorSave } from './guidance-editor';
import { AlertsPanel } from './alerts-panel';
import { AuditPanel } from './audit-panel';
import { GuidancePanel } from './guidance-panel';
import { MediaPanel } from './media-panel';
import { ReportsPanel } from './reports-panel';
import { SheltersPanel } from './shelters-panel';
import { SiteTextsPanel } from './site-texts-panel';
import { UnconfirmedPanel } from './unconfirmed-panel';
import { UsersPanel } from './users-panel';

registerLocaleData(localeEnGB, 'en-GB');

/** The moderation tabs: the review queue FIRST, the audit trail LAST
 *  (community-review-queue); the Users tab sits before the authoring tabs;
 *  the guidance (crisis-guidance D8) and media-library tabs sit before the
 *  audit. */
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

/** The reject reason's hard limit — mirrored by the backend contract
 *  (community-review-queue): required, at most 500 characters. */
export const REJECT_REASON_MAX = 500;

/** The info-request question's hard limit — mirrored by the backend
 *  contract (V19 column bound): required, at most 2000. */
export const INFO_REQUEST_MAX = 2000;

/**
 * /admin (adminGuard — admin-kind accounts only; anonymous AND authenticated
 * non-admins are redirected home by the guard, mirroring the backend's
 * 401/403 per request). Nine tabs, each one queue; every tab is an
 * extracted presentational panel component (the extracted-panel contract —
 * the page owns the state, the URL-backed views and the gateway calls;
 * the panels render and emit intents):
 *
 *  - UNCONFIRMED (first, default) — the community review queue: every USER
 *    row in the NEW state (client-side filter of the FULL shelters list —
 *    the unconfirmed subset IS the queue, newest first; deliberately
 *    un-paged: the queue filters the whole scope, so the Shelters tab's
 *    paging must not hollow it out). "Mark confirmed" is
 *    direct; "Reject" requires a reason (≤500 chars). Confirm/reject hit
 *    POST /admin/shelters/{id}/review and refresh the shelters list (the
 *    queue recomputes from it; a 409 surfaces the server message verbatim).
 *  - SHELTERS — every row incl. hidden; USER rows actionable (Hide/Activate,
 *    Delete with a two-tap inline confirm), registry rows read-only (D4:
 *    import-owned — the UI never offers actions for them). Name/address
 *    search (submit-on-enter), the source chips, the shared page + size
 *    control (the first adopter of the admin's list-page-paging
 *    follow-up).
 *  - SHELTER REPORTS — the report queue: shelter link, type, reporter, age,
 *    dismiss. The hide-dismissed filter is the queue's first-class control
 *    (a chip group, URL-backed as `excludeDismissed`): the DEFAULT is 'All'
 *    — dismissed rows stay in the queue, DIMMED (audit trail — the admin
 *    sees what was resolved), nothing is hidden silently; 'Open only'
 *    scopes the list AND the page count to the open reports server-side,
 *    agreeing with the per-shelter open counts the Shelters tab's pins
 *    express (W2-A). The list pages on the shared control (server-side
 *    limit/offset, X-Total-Count). Rows whose shelter is INACTIVE get a
 *    "Restore shelter" shortcut.
 *  - ALERTS — the throttle-abuse ring (abuse-limits): the
 *    daily submission cap (429), the per-contact OTP cap (429) and the
 *    near-duplicate rejection (409), newest first. Read-only and
 *    deliberately un-paged: the ring is the backend's in-memory cap
 *    (limit-bounded, no offset/total) — a triage view, not a durable log.
 *  - GUIDANCE (crisis-guidance D8) — the post list (title + hero
 *    thumbnail, status, locale, pinned, published date, updated) with
 *    create / edit / publish / unpublish / delete (two-tap), paged on the
 *    shared control. The editor is the inline GuidanceEditor form (title,
 *    slug, body, hero picker + mandatory-iff-set alt, locale, pinned, and
 *    the create-mode write-and-publish choice); the body is a plain
 *    textarea over the stored (sanitized) HTML. The hero picker sees the
 *    MEDIA library's current page (the library is paged too). The admin
 *    DTO carries NO publishedAt — the published-date column merges the
 *    permit-all public index by slug (a merge failure degrades the column
 *    to "—", never the list).
 *  - MEDIA LIBRARY (crisis-guidance D8) — the asset inventory (newest
 *    first, paged on the shared control): thumbnail, filename, dimensions,
 *    size, upload date, reused-by count; the multipart upload (field
 *    `file` — a fresh asset lands on page 1); delete is API-FIRST — the
 *    first tap calls DELETE (unreferenced → 200, row gone; referenced →
 *    409 naming the affected posts, which arms the confirm strip that
 *    re-issues with confirm=true — never a dead end).
 *  - AUDIT (last) — the read-only moderation trail, paged on the shared
 *    control (lazy load on first switch): when / moderator / shelter /
 *    action / change / reason. Shelter names are resolved server-side (a
 *    deleted shelter reads "Deleted shelter"); the guidance/media rows
 *    (D12) read their subjectLabel snapshot in the same column.
 *  - USERS (before the authoring tabs) — the account list, paged on the
 *    shared control: name, e-mail, kind, suspension state. Suspend is
 *    two-tap (arm + confirm, like the shelter delete) and idempotent
 *    server-side; a suspended row is dimmed with a "Suspended" badge and
 *    an Unsuspend action. Admin-kind rows are listed (the provisioned
 *    account is visible) but the Suspend action is never offered for them
 *    (backend 403 — lockout vector). Suspension stops the ACCOUNT
 *    (login/refresh/tokens), not its shelters.
 *  - SETTINGS — the site texts panel (self-contained).
 *
 * Mutations update the in-memory row in place (no full refetch — the backend
 * answers 204 with no body); a rejected mutation surfaces the server message
 * through the page-level error banner (bannerMessage: 403/409 echo the
 * backend message; 401 mid-session is the global interceptor's job). The
 * review actions are the exception: they refetch the shelters list so the
 * unconfirmed queue and the Shelters tab both reflect the new state.
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
   *  the guidance search, the shelters source) lives in its query params
   *  (the URL is the state: a link or a refresh keeps the view). */
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ---- tabs ----------------------------------------------------------------
  protected readonly tab = signal<AdminTab>('unconfirmed');

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
  /** The Shelters tab's current PAGE (server-paged — the owner's
   *  list-page-paging follow-up): null = loading; [] = loaded and empty.
   *  The un-paged queue lives in queueRows (the Unconfirmed tab). */
  protected readonly shelterRows = signal<AdminShelterDto[] | null>(null);
  protected readonly shelterLoadError = signal<string | null>(null);
  /** The active name/address search term (set on submit — the server does
   *  the substring match). It stays a tab-local control: the paged view's
   *  URL-backed params are the source filter, page and size. */
  protected readonly shelterQuery = signal('');
  /** Search input (public so specs can drive it — page convention). */
  readonly searchQuery = new FormControl('', { nonNullable: true });
  /** The source filter chip (All / Registry / Community — the
   *  frontend-facing grouping the backend speaks), URL-backed (`source`). */
  protected readonly shelterSource = signal<ShelterSourceFilter>('ALL');
  protected readonly shelterPage = signal(1);
  protected readonly shelterSize = signal(PAGE_SIZE_DEFAULT);
  /** The un-paged (filtered) total (X-Total-Count) and the derived page
   *  count / out-of-range flag — a past-the-end page renders an explicit
   *  notice, never a bare empty list. */
  protected readonly shelterTotal = signal(0);
  protected readonly shelterPages = computed(() =>
    lastPage(this.shelterTotal(), this.shelterSize()),
  );
  protected readonly shelterOutOfRange = computed(
    () => this.shelterTotal() > 0 && this.shelterPage() > this.shelterPages(),
  );
  /** The selectable sizes — the range the endpoint serves (limit 1..200
   *  honours all of 10..100 step 10, so the control never offers a size
   *  the backend would refuse). */
  protected readonly pageSizes = PAGE_SIZES;

  // ---- shelter history ---------------------------------------------------------
  /** The row whose inline history panel is open (null = closed). */
  protected readonly historyFor = signal<number | null>(null);
  /** The open panel's events — null = loading, [] = loaded and empty. */
  protected readonly historyEvents = signal<AdminShelterHistoryEvent[] | null>(null);

  // ---- info request ---------------------------------------------------------------
  /** The row whose inline info-request panel is open (null = closed). */
  protected readonly infoFor = signal<number | null>(null);
  /** The question editor: required (non-blank — the shared blank validator),
   *  at most 2000 characters (the V19 bound). */
  readonly requestMessage = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(INFO_REQUEST_MAX)],
  });

  // ---- mark inaccurate -------------------------------------------------------------
  /** The row whose inline mark-inaccurate editor is open (null = closed).
   *  Only opened for UNMARKED USER rows — a marked row shows the clear
   *  action directly, no editor. */
  protected readonly inaccurateFor = signal<number | null>(null);
  /** The optional reason editor (at most 500 characters — the
   *  moderation_actions.reason bound; blank/absent stores NULL on the
   *  audit row). */
  readonly inaccurateReason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(REJECT_REASON_MAX)],
  });

  // ---- shelter-report tab ----------------------------------------------------
  protected readonly reportRows = signal<AdminShelterReportDto[] | null>(null);
  protected readonly reportLoadError = signal<string | null>(null);
  /** The hide-dismissed filter (the owner's first-class control):
   *  true = the OPEN scope (the endpoint's `excludeDismissed`) — the
   *  dismissed rows are out of the list AND of the page count, agreeing
   *  with the per-shelter open counts the Shelters tab's pins express
   *  (W2-A); false = the DEFAULT 'All' — everything renders (nothing is
   *  hidden silently; the dismissed rows are dimmed). URL-backed
   *  (`excludeDismissed`, present only when true — the omit-defaults
   *  convention). */
  protected readonly reportExcludeDismissed = signal(false);
  protected readonly reportPage = signal(1);
  protected readonly reportSize = signal(PAGE_SIZE_DEFAULT);
  /** The un-paged (filtered) total (X-Total-Count — the OPEN count when
   *  the filter is on) and the derived page count / out-of-range flag. */
  protected readonly reportTotal = signal(0);
  protected readonly reportPages = computed(() => lastPage(this.reportTotal(), this.reportSize()));
  protected readonly reportOutOfRange = computed(
    () => this.reportTotal() > 0 && this.reportPage() > this.reportPages(),
  );

  // ---- audit tab ---------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly auditRows = signal<AdminAuditRow[] | null>(null);
  protected readonly auditLoadError = signal<string | null>(null);
  /** The paged view (the owner's "every admin list pages" rule): the
   *  un-paged trail length (X-Total-Count) and the derived page count /
   *  out-of-range flag. */
  protected readonly auditPage = signal(1);
  protected readonly auditSize = signal(PAGE_SIZE_DEFAULT);
  protected readonly auditTotal = signal(0);
  protected readonly auditPages = computed(() => lastPage(this.auditTotal(), this.auditSize()));
  protected readonly auditOutOfRange = computed(
    () => this.auditTotal() > 0 && this.auditPage() > this.auditPages(),
  );

  // ---- alerts tab ------------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly alertsRows = signal<AdminAlertRow[] | null>(null);
  protected readonly alertsLoadError = signal<string | null>(null);

  // ---- users tab ------------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly userRows = signal<AdminUserDto[] | null>(null);
  protected readonly userLoadError = signal<string | null>(null);
  /** The paged view (the owner's "every admin list pages" rule): the
   *  un-paged population (X-Total-Count) and the derived page count /
   *  out-of-range flag. */
  protected readonly userPage = signal(1);
  protected readonly userSize = signal(PAGE_SIZE_DEFAULT);
  protected readonly userTotal = signal(0);
  protected readonly userPages = computed(() => lastPage(this.userTotal(), this.userSize()));
  protected readonly userOutOfRange = computed(
    () => this.userTotal() > 0 && this.userPage() > this.userPages(),
  );
  /** Two-tap suspend/unsuspend confirm (accessibility): the armed row
   *  id, carrying which action was armed — the shared ConfirmAction owns the
   *  state machine, the focus move and the focus restore. */
  protected readonly userActionConfirm = new ConfirmAction<number, 'suspend' | 'unsuspend'>(
    this.host.nativeElement,
  );

  // ---- guidance tab (crisis-guidance D8) -------------------------------------
  /** The admin's CONTENT language (admin-locale-scope + admin-locale-
   *  split): the guidance list, detail fetches, saves and reorders all
   *  scope to it — the template renders it in the "posts in {locale}"
   *  line and the scoped empty state, and the Settings panel's "Content
   *  language" select renders it. It defaults to the UI language on
   *  first entry, then persists independently. */
  protected readonly contentLocale = this.i18n.contentLocale;
  /** The supported locales — the content-language select renders from this
   *  list (the language codes are the labels, the public switcher's
   *  convention). The chrome's language is the header switcher's domain —
   *  the admin page has no UI-language control of its own. */
  protected readonly locales = LOCALES;
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty.
   *  SCOPEd to the active UI language (admin-locale-scope): only the posts
   *  that have content in it (a translation row there or the home being it),
   *  each carrying that locale's content, in the stored global manual order. */
  protected readonly guidanceRows = signal<AdminGuidancePostDto[] | null>(null);
  protected readonly guidanceLoadError = signal<string | null>(null);
  /** The applied search term (admin-guidance-search): the URL's `q` — set
   *  on submit (submit-based, never per-keystroke), scoped to the content
   *  locale's list; '' = no filter. */
  protected readonly guidanceQuery = signal('');
  /** The search input (public so specs can drive it — page convention). */
  readonly guidanceSearch = new FormControl('', { nonNullable: true });
  /** The un-paged (search-filtered) total (X-Total-Count) and the
   *  derived page count / out-of-range flag (the public page's honest
   *  states). */
  protected readonly guidanceTotal = signal(0);
  protected readonly guidancePage = signal(1);
  protected readonly guidanceSize = signal(PAGE_SIZE_DEFAULT);
  protected readonly guidancePages = computed(() =>
    lastPage(this.guidanceTotal(), this.guidanceSize()),
  );
  protected readonly guidanceOutOfRange = computed(
    () => this.guidanceTotal() > 0 && this.guidancePage() > this.guidancePages(),
  );
  /** Manual order (the DnD, the move buttons AND the full-list order PUT)
   *  is ALL-ROWS-by-nature: available only while the whole (searched,
   *  scoped) list fits the current page (the spec's interaction rule). */
  protected readonly guidanceReorderable = computed(
    () => this.guidanceTotal() <= this.guidanceSize(),
  );
  /** The Published column's instants (slug -> publishedAt). The admin DTO
   *  carries NO publishedAt — the instants live in the permit-all public
   *  index, which this map merges (a failed merge degrades the column to
   *  "—", never the list). The order-list panel renders it. */
  protected readonly publishedAtBySlug = signal<Map<string, string>>(new Map());
  /** The open editor: null = closed; 'new' = create mode; a post = edit
   *  mode (the id-keyed GET result — the row's copy may be stale). */
  protected readonly guidanceEditor = signal<AdminGuidancePostDto | 'new' | null>(null);
  protected readonly guidanceEditorLoading = signal(false);
  /** The failed save's server message (the editor stays open — the admin
   *  keeps the draft). */
  protected readonly guidanceEditorError = signal<string | null>(null);
  /** Two-tap delete confirm (no window.confirm): the armed post id. The
   *  gateway ALWAYS sends confirm=true (the server 400s without it). */
  protected readonly guidanceDeleteConfirm = new ConfirmAction<number>(this.host.nativeElement);
  /**
   * The open post's translation rows (bilingual-guidance): null = not
   * loaded (fetched when the editor opens in edit mode). The home-locale
   * row is always present (the server guarantees it) — the section's
   * empty state is a shell post (no rows at all) only.
   */
  protected readonly guidanceTranslations = signal<GuidanceTranslationDto[] | null>(null);
  /**
   * The locale the open editor is authoring a NEW translation in
   *  (bilingual-guidance); null = the ordinary create/edit form. The
   *  template branches on it so the editor RECREATES on a switch (the
   *  prefill and the save payload pick the mode).
   */
  protected readonly translationTarget = signal<string | null>(null);
  /**
   * The locale whose EXISTING translation row the open editor is editing
   *  in place (bilingual-guidance); null = not in translation-edit mode.
   *  The template branches on it so the editor RECREATES on a switch
   *  (the prefill and the save payload pick the mode) — the post fetch
   *  behind it is scoped to the locale being edited, so the form shows
   *  THAT row. The home-locale row never takes this mode (its edit is
   *  the ordinary post edit that re-syncs the home row — the V26
   *  invariant), so the row's buttons are offered for foreign rows only.
   */
  protected readonly translationEditTarget = signal<string | null>(null);
  /** The translation delete's two-tap confirm, keyed by LOCALE (the shared
   *  primitive; the home-locale row is never offered the trigger — the
   *  server 400s deleting it). */
  protected readonly translationDeleteConfirm = new ConfirmAction<string>(this.host.nativeElement);
  /** The monotonic guidance-list fetch sequence — a stale (out-of-order)
   *  response is dropped (the detail page's pattern). */
  private guidanceFetchSeq = 0;
  /** The monotonic shelters-list fetch sequence (the guidance path's
   *  guard, applied to this list too): a superseded response must not
   *  win — the last response to ARRIVE is not the last view to be asked
   *  for (a chip/search change during an in-flight load). */
  private shelterFetchSeq = 0;
  /** The monotonic report-queue fetch sequence (the same guard — a
   *  filter/page change during an in-flight load supersedes). */
  private reportFetchSeq = 0;
  /** The monotonic account-list fetch sequence (the same guard). */
  private userFetchSeq = 0;
  /** The monotonic media-library fetch sequence (the same guard). */
  private mediaFetchSeq = 0;
  /** The monotonic audit-trail fetch sequence (the same guard). */
  private auditFetchSeq = 0;
  /** The monotonic editor-detail fetch sequence (same guard). */
  private editorFetchSeq = 0;
  /** The monotonic editor-reveal sequence: a superseded open (a newer
   *  Edit/New) or a close cancels a pending reveal, so a stale callback
   *  can never scroll or focus after the editor it belongs to is gone.
   *  A re-render WITHOUT an open bumps nothing — no scroll, no focus
   *  steal. */
  private editorRevealSeq = 0;
  /** The content-language switcher (the Guidance tab's "Content language"
   *  control) sets I18nService.contentLocale: the guidance
   *  list is scoped to it, so a switch re-fetches it (the
   *  guidance-list-page's idiom). A UI-language switch (I18nService.
   *  locale) deliberately does NOT re-fetch (admin-locale-split: the
   *  listed content is untouched). A field initializer (an injection
   *  context — toObservable's requirement) builds the subscription;
   *  toObservable emits the CURRENT value on subscribe, so skip(1) —
   *  only a real switch triggers it. Unsubscribed in ngOnDestroy. An
   *  open editor is CLOSED by the switch — its unsaved edits are
   *  DISCARDED (they belong to the previous language's rows; re-open
   *  after the switch re-fetches the new locale's content). */
  private readonly guidanceLocaleSub = toObservable(this.i18n.contentLocale)
    .pipe(skip(1))
    .subscribe(() => {
      this.closeGuidanceEditor();
      // The list (if live) is the OLD locale's: invalidate the cached
      // rows. Guarded on the ERROR state, not on rows: the switch's own
      // invalidation (or a just-started load) may already have nulled
      // them, and the error state keeps its Retry (a failed load stays
      // failed until the admin retries).
      this.guidanceRows.set(null);
      // A scope change voids the previous scope's search and page —
      // reset both to the first page and re-fetch. Guarded on the ERROR
      // state, not on rows: the toObservable delivery is ASYNC — by the
      // time this fires, onContentLanguageChange has already nulled the
      // rows (and a not-yet-landed first load is null too — the seq guard
      // drops the superseded in-flight response). The error state keeps
      // its Retry (a failed load stays failed until the admin retries).
      if (this.tab() === 'guidance' && this.guidanceLoadError() === null) {
        const params = { ...this.route.snapshot.queryParams };
        delete params['q'];
        delete params['guidancePage'];
        delete params['guidanceSize'];
        this.guidanceQuery.set('');
        // The input is the filter's editor (one source of truth): it
        // clears WITH the filter, so a switch can never leave a term in
        // the field that is not applied.
        this.guidanceSearch.reset('');
        this.guidancePage.set(1);
        this.guidanceSize.set(PAGE_SIZE_DEFAULT);
        this.guidanceViewKey = ['', 1, PAGE_SIZE_DEFAULT, this.i18n.contentLocale()].join('|');
        this.loadGuidance();
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: params,
          replaceUrl: true,
        });
      }
    });

  // ---- media library tab (crisis-guidance D8) ---------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty.
   *  Newest first; the guidance editor's hero picker reuses the current
   *  page of the library. */
  protected readonly mediaRows = signal<MediaAssetDto[] | null>(null);
  protected readonly mediaLoadError = signal<string | null>(null);
  /** The paged view (the owner's "every admin list pages" rule): the
   *  un-paged library size (X-Total-Count) and the derived page count /
   *  out-of-range flag. */
  protected readonly mediaPage = signal(1);
  protected readonly mediaSize = signal(PAGE_SIZE_DEFAULT);
  protected readonly mediaTotal = signal(0);
  protected readonly mediaPages = computed(() => lastPage(this.mediaTotal(), this.mediaSize()));
  protected readonly mediaOutOfRange = computed(
    () => this.mediaTotal() > 0 && this.mediaPage() > this.mediaPages(),
  );
  /** The in-use delete confirm: the armed asset id, carrying the 409's
   *  server message (naming the affected posts) — the strip re-issues the
   *  delete with confirm=true. */
  protected readonly mediaDeleteInUse = new ConfirmAction<number, string>(this.host.nativeElement);

  // ---- shared UI state ---------------------------------------------------------
  /** One in-flight mutation at a time (the row buttons all share it). */
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** Two-tap delete confirm: the armed shelter id (no window.confirm). */
  protected readonly shelterDeleteConfirm = new ConfirmAction<number>(this.host.nativeElement);

  /** The view IS the URL (admin-page-size / admin-guidance-search):
   *  every emission (the initial navigation and every query change — a
   *  page/size flip, a chip, a search submit, a back-button step) parses
   *  the paged lists' params, normalizes a hand-typed value in place
   *  (replaceUrl — no history entry for the cosmetic fix) and re-loads
   *  the ACTIVE tab's list when its own params actually changed (the
   *  other tab's params are inert while it is off-screen). The initial
   *  emission loads nothing: the default tab's queue loads in ngOnInit,
   *  and an off-tab list follows the lazy-load rule on first switch.
   *  Unsubscribed in ngOnDestroy. */
  private readonly querySub = this.route.queryParams.subscribe((params) =>
    this.onQueryChange(params),
  );

  /** The last-applied view key per paged list — a queryParams emission
   *  re-loads only when the ACTIVE tab's own params (or the local search
   *  term, for the shelters list) differ from the last load. */
  private guidanceViewKey = '';
  private sheltersViewKey = '';
  private reportsViewKey = '';
  private usersViewKey = '';
  private mediaViewKey = '';
  private auditViewKey = '';

  /** Parse + normalize the paged lists' params, then sync the active
   *  tab (the public guidance page's idiom, applied per tab). */
  private onQueryChange(params: Params): void {
    if (this.normalizeListParams(params)) {
      return; // the normalized URL re-emits and loads there
    }
    if (this.tab() === 'guidance') {
      this.syncGuidanceFromParams(params, false);
    } else if (this.tab() === 'shelters') {
      this.syncSheltersFromParams(params, false);
    } else if (this.tab() === 'reports') {
      this.syncReportsFromParams(params, false);
    } else if (this.tab() === 'users') {
      this.syncUsersFromParams(params, false);
    } else if (this.tab() === 'media') {
      this.syncMediaFromParams(params, false);
    } else if (this.tab() === 'audit') {
      this.syncAuditFromParams(params, false);
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

  /** The Guidance tab's view (the URL's `q` + guidancePage/guidanceSize)
   *  into the signals, loading when `firstVisit` (the lazy-load rule) or
   *  the view actually changed. The content locale is part of the key —
   *  the locale subscription handles its own reset, so a stale key
   *  cannot re-load the old scope. */
  private syncGuidanceFromParams(params: Params, firstVisit: boolean): void {
    const q = (params['q'] ?? '').trim();
    const page = parsePage(params['guidancePage'] ?? null);
    const size = parseSize(params['guidanceSize'] ?? null);
    const key = [q, page, size, this.i18n.contentLocale()].join('|');
    // A query-param change that lands WHILE A LOAD IS IN FLIGHT (rows
    // nulled, no error yet) must re-load with the new view — never return
    // early (the old `!live` clause dropped the change: the URL read the
    // new filter while the list rendered the old one, and re-clicking
    // could not recover because the router skips a same-URL navigation).
    // The load's fetch-sequence guard drops the superseded response.
    if (!firstVisit && key === this.guidanceViewKey) {
      return;
    }
    this.guidanceViewKey = key;
    // One source of truth (the URL's `q`): when the APPLIED term changes,
    // the input (the filter's editor) follows it — a hand-opened
    // /admin?q=… or a history step pre-fills the field instead of
    // leaving it disagreeing with the filter. An unchanged term (a
    // page/size step) leaves the field alone: an unsubmitted draft is
    // user state, not view state. emitEvent: false — a view write, not
    // user input.
    const prevQ = this.guidanceQuery();
    this.guidanceQuery.set(q);
    if (q !== prevQ) {
      this.guidanceSearch.setValue(q, { emitEvent: false });
    }
    this.guidancePage.set(page);
    this.guidanceSize.set(size);
    this.loadGuidance();
  }

  /** The Shelters tab's view (the URL's source + shelterPage/shelterSize)
   *  into the signals — the local search term stays where it is (the
   *  form control) and is part of the key, so a search submit's URL
   *  change re-loads with the new term. */
  private syncSheltersFromParams(params: Params, firstVisit: boolean): void {
    const source = parseSourceFilter(params['source'] ?? null);
    const page = parsePage(params['shelterPage'] ?? null);
    const size = parseSize(params['shelterSize'] ?? null);
    const key = [source, page, size, this.shelterQuery()].join('|');
    // In-flight window included: a chip/page change that lands while a
    // fetch is running re-loads with the new view (the sequence guard
    // drops the superseded response — see shelterFetchSeq).
    if (!firstVisit && key === this.sheltersViewKey) {
      return;
    }
    this.sheltersViewKey = key;
    this.shelterSource.set(source);
    this.shelterPage.set(page);
    this.shelterSize.set(size);
    this.loadShelters();
  }

  /** The Reports tab's view (the URL's reportPage/reportSize +
   *  excludeDismissed) into the signals, loading when `firstVisit` (the
   *  lazy-load rule) or the view actually changed (the sequence guard
   *  drops a superseded in-flight response). */
  private syncReportsFromParams(params: Params, firstVisit: boolean): void {
    const exclude = params['excludeDismissed'] === 'true';
    const page = parsePage(params['reportPage'] ?? null);
    const size = parseSize(params['reportSize'] ?? null);
    const key = [page, size, exclude].join('|');
    if (!firstVisit && key === this.reportsViewKey) {
      return;
    }
    this.reportsViewKey = key;
    this.reportExcludeDismissed.set(exclude);
    this.reportPage.set(page);
    this.reportSize.set(size);
    this.loadReports();
  }

  /** The Users tab's view (userPage/userSize) into the signals (the same
   *  idiom). */
  private syncUsersFromParams(params: Params, firstVisit: boolean): void {
    const page = parsePage(params['userPage'] ?? null);
    const size = parseSize(params['userSize'] ?? null);
    const key = [page, size].join('|');
    if (!firstVisit && key === this.usersViewKey) {
      return;
    }
    this.usersViewKey = key;
    this.userPage.set(page);
    this.userSize.set(size);
    this.loadUsers();
  }

  /** The Media tab's view (mediaPage/mediaSize) into the signals (the
   *  same idiom). */
  private syncMediaFromParams(params: Params, firstVisit: boolean): void {
    const page = parsePage(params['mediaPage'] ?? null);
    const size = parseSize(params['mediaSize'] ?? null);
    const key = [page, size].join('|');
    if (!firstVisit && key === this.mediaViewKey) {
      return;
    }
    this.mediaViewKey = key;
    this.mediaPage.set(page);
    this.mediaSize.set(size);
    this.loadMedia();
  }

  /** The Audit tab's view (auditPage/auditSize) into the signals (the
   *  same idiom). */
  private syncAuditFromParams(params: Params, firstVisit: boolean): void {
    const page = parsePage(params['auditPage'] ?? null);
    const size = parseSize(params['auditSize'] ?? null);
    const key = [page, size].join('|');
    if (!firstVisit && key === this.auditViewKey) {
      return;
    }
    this.auditViewKey = key;
    this.auditPage.set(page);
    this.auditSize.set(size);
    this.loadAudit();
  }

  ngOnDestroy(): void {
    this.guidanceLocaleSub.unsubscribe();
    this.querySub.unsubscribe();
  }

  // -------------------------------------------------------------------------
  // Language control (admin-locale-split)
  // -------------------------------------------------------------------------

  /**
   * "Content language" select (the Guidance tab — with the content it
   *  scopes): the guidance content language. Persists under its own key
   *  (I18nService.setContentLocale — the UI language is untouched).
   *
   *  The cached rows are invalidated here: they belong to the previous
   *  content language and must never render as stale-locale rows. On the
   *  Guidance tab (the select's only home) the content-locale
   *  subscription re-fetches the list immediately after the invalidation
   *  (its guard keys off the error state, so the nulled rows don't skip
   *  it); a switch made from elsewhere (a programmatic setContentLocale)
   *  leaves the rows nulled, and the Guidance tab's lazy-load rule
   *  re-fetches them in the new locale on the next visit. An open editor
   *  is CLOSED by the switch (the subscription, on both paths) — its
   *  unsaved edits are DISCARDED (they belong to the previous
   *  language's rows).
   */
  onContentLanguageChange(event: Event): void {
    this.i18n.setContentLocale((event.target as HTMLSelectElement).value as Locale);
    this.guidanceRows.set(null); // the cached rows are the old locale's
  }

  ngOnInit(): void {
    // The default tab (Unconfirmed) filters the FULL shelters list, so
    // that list loads immediately; the Shelters tab's paged view and the
    // other tabs load lazily on first switch (a visit after a load keeps
    // the in-memory rows — the queue does not refetch itself).
    this.loadQueue();
  }

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------
  switchTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.clearFeedback();
    this.closeHistory();
    this.closeInfo();
    this.closeInaccurate();
    this.closeGuidanceEditor();
    this.guidanceDeleteConfirm.disarm();
    this.mediaDeleteInUse.disarm();
    this.userActionConfirm.disarm();
    switch (tab) {
      case 'shelters':
        this.syncSheltersFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'reports':
        this.syncReportsFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'alerts':
        if (this.alertsRows() === null && this.alertsLoadError() === null) {
          this.loadAlerts();
        }
        break;
      case 'users':
        this.syncUsersFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'guidance':
        this.syncGuidanceFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'media':
        this.syncMediaFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'audit':
        this.syncAuditFromParams(this.route.snapshot.queryParams, true);
        break;
      case 'unconfirmed':
        break; // filters the full list, which loaded in ngOnInit
    }
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
    this.shelterLoadError.set(null);
    this.admin
      .listShelters()
      .then((page) => this.queueRows.set(page.rows))
      .catch((error: unknown) =>
        this.shelterLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key))),
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
  // Shelters tab
  // -------------------------------------------------------------------------
  /** The Shelters tab's current page: the (source, q) filtered slice —
   *  the server does the filtering AND the slicing (no client-side fake
   *  pagination), the un-paged total arrives as X-Total-Count. */
  loadShelters(): void {
    this.shelterRows.set(null);
    this.shelterLoadError.set(null);
    const q = this.shelterQuery().trim();
    const size = this.shelterSize();
    const seq = ++this.shelterFetchSeq;
    this.admin
      .listShelters({
        source: this.shelterSource() === 'ALL' ? undefined : this.shelterSource(),
        q: q === '' ? undefined : q,
        limit: size,
        offset: (this.shelterPage() - 1) * size,
      })
      .then((paged) => {
        if (seq !== this.shelterFetchSeq) {
          return; // a newer load superseded this response
        }
        this.shelterTotal.set(paged.total);
        this.shelterRows.set(paged.rows);
      })
      .catch((error: unknown) => {
        if (seq !== this.shelterFetchSeq) {
          return;
        }
        this.shelterLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
  }

  /** The review actions' refetch: the queue's full list always (the
   *  action changed the queue's scope), the Shelters tab's page when it
   *  is loaded (both views of the same endpoint — kept quiet, no
   *  loading flash over an already-rendered list). */
  private async refreshShelters(): Promise<void> {
    const page = await this.admin.listShelters();
    this.queueRows.set(page.rows);
    if (this.shelterRows() !== null || this.shelterLoadError() !== null) {
      const q = this.shelterQuery().trim();
      const size = this.shelterSize();
      // The shared fetch-sequence guard: a URL-driven loadShelters that
      // started while this refresh's page leg was in flight supersedes it
      // (its view is the newer one — the stale page is dropped).
      const seq = this.shelterFetchSeq;
      const paged = await this.admin.listShelters({
        source: this.shelterSource() === 'ALL' ? undefined : this.shelterSource(),
        q: q === '' ? undefined : q,
        limit: size,
        offset: (this.shelterPage() - 1) * size,
      });
      if (seq !== this.shelterFetchSeq) {
        return;
      }
      this.shelterTotal.set(paged.total);
      this.shelterRows.set(paged.rows);
    }
  }

  /** Search submit: capture the term and re-query (the server does the
   *  name/address substring match — no client-side filtering). A new
   *  filter has its own page 1 (keeping the old page number would often
   *  land out-of-range). */
  onSearchSubmit(): void {
    this.shelterQuery.set(this.searchQuery.value.trim());
    this.clearFeedback();
    this.shelterDeleteConfirm.disarm();
    this.closeHistory();
    this.closeInfo();
    this.closeInaccurate();
    if (this.shelterPage() > 1) {
      // The page reset changes the URL — the emission re-loads with the
      // new term (the term is tab-local, part of the view key).
      this.navigateShelters({ page: 1 });
    } else {
      // The page is already 1 and the term is not a URL param — the
      // navigation would be a no-op, so load directly.
      this.sheltersViewKey = [
        this.shelterSource(),
        this.shelterPage(),
        this.shelterSize(),
        this.shelterQuery(),
      ].join('|');
      this.loadShelters();
    }
  }

  /** The source chip (admin Shelters tab): write `source` to the URL
   *  (a link or refresh keeps the filter), which composes with the
   *  status filter and the search (AND on the server). The chip starts
   *  at page 1. */
  onSourceChip(source: ShelterSourceFilter): void {
    if (source === this.shelterSource()) {
      return;
    }
    this.clearFeedback();
    this.shelterDeleteConfirm.disarm();
    this.closeHistory();
    this.closeInfo();
    this.closeInaccurate();
    this.navigateShelters({ source, page: 1 });
  }

  /** Write the Shelters tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted from the URL (page 1, size 20, no
   *  source filter). */
  private navigateShelters(view: {
    page?: number;
    size?: number;
    source?: ShelterSourceFilter;
  }): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (view.source !== undefined) {
      if (view.source === 'ALL') {
        delete params['source'];
      } else {
        params['source'] = view.source;
      }
    }
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['shelterPage'] = String(view.page);
      } else {
        delete params['shelterPage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['shelterSize'] = String(view.size);
      } else {
        delete params['shelterSize'];
      }
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page.
   */
  onSheltersNavigate({ page, size }: { page: number; size: number }): void {
    this.navigateShelters({ page: clampPage(page, this.shelterTotal(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size and source are kept). */
  gotoSheltersFirstPage(): void {
    this.navigateShelters({ page: 1 });
  }

  /** Hide a USER row (POST /admin/shelters/{id}/status INACTIVE). */
  hideShelter(row: AdminShelterDto): void {
    void this.setShelterStatus(row, 'INACTIVE');
  }

  /** Restore a hidden USER row (POST …status ACTIVE). The backend's restore
   *  also disarms auto-hide — the manual-change marker is server-side. */
  activateShelter(row: AdminShelterDto): void {
    void this.setShelterStatus(row, 'ACTIVE');
  }

  private async setShelterStatus(row: AdminShelterDto, status: ShelterStatus): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.setShelterStatus(row.id, status);
      this.patchShelter(row.id, { status });
      this.success.set(
        this.i18n.t(
          status === 'INACTIVE'
            ? 'admin.shelters.success.hidden'
            : 'admin.shelters.success.restored',
        ),
      );
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /** Step 1 of the two-tap delete: arm the confirm strip for the row. */
  requestDelete(id: number): void {
    this.clearFeedback();
    this.shelterDeleteConfirm.arm(id);
  }

  cancelDelete(): void {
    this.shelterDeleteConfirm.cancel();
  }

  /** Step 2: DELETE /admin/shelters/{id} (204). The row is removed in place;
   *  reports/occupancy cascade server-side. */
  async confirmDelete(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.deleteShelter(id);
      this.shelterRows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      // The (filtered) total shrinks — the page count follows (the
      // control hides itself at one page; a page left past the end shows
      // the out-of-range notice with its first-page action).
      this.shelterTotal.update((t) => Math.max(0, t - 1));
      this.success.set(this.i18n.t('admin.shelters.success.deleted'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      if (this.historyFor() === id) {
        this.closeHistory();
      }
      if (this.infoFor() === id) {
        this.closeInfo();
      }
      if (this.inaccurateFor() === id) {
        this.closeInaccurate();
      }
      this.shelterDeleteConfirm.disarm();
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Info request
  // -------------------------------------------------------------------------
  /**
   * Toggle the inline info-request panel for a USER row. A row WITHOUT a
   * request shows the question editor (required, ≤2000) and the send
   * action; a row WITH one shows the exchange read-only — the question
   * with the requester, and the submitter's answer once given (the row is
   * kept after the reply — audit posture; a second request is a server-
   * side 409, one exchange per shelter).
   */
  toggleInfo(row: AdminShelterDto): void {
    if (this.infoFor() === row.id) {
      this.closeInfo();
      return;
    }
    this.clearFeedback();
    this.requestMessage.reset('');
    this.infoFor.set(row.id);
  }

  /** Close the open info panel (tab switch, search, delete, toggle). */
  closeInfo(): void {
    this.infoFor.set(null);
  }

  /**
   * "Send": POST /admin/shelters/{id}/request-info (204). The shelters
   * list refetches afterwards — the server resolves the requester name
   * and the timestamp, which the 204 body does not carry (the
   * review-action refetch precedent).
   */
  async sendInfoRequest(row: AdminShelterDto): Promise<void> {
    const message = this.requestMessage.value.trim();
    if (message === '' || message.length > INFO_REQUEST_MAX) {
      this.requestMessage.markAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.requestInfo(row.id, message);
      this.success.set(this.i18n.t('admin.shelters.success.questionSent'));
      await this.refreshShelters();
      this.closeInfo();
    } catch (error) {
      // The panel STAYS open on failure (the admin keeps the question).
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Toggle the inline mark-inaccurate editor for an UNMARKED USER row.
   * A marked row never opens the editor — it shows the Clear action
   * directly (the flag's state, not a question). A second click on the
   * open row closes the editor.
   */
  toggleInaccurate(row: AdminShelterDto): void {
    if (this.inaccurateFor() === row.id) {
      this.closeInaccurate();
      return;
    }
    this.clearFeedback();
    this.inaccurateReason.reset('');
    this.inaccurateFor.set(row.id);
  }

  /** Close the open mark-inaccurate editor (tab switch, search, delete, toggle). */
  closeInaccurate(): void {
    this.inaccurateFor.set(null);
  }

  /**
   * "Mark": POST /admin/shelters/{id}/mark-inaccurate {reason?} (204).
   * The reason is optional — blank/absent stores NULL on the audit row.
   * The shelters list refetches afterwards (the server stamps the flag;
   * the 204 carries no body, the request-info refetch precedent).
   */
  async markInaccurateAction(row: AdminShelterDto): Promise<void> {
    const reason = this.inaccurateReason.value.trim();
    if (reason.length > REJECT_REASON_MAX) {
      this.inaccurateReason.markAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.markInaccurate(row.id, reason);
      this.success.set(this.i18n.t('admin.shelters.success.inaccurateMarked'));
      await this.refreshShelters();
      this.closeInaccurate();
    } catch (error) {
      // The editor STAYS open on failure (the admin keeps the reason).
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * "Clear inaccurate": POST /admin/shelters/{id}/clear-inaccurate (204,
   * idempotent). The list refetches — the flag is server state.
   */
  async clearInaccurateAction(row: AdminShelterDto): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.clearInaccurate(row.id);
      this.success.set(this.i18n.t('admin.shelters.success.inaccurateCleared'));
      await this.refreshShelters();
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Shelter history
  // -------------------------------------------------------------------------
  /**
   * Toggle the inline edit-history panel for a USER row. The panel lists
   * the row's lifecycle events ascending (Created / Edited — with the
   * server-parsed field changes / Deleted); a second click closes it.
   * History is a USER-row promise only — registry rows never get the
   * button (the import keeps its own data_imports audit and writes no
   * history rows).
   */
  async openHistory(row: AdminShelterDto): Promise<void> {
    if (this.historyFor() === row.id) {
      this.closeHistory();
      return;
    }
    this.historyFor.set(row.id);
    this.historyEvents.set(null);
    try {
      this.historyEvents.set(await this.admin.listShelterHistory(row.id));
    } catch (error) {
      this.closeHistory();
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    }
  }

  /** Close the open history panel (tab switch, search, delete, toggle). */
  closeHistory(): void {
    this.historyFor.set(null);
    this.historyEvents.set(null);
  }

  private patchShelter(id: number, patch: Partial<AdminShelterDto>): void {
    this.shelterRows.update((rows) =>
      (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  // -------------------------------------------------------------------------
  // Shelter-report tab
  // -------------------------------------------------------------------------
  loadReports(): void {
    this.reportRows.set(null);
    this.reportLoadError.set(null);
    const size = this.reportSize();
    const seq = ++this.reportFetchSeq;
    this.admin
      .listShelterReports({
        excludeDismissed: this.reportExcludeDismissed() || undefined,
        limit: size,
        offset: (this.reportPage() - 1) * size,
      })
      .then((paged) => {
        if (seq !== this.reportFetchSeq) {
          return; // a newer load superseded this response
        }
        this.reportTotal.set(paged.total);
        this.reportRows.set(paged.rows);
      })
      .catch((error: unknown) => {
        if (seq !== this.reportFetchSeq) {
          return;
        }
        this.reportLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
  }

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
    this.navigateReports({ excludeDismissed, page: 1 });
  }

  /** Write the Reports tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted from the URL (page 1, size 20, the
   *  'All' scope). */
  private navigateReports(view: {
    page?: number;
    size?: number;
    excludeDismissed?: boolean;
  }): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (view.excludeDismissed !== undefined) {
      if (view.excludeDismissed) {
        params['excludeDismissed'] = 'true';
      } else {
        delete params['excludeDismissed'];
      }
    }
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['reportPage'] = String(view.page);
      } else {
        delete params['reportPage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['reportSize'] = String(view.size);
      } else {
        delete params['reportSize'];
      }
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page.
   *  The filter scope is kept. */
  onReportsNavigate({ page, size }: { page: number; size: number }): void {
    this.navigateReports({ page: clampPage(page, this.reportTotal(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size and filter scope are kept). */
  gotoReportsFirstPage(): void {
    this.navigateReports({ page: 1 });
  }

  /** Mark the report resolved (204, idempotent). With the DEFAULT scope
   *  ('All') the row stays, dimmed (the audit trail — the admin sees
   *  what was resolved); with the OPEN scope the row leaves the list AND
   *  the (open) total — the list and the pin counts stay in agreement
   *  (W2-A). */
  async dismissReport(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.dismissShelterReport(id);
      if (this.reportExcludeDismissed()) {
        this.reportRows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
        this.reportTotal.update((t) => Math.max(0, t - 1));
      } else {
        this.reportRows.update((rows) =>
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
      this.reportRows.update((rows) =>
        (rows ?? []).map((r) =>
          r.shelterId === shelterId ? { ...r, shelterStatus: 'ACTIVE' } : r,
        ),
      );
      this.patchShelter(shelterId, { status: 'ACTIVE' });
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
  loadUsers(): void {
    this.userRows.set(null);
    this.userLoadError.set(null);
    this.userActionConfirm.disarm();
    const size = this.userSize();
    const seq = ++this.userFetchSeq;
    this.admin
      .listUsers({ limit: size, offset: (this.userPage() - 1) * size })
      .then((paged) => {
        if (seq !== this.userFetchSeq) {
          return; // a newer load superseded this response
        }
        this.userTotal.set(paged.total);
        this.userRows.set(paged.rows);
      })
      .catch((error: unknown) => {
        if (seq !== this.userFetchSeq) {
          return;
        }
        this.userLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
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
    this.userRows.update((rows) => (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /** Write the Users tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted from the URL (page 1, size 20). */
  private navigateUsers(view: { page?: number; size?: number }): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['userPage'] = String(view.page);
      } else {
        delete params['userPage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['userSize'] = String(view.size);
      } else {
        delete params['userSize'];
      }
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page. */
  onUsersNavigate({ page, size }: { page: number; size: number }): void {
    this.navigateUsers({ page: clampPage(page, this.userTotal(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size is kept). */
  gotoUsersFirstPage(): void {
    this.navigateUsers({ page: 1 });
  }

  // -------------------------------------------------------------------------
  // Audit tab
  // -------------------------------------------------------------------------
  loadAudit(): void {
    this.auditRows.set(null);
    this.auditLoadError.set(null);
    const size = this.auditSize();
    const seq = ++this.auditFetchSeq;
    this.admin
      .listAudit({ limit: size, offset: (this.auditPage() - 1) * size })
      .then((paged) => {
        if (seq !== this.auditFetchSeq) {
          return; // a newer load superseded this response
        }
        this.auditTotal.set(paged.total);
        this.auditRows.set(paged.rows);
      })
      .catch((error: unknown) => {
        if (seq !== this.auditFetchSeq) {
          return;
        }
        this.auditLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
  }

  /** Write the Audit tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted from the URL (page 1, size 20). */
  private navigateAudit(view: { page?: number; size?: number }): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['auditPage'] = String(view.page);
      } else {
        delete params['auditPage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['auditSize'] = String(view.size);
      } else {
        delete params['auditSize'];
      }
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page. */
  onAuditNavigate({ page, size }: { page: number; size: number }): void {
    this.navigateAudit({ page: clampPage(page, this.auditTotal(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size is kept). */
  gotoAuditFirstPage(): void {
    this.navigateAudit({ page: 1 });
  }

  // -------------------------------------------------------------------------
  // Guidance tab (crisis-guidance D8)
  // -------------------------------------------------------------------------

  /**
   * Load the CURRENT page of the posts visible in the CONTENT language
   * (admin-locale-scope + admin-locale-split), search-filtered: the server
   * runs the `q` filter over the scope's rendered content and slices the
   * (filtered) stored manual order with limit/offset — the page never
   * fetches-and-slices client-side, and the order is never re-sorted by
   * the search. The un-paged (filtered) total arrives as X-Total-Count;
   * an out-of-range page is the derived flag, not a bare empty list. The monotonic fetch
   * sequence drops a stale (out-of-order) response: a superseded load
   * must not overwrite a newer one (a language switch's pattern).
   */
  loadGuidance(): void {
    this.guidanceRows.set(null);
    this.guidanceLoadError.set(null);
    const seq = ++this.guidanceFetchSeq;
    const page = this.guidancePage();
    const size = this.guidanceSize();
    this.admin
      .listGuidancePostsPage({
        locale: this.i18n.contentLocale(),
        q: this.guidanceQuery() === '' ? undefined : this.guidanceQuery(),
        limit: size,
        offset: (page - 1) * size,
      })
      .then(({ rows, total }) => {
        if (seq !== this.guidanceFetchSeq) {
          return; // a newer load superseded this response
        }
        this.guidanceTotal.set(total);
        this.guidanceRows.set(rows);
        // The admin projection has NO publishedAt — the publication instants
        // live in the permit-all public index; merge them (a failed merge
        // degrades the column to "—", never the list itself).
        if (rows.some((r) => r.status === 'PUBLISHED')) {
          this.refreshPublishedIndex();
        } else {
          this.publishedAtBySlug.set(new Map());
        }
      })
      .catch((error: unknown) => {
        if (seq !== this.guidanceFetchSeq) {
          return;
        }
        this.guidanceLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
  }

  /**
   * The publishedAt merge source (the permit-all public index — PUBLISHED
   *  posts with their publication instants, keyed by slug). Fire-and-forget:
   *  a failure just leaves the column showing "—" until the next load. */
  private refreshPublishedIndex(): void {
    this.publicGuidance
      .list()
      .then((posts) =>
        this.publishedAtBySlug.set(new Map(posts.map((p) => [p.slug, p.publishedAt]))),
      )
      .catch(() => this.publishedAtBySlug.set(new Map()));
  }

  /**
   * The search submit (admin-guidance-search): capture the term and
   *  re-query — SUBMIT-based, never per-keystroke. A new filter has its
   *  own page 1 (keeping the old page number would often land out-of-
   *  range). The term is written to the URL (`q`) so a link or a refresh
   *  keeps it.
   */
  onGuidanceSearchSubmit(): void {
    const term = this.guidanceSearch.value.trim();
    this.guidanceQuery.set(term);
    this.clearFeedback();
    // The term goes to the URL (`q`) — that emission is what re-loads
    // (the term itself is not part of the URL's page/size state).
    this.navigateGuidance({ page: 1, q: term });
  }

  /** The explicit clear: removes `q` from the URL and resets to page 1
   *  (the "no posts yet" empty state comes back for an empty scope). */
  onGuidanceSearchClear(): void {
    this.guidanceSearch.reset('');
    this.guidanceQuery.set('');
    this.clearFeedback();
    this.navigateGuidance({ page: 1, q: '' });
  }

  /** Write the Guidance tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted (page 1, size 20, no search). */
  private navigateGuidance(view: { page?: number; size?: number; q?: string }): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (view.q !== undefined) {
      if (view.q === '') {
        delete params['q'];
      } else {
        params['q'] = view.q;
      }
    }
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['guidancePage'] = String(view.page);
      } else {
        delete params['guidancePage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['guidanceSize'] = String(view.size);
      } else {
        delete params['guidanceSize'];
      }
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page.
   *  The search term is kept (a new page of the same filter). */
  onGuidanceNavigate({ page, size }: { page: number; size: number }): void {
    this.navigateGuidance({ page: clampPage(page, this.guidanceTotal(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size and the search term are kept). */
  gotoGuidanceFirstPage(): void {
    this.navigateGuidance({ page: 1 });
  }

  /**
   * Open the editor. Create mode opens directly (the form is prefilled
   * with the CONTENT language — the post is created in it); edit mode
   * fetches the id-keyed detail FIRST, SCOPED to the content language
   * (the stored (sanitized) bodyHtml is what the editor round-trips — the
   * row's copy may be stale after a save from elsewhere; a post without
   * content in the locale 404s — unreachable from a scoped row). The media
   * library loads for the hero picker when the media tab hasn't loaded it
   * yet.
   */
  openGuidanceEditor(post: AdminGuidancePostDto | null): void {
    this.clearFeedback();
    this.guidanceEditorError.set(null);
    this.guidanceDeleteConfirm.disarm();
    // A fresh open: no pending translation authoring or edit mode, no
    // stale rows (the edit-mode load below refetches the list for this
    // post).
    this.translationTarget.set(null);
    this.translationEditTarget.set(null);
    this.guidanceTranslations.set(null);
    this.translationDeleteConfirm.disarm();
    this.ensureMediaLoaded();
    if (post === null) {
      this.guidanceEditor.set('new');
      // Create mode: the form renders immediately from this write — the
      // reveal waits for that render (afterNextRender), not the click.
      this.revealEditor();
      return;
    }
    const seq = ++this.editorFetchSeq;
    this.guidanceEditor.set('new'); // the editor section renders (loading…)
    this.guidanceEditorLoading.set(true);
    this.admin
      .getGuidancePost(post.id, this.i18n.contentLocale())
      .then((fetched) => {
        if (seq !== this.editorFetchSeq) {
          return; // superseded (a newer open/cancel) — drop the stale post
        }
        this.guidanceEditor.set(fetched);
        this.guidanceEditorLoading.set(false);
        // EDIT MODE: the reveal only runs once the row's data is loaded
        // AND this write has rendered the real form — never on the click
        // (when only the loading placeholder exists).
        this.revealEditor();
        // The translations section loads in parallel (bilingual-guidance):
        // its failure surfaces on the page banner, the post editing
        // itself is unaffected (the list is an add-on, not a gate).
        void this.loadGuidanceTranslations(fetched.id);
      })
      .catch((error: unknown) => {
        if (seq !== this.editorFetchSeq) {
          return;
        }
        // 404 (the post went away) or any other failure: close the editor,
        // surface the server message on the page banner.
        this.guidanceEditor.set(null);
        this.guidanceEditorLoading.set(false);
        this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
  }

  /** Close the editor (tab switch, cancel, a successful save). Bumps the
   *  fetch sequence so an in-flight edit detail cannot land late, and the
   *  reveal sequence so a pending scroll+focus is cancelled with the
   *  editor. */
  closeGuidanceEditor(): void {
    this.editorFetchSeq++;
    this.editorRevealSeq++;
    this.guidanceEditor.set(null);
    this.guidanceEditorLoading.set(false);
    this.guidanceEditorError.set(null);
    // The translations section is part of the open editor: no pending
    // authoring or edit mode, no stale rows, no armed delete confirm.
    this.translationTarget.set(null);
    this.translationEditTarget.set(null);
    this.guidanceTranslations.set(null);
    this.translationDeleteConfirm.disarm();
  }

  /**
   * The explicit-open reveal (Edit / New post — the ONLY triggers): once
   *  the editor's data is loaded and the form has RENDERED, scroll the
   *  editor region into view and move focus to the form's first field
   *  (the title). The admin who clicked Edit on a row at the BOTTOM of a
   *  long list must not hunt for the form — the form comes to them, and a
   *  keyboard user lands inside it, not somewhere arbitrary.
   *
   *  Deferred to afterNextRender (the map-page's scrollRowIntoView idiom):
   *  the signal write re-renders the form first, so the scroll measures
   *  the final layout — never the click-time placeholder. A re-render
   *  without an explicit open (a row patch, a refetch) never calls this,
   *  and a superseded/closed open is dropped by the reveal sequence.
   *
   *  The scroll honours prefers-reduced-motion — the repo's motion policy
   *  (page-shell.scss): the OS reduce request removes the motion, the
   *  state still flips. Under reduce the jump is INSTANT, not smooth.
   *  jsdom has no matchMedia at all (and it would be the only place to
   *  miss it) — the typeof guard keeps the default (smooth) there.
   */
  private revealEditor(): void {
    const seq = ++this.editorRevealSeq;
    afterNextRender(
      () => {
        if (seq !== this.editorRevealSeq) {
          return; // superseded (a newer open) or cancelled (a close)
        }
        const region = this.host.nativeElement.querySelector<HTMLElement>('.admin-editor');
        if (region === null) {
          return; // the editor is gone (destroyed mid-flight) — no reveal
        }
        const reducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        region.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
        // The form's first field — the title input (the Quill body comes
        // after it and must not be the focus target).
        const firstField = this.host.nativeElement.querySelector<HTMLInputElement>('#ge-title');
        firstField?.focus();
      },
      { injector: this.injector },
    );
  }

  /** The post the editor is bound to: null = create mode, the fetched post
   *  = edit mode. The 'new' loading placeholder never reaches the editor
   *  (template type narrowing can't exclude it from the union). */
  guidanceEditorPost(): AdminGuidancePostDto | null {
    const v = this.guidanceEditor();
    return v === 'new' ? null : v;
  }

  /** The editor's hero picker needs the library — load it when the media
   *  tab hasn't loaded it yet (the same lazy rule, no double fetch). */
  private ensureMediaLoaded(): void {
    if (this.mediaRows() === null && this.mediaLoadError() === null) {
      this.loadMedia();
    }
  }

  /**
   * Route the editor's validated payload to the right endpoint: create
   * (POST, 200 with the created post) or update (PUT, 200 with the
   * updated post). The 200 bodies carry the STORED post (sanitized body,
   * server-derived slug) — the row adopts it in place. On failure the
   * editor STAYS open (the admin keeps the draft); the server message
   * (400 validation / 409 slug collision naming the slug / 404 unknown
   * hero) is echoed in the editor's banner.
   */
  async saveGuidancePost(save: GuidanceEditorSave): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.guidanceEditorError.set(null);
    this.busy.set(true);
    try {
      if (save.createTranslation !== undefined && save.id !== null) {
        // Translation authoring (bilingual-guidance): the NEW row for the
        // target locale — the CREATE endpoint, never the update one (the
        // row does not exist yet). The editor STAYS open (the target
        // resets — the template branch recreates it in the ordinary edit
        // mode for the on-screen row) and the translation list re-loads.
        await this.admin.createGuidanceTranslation(save.id, save.createTranslation);
        this.success.set(this.i18n.t('admin.guidance.success.translationCreated'));
        this.translationTarget.set(null);
        await this.loadGuidanceTranslations(save.id);
        return;
      }
      if (save.updateTranslation !== undefined && save.id !== null) {
        // Translation EDIT (bilingual-guidance): the EXISTING row for the
        // target locale — the UPDATE endpoint (never the create one —
        // the row exists; never the post-level update — that writes the
        // home locale's columns, a different row). The bound post is the
        // EDIT-locale-scoped fetch, so after the save it is re-fetched in
        // the CONTENT locale: the editor re-opens in the ordinary edit
        // mode on the row a content-locale save would target (the content
        // language is unchanged). The translation list re-loads; the
        // post-level row patch is not applied — the edited locale's row
        // is not the content-locale row.
        const { locale, request } = save.updateTranslation;
        await this.admin.updateGuidanceTranslation(save.id, locale, request);
        this.success.set(this.i18n.t('admin.guidance.success.translationUpdated'));
        try {
          const restored = await this.admin.getGuidancePost(save.id, this.i18n.contentLocale());
          this.translationEditTarget.set(null);
          this.guidanceEditor.set(restored);
          await this.loadGuidanceTranslations(save.id);
        } catch {
          // The post went away concurrently (deleted mid-edit): close the
          // editor, the success is kept (the row itself was updated).
          this.closeGuidanceEditor();
        }
        return;
      }
      let result: AdminGuidancePostDto;
      if (save.id === null) {
        result = await this.admin.createGuidancePost(save.create!);
        // The new post APPENDS at the END of the stored manual order (the
        // server does — it is not newest-first anymore), so the row is
        // appended, not prepended; the (filtered) total grows with it.
        this.guidanceTotal.update((t) => t + 1);
        this.guidanceRows.update((rows) => [...(rows ?? []), result]);
        this.success.set(this.i18n.t('admin.guidance.success.created'));
      } else {
        // SCOPED to the CONTENT language (admin-locale-split): the content
        // fields land on that locale's translation row (the post-level
        // fields stay shared).
        result = await this.admin.updateGuidancePost(
          save.id,
          save.update!,
          this.i18n.contentLocale(),
        );
        this.guidanceRows.update((rows) =>
          (rows ?? []).map((r) => (r.id === result.id ? result : r)),
        );
        this.success.set(this.i18n.t('admin.guidance.success.updated'));
      }
      this.closeGuidanceEditor();
      // The slug may have moved (or a save-and-publish set the status) —
      // the publishedAt merge follows the new state.
      this.refreshPublishedIndex();
    } catch (error) {
      this.guidanceEditorError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /** Publish (POST /{id}/publish, 204, idempotent). The row patches in
   *  place; the stamp itself is server state the 204 does not carry — the
   *  public index refresh refreshes the Published column. */
  async publishGuidancePost(row: AdminGuidancePostDto): Promise<void> {
    await this.setGuidancePublished(row, 'PUBLISHED');
  }

  /** Unpublish (POST /{id}/unpublish, 204, idempotent) — back to DRAFT,
   *  publishedAt cleared. */
  async unpublishGuidancePost(row: AdminGuidancePostDto): Promise<void> {
    await this.setGuidancePublished(row, 'DRAFT');
  }

  private async setGuidancePublished(
    row: AdminGuidancePostDto,
    status: GuidanceStatus,
  ): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      if (status === 'PUBLISHED') {
        await this.admin.publishGuidancePost(row.id);
        // The pending hero import (guidance-hero-import) RUNS inside this
        // publish call: the server fetches, validates and stores the
        // draft's heroImportUrl (a failed import fails the publish, so a
        // success here means the import succeeded or was absent). The 204
        // carries no body, so when the row carried a pending URL the hero
        // reference changed (now a stored asset, URL cleared) and the
        // detail re-fetch keeps the list's thumbnail honest. The fetch is
        // held under the shared busy flag — the button's "Working…" covers
        // the whole import, not just the stamp. A re-fetch failure (the
        // post vanished concurrently) degrades to the stale row: the
        // publish itself succeeded, the next list load fixes the row.
        if (row.heroImportUrl !== null) {
          try {
            const fresh = await this.admin.getGuidancePost(row.id, this.i18n.contentLocale());
            this.patchGuidance(row.id, fresh);
          } catch {
            // Stale row: the publish succeeded, the list load heals it.
          }
        }
      } else {
        await this.admin.unpublishGuidancePost(row.id);
      }
      this.patchGuidance(row.id, { status });
      // The 204 carries no body — the publication instant is public state;
      // refresh the merge (publish: a fresh stamp; unpublish: the slug is
      // off the public index).
      if (status === 'PUBLISHED') {
        this.refreshPublishedIndex();
      } else {
        this.publishedAtBySlug.update((m) => {
          const next = new Map(m);
          next.delete(row.slug);
          return next;
        });
      }
      this.success.set(
        this.i18n.t(
          status === 'PUBLISHED'
            ? 'admin.guidance.success.published'
            : 'admin.guidance.success.unpublished',
        ),
      );
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /** Step 1 of the two-tap delete: arm the confirm strip for the row. */
  requestDeleteGuidance(id: number): void {
    this.clearFeedback();
    this.guidanceDeleteConfirm.arm(id);
  }

  cancelDeleteGuidance(): void {
    this.guidanceDeleteConfirm.cancel();
  }

  /** Step 2: DELETE /admin/guidance/{id}?confirm=true (204 — the gateway
   *  always sends the required confirm flag). The row is removed in place;
   *  its media assets stay in the library, its audit rows keep their label
   *  snapshot. */
  async confirmDeleteGuidance(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      const row = (this.guidanceRows() ?? []).find((r) => r.id === id) ?? null;
      await this.admin.deleteGuidancePost(id);
      this.guidanceRows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      // The (filtered) total shrinks — the page count follows (the
      // control hides itself at one page; a page left past the end shows
      // the out-of-range notice with its first-page action).
      this.guidanceTotal.update((t) => Math.max(0, t - 1));
      if (row !== null && row.status === 'PUBLISHED') {
        this.publishedAtBySlug.update((m) => {
          const next = new Map(m);
          next.delete(row.slug);
          return next;
        });
      }
      this.success.set(this.i18n.t('admin.guidance.success.deleted'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      // A deleted post being edited: the form's target is gone.
      const editor = this.guidanceEditor();
      if (editor !== null && editor !== 'new' && editor.id === id) {
        this.closeGuidanceEditor();
      }
      this.guidanceDeleteConfirm.disarm();
      this.busy.set(false);
    }
  }

  // ---- Translations (bilingual-guidance) ---------------------------------
  //
  // The post's per-locale rows live in the translations section under the
  // open editor (edit mode only): add a missing locale (the editor
  // recreates in translation-authoring mode), delete a foreign one (the
  // two-tap confirm; the home-locale row is the post itself — never
  // offered). Editing an EXISTING translation is the ordinary scoped
  // edit: switch the content language to it, open the post, save.

  /**
   * GET /admin/guidance/{id}/translations — the rows the section renders.
   * A stale answer (the editor moved on to another post in the meantime)
   * is dropped; a failed load surfaces on the page banner — the post
   * editing itself is unaffected (the list is an add-on, not a gate).
   */
  loadGuidanceTranslations(postId: number): Promise<void> {
    return this.admin
      .listGuidanceTranslations(postId)
      .then((rows) => {
        if (this.guidanceEditorPost()?.id === postId) {
          this.guidanceTranslations.set(rows);
        }
      })
      .catch((error: unknown) => {
        this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
  }

  /** Arm the editor for a NEW translation in `locale`: the template's
   *  branch switch recreates it in translation-authoring mode, prefilled
   *  from the on-screen row (the admin translates from what they see).
   *  The home declaration / pinned / hero choice are off that form. */
  startTranslation(locale: string): void {
    this.translationDeleteConfirm.disarm();
    this.translationTarget.set(locale);
  }

  /**
   * The per-locale edit trigger (the foreign row's Edit button —
   *  bilingual-guidance): the on-screen row is the CONTENT-locale row,
   *  so the row being edited needs its own scoped fetch first; then the
   *  template's branch switch recreates the editor in translation-edit
   *  mode (the prefill shows THAT row — the slug prefilled, a blank
   *  slug keeps it; Save emits the update-translation payload for the
   *  UPDATE endpoint). The home-locale row never reaches this (its
   *  buttons are not offered). On a scoped fetch FAILURE the current
   *  editor stays as-is (no switch — the rows are intact, the editor
   *  banner carries the message).
   */
  async startTranslationEdit(locale: string): Promise<void> {
    const post = this.guidanceEditorPost();
    if (post === null || this.guidanceEditor() === 'new') {
      return;
    }
    this.translationDeleteConfirm.disarm();
    this.busy.set(true);
    this.guidanceEditorLoading.set(true);
    this.guidanceEditorError.set(null);
    const seq = ++this.editorFetchSeq;
    try {
      const scoped = await this.admin.getGuidancePost(post.id, locale);
      if (seq !== this.editorFetchSeq) {
        return;
      }
      this.guidanceEditor.set(scoped);
      this.translationEditTarget.set(locale);
      this.revealEditor();
    } catch (error) {
      if (seq !== this.editorFetchSeq) {
        return;
      }
      this.guidanceEditorError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      if (seq === this.editorFetchSeq) {
        this.guidanceEditorLoading.set(false);
      }
      this.busy.set(false);
    }
  }

  /** Step 1 of the two-tap translation delete: arm the confirm strip for
   *  the locale. */
  requestDeleteTranslation(locale: string): void {
    this.clearFeedback();
    this.translationDeleteConfirm.arm(locale);
  }

  cancelDeleteTranslation(): void {
    this.translationDeleteConfirm.cancel();
  }

  /**
   * Step 2: DELETE /admin/guidance/{id}/translations/{locale} (204; no
   *  confirm parameter — the two-tap IS the confirm; the home-locale row
   *  400s server-side and is never offered the trigger). Deleting the row
   *  the editor is SHOWING (the content-locale row of a foreign-locale
   *  edit) removes the post from the current scoped list: close the
   *  editor and re-load the list. Any other row just refreshes the
   *  section under the open editor.
   */
  async confirmDeleteTranslation(locale: string): Promise<void> {
    const post = this.guidanceEditorPost();
    if (post === null || this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.deleteGuidanceTranslation(post.id, locale);
      this.success.set(this.i18n.t('admin.guidance.success.translationDeleted'));
      if (locale === post.locale) {
        this.closeGuidanceEditor();
        this.loadGuidance();
      } else {
        await this.loadGuidanceTranslations(post.id);
      }
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.translationDeleteConfirm.disarm();
      this.busy.set(false);
    }
  }

  private patchGuidance(id: number, patch: Partial<AdminGuidancePostDto>): void {
    this.guidanceRows.update((rows) =>
      (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  // ---- Manual ordering (guidance-manual-order D6) ------------------------------
  //
  // The interaction (move buttons, drag & drop, the drop-target
  // highlight, the per-row reorder computation) lives in
  // GuidanceOrderList; it emits the FULL ordered list and the page
  // submits it below. The list order IS the public order; the server
  // renumbers 1..N and the table reorders in place (no reload).

  /** The shared submission: PUT /admin/guidance/order with the FULL
   *  submitted order — SCOPEd to the CONTENT language (admin-locale-scope
   *  + admin-locale-split): the list is exactly the posts visible in it,
   *  and the server rewrites them into their slots of the GLOBAL order
   *  (slot-preserving — the other languages' posts are untouched).
   *  Success reorders the table in place (the server confirmed it — its
   *  204 is the confirmation); a failure (400 stale / unknown /
   *  not-visible-in-the-locale list, or the network) KEEPS the last
   *  confirmed order and shows the error banner. */
  async submitGuidanceOrder(nextRows: AdminGuidancePostDto[]): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.reorderGuidanceOrder(
        nextRows.map((r) => r.id),
        this.i18n.contentLocale(),
      );
      this.guidanceRows.set(nextRows);
      this.success.set(this.i18n.t('admin.guidance.success.reordered'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Media library tab (crisis-guidance D8)
  // -------------------------------------------------------------------------

  /** Load the CURRENT page of the asset inventory (newest first, with the
   *  reused-by counts): the server slices with limit/offset and the
   *  un-paged library size arrives as X-Total-Count (the owner's "every
   *  admin list pages" rule). The editor's hero picker reuses the current
   *  page. */
  loadMedia(): void {
    this.mediaRows.set(null);
    this.mediaLoadError.set(null);
    const size = this.mediaSize();
    const seq = ++this.mediaFetchSeq;
    this.admin
      .listMediaAssets({ limit: size, offset: (this.mediaPage() - 1) * size })
      .then((paged) => {
        if (seq !== this.mediaFetchSeq) {
          return; // a newer load superseded this response
        }
        this.mediaTotal.set(paged.total);
        this.mediaRows.set(paged.rows);
      })
      .catch((error: unknown) => {
        if (seq !== this.mediaFetchSeq) {
          return;
        }
        this.mediaLoadError.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
      });
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
      if (this.mediaPage() > 1) {
        // Newest-first: the fresh asset lands on page 1 — jump there (the
        // query emission re-loads the first page).
        this.navigateMedia({ page: 1 });
      } else {
        this.mediaRows.update((rows) => [asset, ...(rows ?? [])]);
        this.mediaTotal.update((t) => t + 1);
      }
      this.success.set(this.i18n.t('admin.media.success.uploaded'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.busy.set(false);
    }
  }

  /** Write the Media tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted from the URL (page 1, size 20). */
  private navigateMedia(view: { page?: number; size?: number }): void {
    const params: Record<string, string> = { ...this.route.snapshot.queryParams };
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['mediaPage'] = String(view.page);
      } else {
        delete params['mediaPage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['mediaSize'] = String(view.size);
      } else {
        delete params['mediaSize'];
      }
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page. */
  onMediaNavigate({ page, size }: { page: number; size: number }): void {
    this.navigateMedia({ page: clampPage(page, this.mediaTotal(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size is kept). */
  gotoMediaFirstPage(): void {
    this.navigateMedia({ page: 1 });
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
      this.mediaRows.update((rows) => (rows ?? []).filter((r) => r.id !== deleted.id));
      // The (un-paged) library size shrinks — the page count follows
      // (a page left past the end shows the out-of-range notice).
      this.mediaTotal.update((t) => Math.max(0, t - 1));
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
      this.mediaRows.update((rows) => (rows ?? []).filter((r) => r.id !== deleted.id));
      // The (un-paged) library size shrinks — the page count follows
      // (a page left past the end shows the out-of-range notice).
      this.mediaTotal.update((t) => Math.max(0, t - 1));
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

/** source chip: a legal grouping or 'ALL' (a stray hand-typed value is
 *  the no-filter default — the server would 400 an illegal one, and
 *  normalizeListParams drops it from the URL before it can reach a
 *  link — the URL and the rendered filter stay in agreement). */
function parseSourceFilter(raw: string | null): ShelterSourceFilter {
  return raw === 'REGISTRY' || raw === 'USER' ? raw : 'ALL';
}
