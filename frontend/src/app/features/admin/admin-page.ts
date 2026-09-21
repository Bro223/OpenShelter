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
import { NgClass } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEnGB from '@angular/common/locales/en-GB';
import { RouterLink } from '@angular/router';
import type {
  AdminAlertKind,
  AdminAlertRow,
  AdminAuditAction,
  AdminAuditRow,
  AdminGuidancePostDto,
  AdminOccupancy,
  AdminShelterDto,
  AdminShelterHistoryEvent,
  AdminShelterHistoryFieldChange,
  AdminShelterReportDto,
  AdminUserDto,
  GuidanceStatus,
  GuidanceTranslationDto,
  MediaAssetDto,
  ShelterReportType,
  ShelterStatus,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { bannerMessage } from '../../shared/error-copy';
import {
  ALERT_KIND_LABEL,
  AUDIT_ACTION_LABEL,
  SHELTER_HISTORY_ACTION_LABEL,
  SHELTER_REPORT_TYPE_LABEL,
} from '../../shared/admin-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import {
  occupancyText as occupancyTextShared,
  recencyText,
  sourceTrustLabel as sourceTrustLabelShared,
  communityBadgeClass as communityBadgeClassShared,
  PRIVATE_LOCATION_BADGE,
  isPrivateLocation as isPrivateLocationShared,
  INACCURATE_WARNING,
  INACCURATE_BADGE,
} from '../../shared/shelter-copy';
import { BannerComponent } from '../../shared/banner.component';
import { ConfirmAction } from '../../shared/confirm-action';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { Locale } from '../../core/i18n/locale';
import { LOCALES } from '../../core/i18n/locale';
import { ApiError } from '../../core/api-error';
import { GuidanceEditor, type GuidanceEditorSave } from './guidance-editor';
import { GuidanceOrderList } from './guidance-order-list';
import { GuidanceTranslations } from './guidance-translations';
import { SiteTextsPanel } from './site-texts-panel';

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
 * 401/403 per request). Eight tabs, each one queue:
 *
 *  - UNCONFIRMED (first, default) — the community review queue: every USER
 *    row in the NEW state (client-side filter of the shelters list — the
 *    unconfirmed subset IS the queue, newest first). "Mark confirmed" is
 *    direct; "Reject" requires a reason (≤500 chars). Confirm/reject hit
 *    POST /admin/shelters/{id}/review and refresh the shelters list (the
 *    queue recomputes from it; a 409 surfaces the server message verbatim).
 *  - SHELTERS — every row incl. hidden; USER rows actionable (Hide/Activate,
 *    Delete with a two-tap inline confirm), registry rows read-only (D4:
 *    import-owned — the UI never offers actions for them). Name/address
 *    search (submit-on-enter).
 *  - SHELTER REPORTS — the report queue: shelter link, type, reporter, age,
 *    dismiss. Dismissed rows stay in the queue, DIMMED (audit trail — the
 *    choice over filtering: the admin sees what was resolved). Rows whose
 *    shelter is INACTIVE get a "Restore shelter" shortcut.
 *  - ALERTS — the throttle-abuse ring (abuse-limits): the
 *    daily submission cap (429), the per-contact OTP cap (429) and the
 *    near-duplicate rejection (409), newest first. Read-only; the ring
 *    is in-memory on the backend (cleared on a restart — a triage view,
 *    not a durable log).
 *  - GUIDANCE (crisis-guidance D8) — the post list (title + hero
 *    thumbnail, status, locale, pinned, published date, updated) with
 *    create / edit / publish / unpublish / delete (two-tap). The editor
 *    is the inline GuidanceEditor form (title, slug, body, hero picker
 *    + mandatory-iff-set alt, locale, pinned, and the create-mode
 *    write-and-publish choice); the body is a plain textarea over the
 *    stored (sanitized) HTML. The admin DTO carries NO publishedAt — the
 *    published-date column merges the permit-all public index by slug
 *    (a merge failure degrades the column to "—", never the list).
 *  - MEDIA LIBRARY (crisis-guidance D8) — the asset inventory: thumbnail,
 *    filename, dimensions, size, upload date, reused-by count; the
 *    multipart upload (field `file`); delete is API-FIRST — the first tap
 *    calls DELETE (unreferenced → 200, row gone; referenced → 409 naming
 *    the affected posts, which arms the confirm strip that re-issues with
 *    confirm=true — never a dead end).
 *  - AUDIT (last) — the read-only moderation trail, newest 100 (lazy load
 *    on first switch): when / moderator / shelter / action / change /
 *    reason. Shelter names are resolved server-side (a deleted shelter
 *    reads "Deleted shelter"); the guidance/media rows (D12) read their
 *    subjectLabel snapshot in the same column.
 *  - USERS (before the authoring tabs) — the account list: name, e-mail,
 *    kind, suspension state. Suspend is two-tap (arm + confirm, like the
 *    shelter delete) and idempotent server-side; a suspended row is dimmed
 *    with a "Suspended" badge and an Unsuspend action. Admin-kind rows are
 *    listed (the provisioned account is visible) but the Suspend action is
 *    never offered for them (backend 409 — lockout vector). Suspension
 *    stops the ACCOUNT (login/refresh/tokens), not its shelters.
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
    ReactiveFormsModule,
    RouterLink,
    NgClass,
    DatePipe,
    BannerComponent,
    LoadingIndicator,
    TranslatePipe,
    GuidanceEditor,
    GuidanceOrderList,
    GuidanceTranslations,
    SiteTextsPanel,
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

  // ---- tabs ----------------------------------------------------------------
  protected readonly tab = signal<AdminTab>('unconfirmed');

  // ---- unconfirmed (review-queue) tab ------------------------------------------
  /** The queue: USER rows in the NEW state (client-side filter of the
   *  shelters list — no extra endpoint), newest first. The backend is
   *  id-ordered (auto-increment id = creation order) and carries NO creation
   *  timestamp on the admin projection (verified against the live API), so
   *  the id IS the creation-order proxy. */
  protected readonly unconfirmedRows = computed(() =>
    (this.shelterRows() ?? [])
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
  /** null = loading; [] = loaded and empty. */
  protected readonly shelterRows = signal<AdminShelterDto[] | null>(null);
  protected readonly shelterLoadError = signal<string | null>(null);
  /** The active name/address search term (set on submit). */
  protected readonly shelterQuery = signal('');
  /** Search input (public so specs can drive it — page convention). */
  readonly searchQuery = new FormControl('', { nonNullable: true });

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

  // ---- audit tab ---------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly auditRows = signal<AdminAuditRow[] | null>(null);
  protected readonly auditLoadError = signal<string | null>(null);

  // ---- alerts tab ------------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly alertsRows = signal<AdminAlertRow[] | null>(null);
  protected readonly alertsLoadError = signal<string | null>(null);

  // ---- users tab ------------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly userRows = signal<AdminUserDto[] | null>(null);
  protected readonly userLoadError = signal<string | null>(null);
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
  /** The translation delete's two-tap confirm, keyed by LOCALE (the shared
   *  primitive; the home-locale row is never offered the trigger — the
   *  server 400s deleting it). */
  protected readonly translationDeleteConfirm = new ConfirmAction<string>(this.host.nativeElement);
  /** The monotonic guidance-list fetch sequence — a stale (out-of-order)
   *  response is dropped (the detail page's pattern). */
  private guidanceFetchSeq = 0;
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
      // rows and re-fetch in the new one. Guarded on the ERROR state, not
      // on rows: the switch's own invalidation (or a just-started load)
      // may already have nulled them, and the error state keeps its Retry
      // (a failed load stays failed until the admin retries).
      if (this.tab() === 'guidance' && this.guidanceLoadError() === null) {
        this.guidanceRows.set(null);
        this.loadGuidance();
      }
    });

  // ---- media library tab (crisis-guidance D8) ---------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty.
   *  Newest first; the editor's hero picker reuses this list. */
  protected readonly mediaRows = signal<MediaAssetDto[] | null>(null);
  protected readonly mediaLoadError = signal<string | null>(null);
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

  // ---- shared copy helpers (exposed to the template) ---------------------------
  protected readonly reporterText = reporterText;
  /** Source/trust badge copy (community-review-queue D5): the Shelters
   *  tab's source column shows the source label (registry rows) or the
   *  trust-state label — the admin list keeps hidden rows, so REJECTED
   *  renders its own tone here. */
  protected readonly sourceTrustLabel = sourceTrustLabelShared;
  protected readonly communityBadgeClass = communityBadgeClassShared;
  protected readonly privateLocationBadge = PRIVATE_LOCATION_BADGE;
  protected readonly isPrivateLocation = isPrivateLocationShared;
  /** The single-sourced "reported inaccurate" warning + the admin-list
   *  badge. */
  protected readonly inaccurateWarning = INACCURATE_WARNING;
  protected readonly inaccurateBadge = INACCURATE_BADGE;

  /** The admin occupancy block into the shared occupancy copy — the SAME
   *  wire shape as the public list's block (`lastReportedAt` included),
   *  so no remapping. */
  protected occupancyText(occ: AdminOccupancy | null, now: number = Date.now()): string | null {
    if (occ === null) {
      return null;
    }
    return occupancyTextShared(occ, now);
  }

  /** Queue-row age ("12 min ago") — the shared recency copy. */
  protected ageText(iso: string): string {
    return recencyText(iso);
  }

  protected reportTypeLabel(type: ShelterReportType): string {
    return SHELTER_REPORT_TYPE_LABEL[type];
  }

  /** Audit-log action label (the machine value → human copy). */
  protected auditActionLabel(action: AdminAuditAction): string {
    return AUDIT_ACTION_LABEL[action];
  }

  /** Alert kind label (the machine value → human copy). */
  protected alertKindLabel(kind: AdminAlertKind): string {
    return ALERT_KIND_LABEL[kind];
  }

  /** The 429 alert's Retry-After countdown, human-formatted (null → "—"). */
  protected retryAfterText(seconds: number | null): string {
    if (seconds === null) {
      return '—';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h} h ${m} min` : `${h} h`;
    }
    if (m > 0) {
      return `${m} min`;
    }
    return `${seconds} s`;
  }

  /** Audit-log status change cell: "A → B", the single status when one side
   *  is null (delete/reject), or "—" when neither (e.g. report dismiss). */
  protected auditChangeText(previous: string | null, next: string | null): string {
    if (previous === null && next === null) {
      return '—';
    }
    if (previous === null || next === null) {
      return (previous ?? next) as string;
    }
    return `${previous} → ${next}`;
  }

  ngOnDestroy(): void {
    this.guidanceLocaleSub.unsubscribe();
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
    // The default tab (Unconfirmed) filters the shelters list, so that list
    // loads immediately; reports/alerts/users/audit load lazily on first
    // switch (a visit after a load keeps the in-memory rows — the queue
    // does not refetch itself).
    this.loadShelters();
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
    switch (tab) {
      case 'shelters':
        if (this.shelterRows() === null && this.shelterLoadError() === null) {
          this.loadShelters();
        }
        break;
      case 'reports':
        if (this.reportRows() === null && this.reportLoadError() === null) {
          this.loadReports();
        }
        break;
      case 'alerts':
        if (this.alertsRows() === null && this.alertsLoadError() === null) {
          this.loadAlerts();
        }
        break;
      case 'users':
        if (this.userRows() === null && this.userLoadError() === null) {
          this.loadUsers();
        }
        break;
      case 'guidance':
        if (this.guidanceRows() === null && this.guidanceLoadError() === null) {
          this.loadGuidance();
        }
        break;
      case 'media':
        if (this.mediaRows() === null && this.mediaLoadError() === null) {
          this.loadMedia();
        }
        break;
      case 'audit':
        if (this.auditRows() === null && this.auditLoadError() === null) {
          this.loadAudit();
        }
        break;
      case 'unconfirmed':
        break; // filters the shelters list, which loaded in ngOnInit
    }
  }

  // -------------------------------------------------------------------------
  // Unconfirmed (review-queue) tab
  // -------------------------------------------------------------------------
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
      this.success.set('Location confirmed.');
      await this.refreshShelters();
    } catch (error) {
      // A 409 (the row moved since this list load) surfaces the server
      // message verbatim — the admin reloads and re-acts.
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set('Location rejected.');
      this.rejectRowFor.set(null);
      await this.refreshShelters();
    } catch (error) {
      // The editor STAYS open on failure (the admin keeps the reason).
      this.error.set(bannerMessage(error, 'shelter'));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Shelters tab
  // -------------------------------------------------------------------------
  loadShelters(): void {
    this.shelterRows.set(null);
    this.shelterLoadError.set(null);
    const q = this.shelterQuery().trim();
    this.admin
      .listShelters(q === '' ? undefined : { q })
      .then((rows) => this.shelterRows.set(rows))
      .catch((error: unknown) => this.shelterLoadError.set(bannerMessage(error, 'shelter')));
  }

  /** The review actions' refetch: same query as loadShelters, but kept
   *  quiet (no loading flash over an already-rendered queue). */
  private async refreshShelters(): Promise<void> {
    const q = this.shelterQuery().trim();
    const rows = await this.admin.listShelters(q === '' ? undefined : { q });
    this.shelterRows.set(rows);
  }

  /** Search submit: capture the term and re-query (the server does the
   *  name/address substring match — no client-side filtering). */
  onSearchSubmit(): void {
    this.shelterQuery.set(this.searchQuery.value.trim());
    this.clearFeedback();
    this.shelterDeleteConfirm.disarm();
    this.closeHistory();
    this.closeInfo();
    this.closeInaccurate();
    this.loadShelters();
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
      this.success.set(status === 'INACTIVE' ? 'Shelter hidden.' : 'Shelter restored.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set('Shelter deleted.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set('Question sent to the submitter.');
      await this.refreshShelters();
      this.closeInfo();
    } catch (error) {
      // The panel STAYS open on failure (the admin keeps the question).
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set('Marked as inaccurate.');
      await this.refreshShelters();
      this.closeInaccurate();
    } catch (error) {
      // The editor STAYS open on failure (the admin keeps the reason).
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set('Inaccurate mark cleared.');
      await this.refreshShelters();
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.error.set(bannerMessage(error, 'shelter'));
    }
  }

  /** Close the open history panel (tab switch, search, delete, toggle). */
  closeHistory(): void {
    this.historyFor.set(null);
    this.historyEvents.set(null);
  }

  /** History action label (the machine value → human copy). */
  protected historyActionLabel(action: AdminShelterHistoryEvent['action']): string {
    return SHELTER_HISTORY_ACTION_LABEL[action];
  }

  /** One field change, "field: old → new"; an absent side renders "—"
   *  (a first-set description, or a field cleared to absent). */
  protected historyChangeText(change: AdminShelterHistoryFieldChange): string {
    return `${change.field}: ${change.from ?? '—'} → ${change.to ?? '—'}`;
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
    this.admin
      .listShelterReports()
      .then((rows) => this.reportRows.set(rows))
      .catch((error: unknown) => this.reportLoadError.set(bannerMessage(error, 'shelter')));
  }

  /** Mark the report resolved (204, idempotent). The row stays, dimmed. */
  async dismissReport(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.dismissShelterReport(id);
      this.reportRows.update((rows) =>
        (rows ?? []).map((r) => (r.id === id ? { ...r, dismissed: true } : r)),
      );
      this.success.set('Report dismissed.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set('Shelter restored.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
      .catch((error: unknown) => this.alertsLoadError.set(bannerMessage(error, 'shelter')));
  }

  // -------------------------------------------------------------------------
  // Users tab
  // -------------------------------------------------------------------------
  loadUsers(): void {
    this.userRows.set(null);
    this.userLoadError.set(null);
    this.userActionConfirm.disarm();
    this.admin
      .listUsers()
      .then((rows) => this.userRows.set(rows))
      .catch((error: unknown) => this.userLoadError.set(bannerMessage(error, 'shelter')));
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
      this.success.set(action === 'suspend' ? 'User suspended.' : 'User unsuspended.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
    } finally {
      this.userActionConfirm.disarm();
      this.busy.set(false);
    }
  }

  private patchUser(id: number, patch: Partial<AdminUserDto>): void {
    this.userRows.update((rows) => (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // -------------------------------------------------------------------------
  // Audit tab
  // -------------------------------------------------------------------------
  loadAudit(): void {
    this.auditRows.set(null);
    this.auditLoadError.set(null);
    this.admin
      .listAudit()
      .then((rows) => this.auditRows.set(rows))
      .catch((error: unknown) => this.auditLoadError.set(bannerMessage(error, 'shelter')));
  }

  // -------------------------------------------------------------------------
  // Guidance tab (crisis-guidance D8)
  // -------------------------------------------------------------------------

  /**
   * Load the posts visible in the CONTENT language (admin-locale-scope
   * + admin-locale-split): only the posts that have content in it (a
   * translation row there, or the post's home being it), each carrying
   * that locale's content, in the stored global manual order (the list
   * renders in the server's order — no client sort). The monotonic fetch
   * sequence drops a stale (out-of-order) response: a superseded load
   * must not overwrite a newer one (a language switch's pattern).
   */
  loadGuidance(): void {
    this.guidanceRows.set(null);
    this.guidanceLoadError.set(null);
    const seq = ++this.guidanceFetchSeq;
    this.admin
      .listGuidancePosts(this.i18n.contentLocale())
      .then((rows) => {
        if (seq !== this.guidanceFetchSeq) {
          return; // a newer load superseded this response
        }
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
        this.guidanceLoadError.set(bannerMessage(error, 'shelter'));
      });
  }

  /** The publishedAt merge source (the permit-all public index — PUBLISHED
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
    // A fresh open: no pending translation authoring, no stale rows (the
    // edit-mode load below refetches the list for this post).
    this.translationTarget.set(null);
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
        this.error.set(bannerMessage(error, 'shelter'));
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
    // authoring mode, no stale rows, no armed delete confirm.
    this.translationTarget.set(null);
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
      let result: AdminGuidancePostDto;
      if (save.id === null) {
        result = await this.admin.createGuidancePost(save.create!);
        // The new post APPENDS at the END of the stored manual order (the
        // server does — it is not newest-first anymore), so the row is
        // appended, not prepended.
        this.guidanceRows.update((rows) => [...(rows ?? []), result]);
        this.success.set(this.i18n.t('admin.guidance.success.created'));
      } else {
        // SCOPED to the CONTENT language (admin-locale-split): the content
        // fields land on that locale's translation row (the post-level
        // fields stay shared).
        result = await this.admin.updateGuidancePost(save.id, save.update!, this.i18n.contentLocale());
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
      this.guidanceEditorError.set(bannerMessage(error, 'shelter'));
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
      this.error.set(bannerMessage(error, 'shelter'));
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
      if (row !== null && row.status === 'PUBLISHED') {
        this.publishedAtBySlug.update((m) => {
          const next = new Map(m);
          next.delete(row.slug);
          return next;
        });
      }
      this.success.set(this.i18n.t('admin.guidance.success.deleted'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
        this.error.set(bannerMessage(error, 'shelter'));
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
      this.error.set(bannerMessage(error, 'shelter'));
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
      await this.admin.reorderGuidanceOrder(nextRows.map((r) => r.id), this.i18n.contentLocale());
      this.guidanceRows.set(nextRows);
      this.success.set(this.i18n.t('admin.guidance.success.reordered'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
    } finally {
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Media library tab (crisis-guidance D8)
  // -------------------------------------------------------------------------

  /** Load the asset inventory (newest first, with the reused-by counts).
   *  The editor's hero picker reuses these rows. */
  loadMedia(): void {
    this.mediaRows.set(null);
    this.mediaLoadError.set(null);
    this.admin
      .listMediaAssets()
      .then((rows) => this.mediaRows.set(rows))
      .catch((error: unknown) => this.mediaLoadError.set(bannerMessage(error, 'shelter')));
  }

  /** The file input's change: hand the chosen file to the upload (the
   *  input value resets FIRST — the same file stays re-selectable). */
  onMediaFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Index access (not .item): FileList is indexable, and the spec sets a
    // plain array on `files`.
    const file = input.files?.[0];
    input.value = '';
    if (file !== null && file !== undefined) {
      void this.uploadMediaFile(file);
    }
  }

  /**
   * POST /admin/media (multipart, field `file`) -> 201 with the stored
   *  asset (the generated name — the client's filename is display metadata
   *  only). The new asset prepends to the inventory (newest first). A
   *  rejected upload (400 unsupported / declared-type mismatch, 413 over
   *  the cap — the message names the cap) surfaces the server message
   *  through the page banner — the shared error-copy convention.
   */
  async uploadMediaFile(file: File): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      const asset = await this.admin.uploadMediaAsset(file);
      this.mediaRows.update((rows) => [asset, ...(rows ?? [])]);
      this.success.set(this.i18n.t('admin.media.success.uploaded'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
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
      this.mediaRows.update((rows) => (rows ?? []).filter((r) => r.id !== deleted.id));
      this.success.set(this.i18n.t('admin.media.success.deleted'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Still referenced: the 409 message names the affected posts —
        // it is echoed in the confirm strip after the fixed copy.
        this.mediaDeleteInUse.arm(id, error.message);
      } else {
        this.error.set(bannerMessage(error, 'shelter'));
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
      this.success.set(this.i18n.t('admin.media.success.deleted'));
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
    } finally {
      this.mediaDeleteInUse.disarm();
      this.busy.set(false);
    }
  }

  /** The asset's human size (the listing's Size column). */
  protected mediaSizeText(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}

/** Reporter identity for a queue row: name + e-mail, null-safe. */
export function reporterText(row: {
  reporterName: string | null;
  reporterEmail: string | null;
}): string {
  const name = row.reporterName ?? 'Unknown';
  return row.reporterEmail === null ? name : `${name} <${row.reporterEmail}>`;
}
