import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  computed,
  signal,
} from '@angular/core';
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
  AdminOccupancy,
  AdminShelterDto,
  AdminShelterHistoryEvent,
  AdminShelterHistoryFieldChange,
  AdminShelterReportDto,
  AdminReviewReportDto,
  AdminUserDto,
  ShelterOccupancy,
  ShelterReportType,
  ShelterStatus,
  ReviewReportReason,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import {
  occupancyText as occupancyTextShared,
  recencyText,
  ratingText as ratingTextShared,
  statusFlagText,
  provenanceBadgeClass as provenanceBadgeClassShared,
  provenanceText as provenanceTextShared,
  PRIVATE_LOCATION_BADGE,
  isPrivateLocation as isPrivateLocationShared,
  INACCURATE_WARNING,
  INACCURATE_BADGE,
} from '../../shared/shelter-copy';
import { BannerComponent } from '../../shared/banner.component';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { RatingStars } from '../../shared/rating-stars';

registerLocaleData(localeEnGB, 'en-GB');

/** The seven moderation tabs: the review queue FIRST, the audit trail LAST
 *  (community-review-queue); the Users tab sits before the audit (M10
 *  slice 1). */
export type AdminTab =
  'unconfirmed' | 'shelters' | 'reports' | 'reviews' | 'alerts' | 'users' | 'audit';

/** The reject reason's hard limit — mirrored by the backend contract
 *  (community-review-queue): required, at most 500 characters. */
export const REJECT_REASON_MAX = 500;

/** The info-request question's hard limit — mirrored by the backend
 *  contract (M10 slice 3, V19 column bound): required, at most 2000. */
export const INFO_REQUEST_MAX = 2000;

/** Shelter-report type labels (queue column + row meta). */
export const SHELTER_REPORT_TYPE_LABEL: Record<ShelterReportType, string> = {
  NON_EXISTENT: 'Does not exist',
  CLOSED: 'Reported closed',
  OPEN_CONFIRMED: 'Confirmed open',
  WRONG_LOCATION: 'Wrong location',
  OTHER: 'Other',
};

/** Review-report reason labels (queue row meta). */
export const REVIEW_REPORT_REASON_LABEL: Record<ReviewReportReason, string> = {
  FALSY_DATA: 'Falsy data',
  NOT_RELEVANT: 'Not relevant',
  SPAM: 'Spam',
  OTHER: 'Other',
};

/** Audit-log action labels (community-review-queue): human copy for the
 *  machine action values. */
export const AUDIT_ACTION_LABEL: Record<AdminAuditAction, string> = {
  STATUS_CHANGE: 'Status change',
  DELETE: 'Delete',
  REPORT_DISMISS: 'Report dismissed',
  REVIEW_HIDE: 'Review hidden',
  REVIEW_RESTORE: 'Review restored',
  CONFIRM: 'Confirmed',
  AUTO_CONFIRM: 'Auto-confirmed',
  REJECT: 'Rejected',
  USER_SUSPEND: 'User suspended',
  USER_UNSUSPEND: 'User unsuspended',
  MARK_INACCURATE: 'Marked inaccurate',
  CLEAR_INACCURATE: 'Inaccurate cleared',
};

/** Shelter-history action labels (M10 slice 2 — the Shelters-tab panel). */
export const SHELTER_HISTORY_ACTION_LABEL: Record<AdminShelterHistoryEvent['action'], string> = {
  CREATED: 'Created',
  EDITED: 'Edited',
  DELETED: 'Deleted',
};

/** M3 alert kind labels (abuse-limits slice 4): human copy for the
 *  machine kind values. */
export const ALERT_KIND_LABEL: Record<AdminAlertKind, string> = {
  'submission-daily-cap': 'Daily submission cap',
  'otp-contact-cap': 'OTP contact cap',
  'near-duplicate': 'Near-duplicate submission',
};

/**
 * /admin (adminGuard — admin-kind accounts only; anonymous AND authenticated
 * non-admins are redirected home by the guard, mirroring the backend's
 * 401/403 per request). Six tabs, each one queue:
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
 *  - REVIEW REPORTS — the review-report queue: shelter, review excerpt
 *    (stars + comment, hidden badge), reason, reporters, Hide/Restore.
 *    The action targets the REVIEW id, not the report row's id.
 *  - ALERTS — the M3 throttle-abuse ring (abuse-limits slice 4): the
 *    daily submission cap (429), the per-contact OTP cap (429) and the
 *    near-duplicate rejection (409), newest first. Read-only; the ring
 *    is in-memory on the backend (cleared on a restart — a triage view,
 *    not a durable log).
 *  - AUDIT (last) — the read-only moderation trail, newest 100 (lazy load
 *    on first switch): when / moderator / shelter / action / change /
 *    reason. Shelter names are resolved server-side (a deleted shelter
 *    reads "Deleted shelter").
 *
 * Mutations update the in-memory row in place (no full refetch — the backend
 * answers 204 with no body); a rejected mutation surfaces the server message
 * through the page-level error banner (bannerMessage: 403/409 echo the
 * backend message; 401 mid-session is the global interceptor's job). The
 * review actions are the exception: they refetch the shelters list so the
 * unconfirmed queue and the Shelters tab both reflect the new state.
 *
 *  - USERS (before the audit, M10 slice 1) — the account list: name, e-mail,
 *    kind, suspension state. Suspend is two-tap (arm + confirm, like the
 *    shelter delete) and idempotent server-side; a suspended row is dimmed
 *    with a "Suspended" badge and an Unsuspend action. Admin-kind rows are
 *    listed (the provisioned account is visible) but the Suspend action is
 *    never offered for them (backend 409 — lockout vector). Suspension
 *    stops the ACCOUNT (login/refresh/tokens), not its shelters.
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
    RatingStars,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage implements OnInit {
  private readonly admin = inject(AdminGateway);

  // ---- tabs ----------------------------------------------------------------
  protected readonly tab = signal<AdminTab>('unconfirmed');

  // ---- unconfirmed (review-queue) tab ------------------------------------------
  /** The queue: USER rows in the NEW state (client-side filter of the
   *  shelters list — no extra endpoint), newest first. */
  protected readonly unconfirmedRows = computed(() =>
    (this.shelterRows() ?? [])
      .filter((row) => row.source === 'USER' && row.reviewStatus === 'NEW')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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

  // ---- shelter history (M10 slice 2, D4) ---------------------------------------
  /** The row whose inline history panel is open (null = closed). */
  protected readonly historyFor = signal<number | null>(null);
  /** The open panel's events — null = loading, [] = loaded and empty. */
  protected readonly historyEvents = signal<AdminShelterHistoryEvent[] | null>(null);

  // ---- info request (M10 slice 3) -------------------------------------------------
  /** The row whose inline info-request panel is open (null = closed). */
  protected readonly infoFor = signal<number | null>(null);
  /** The question editor: required (non-blank — the shared blank validator),
   *  at most 2000 characters (the V19 bound). */
  readonly requestMessage = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(INFO_REQUEST_MAX)],
  });

  // ---- mark inaccurate (M10 slice 4) -----------------------------------------------
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

  // ---- review-report tab -----------------------------------------------------
  protected readonly reviewRows = signal<AdminReviewReportDto[] | null>(null);
  protected readonly reviewLoadError = signal<string | null>(null);

  // ---- audit tab ---------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly auditRows = signal<AdminAuditRow[] | null>(null);
  protected readonly auditLoadError = signal<string | null>(null);

  // ---- alerts tab ------------------------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly alertsRows = signal<AdminAlertRow[] | null>(null);
  protected readonly alertsLoadError = signal<string | null>(null);

  // ---- users tab (M10 slice 1) ----------------------------------------------------
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  protected readonly userRows = signal<AdminUserDto[] | null>(null);
  protected readonly userLoadError = signal<string | null>(null);
  /** Two-tap suspend/unsuspend confirm: the armed target (null = closed). */
  protected readonly confirmingUserAction = signal<{
    id: number;
    action: 'suspend' | 'unsuspend';
  } | null>(null);

  // ---- shared UI state ---------------------------------------------------------
  /** One in-flight mutation at a time (the row buttons all share it). */
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** Two-tap delete confirm: the armed shelter id (no window.confirm). */
  protected readonly confirmingDelete = signal<number | null>(null);

  // ---- shared copy helpers (exposed to the template) ---------------------------
  protected readonly ratingText = ratingTextShared;
  protected readonly reporterText = reporterText;
  protected readonly flagText = statusFlagText;
  /** Provenance badge copy (shelter-provenance-taxonomy M6): the Shelters
   *  tab's source column shows the server-derived taxonomy value — the
   *  admin list keeps hidden rows, so REPORTED_INACTIVE / REJECTED render
   *  their own tones here. */
  protected readonly provenanceText = provenanceTextShared;
  protected readonly provenanceBadgeClass = provenanceBadgeClassShared;
  protected readonly privateLocationBadge = PRIVATE_LOCATION_BADGE;
  protected readonly isPrivateLocation = isPrivateLocationShared;
  /** The single-sourced "reported inaccurate" warning + the admin-list
   *  badge (M10 slice 4). */
  protected readonly inaccurateWarning = INACCURATE_WARNING;
  protected readonly inaccurateBadge = INACCURATE_BADGE;

  /** The admin occupancy block into the shared occupancy copy (its shape
   *  differs only in the field name: reportedAt vs lastReportedAt). */
  protected occupancyText(occ: AdminOccupancy | null, now: number = Date.now()): string | null {
    if (occ === null) {
      return null;
    }
    const publicShape: ShelterOccupancy = {
      band: occ.band,
      reportCount: occ.reportCount,
      lastReportedAt: occ.reportedAt,
    };
    return occupancyTextShared(publicShape, now);
  }

  /** Queue-row age ("12 min ago") — the shared recency copy. */
  protected ageText(iso: string): string {
    return recencyText(iso);
  }

  protected reportTypeLabel(type: ShelterReportType): string {
    return SHELTER_REPORT_TYPE_LABEL[type];
  }

  protected reasonLabel(reason: ReviewReportReason): string {
    return REVIEW_REPORT_REASON_LABEL[reason];
  }

  /** Audit-log action label (the machine value → human copy). */
  protected auditActionLabel(action: AdminAuditAction): string {
    return AUDIT_ACTION_LABEL[action];
  }

  /** M3 alert kind label (the machine value → human copy). */
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

  ngOnInit(): void {
    // The default tab (Unconfirmed) filters the shelters list, so that list
    // loads immediately; reports/reviews/audit load lazily on first switch
    // (a visit after a load keeps the in-memory rows — the queue does not
    // refetch itself).
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
      case 'reviews':
        if (this.reviewRows() === null && this.reviewLoadError() === null) {
          this.loadReviews();
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
    this.confirmingDelete.set(null);
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
    this.confirmingDelete.set(id);
  }

  cancelDelete(): void {
    this.confirmingDelete.set(null);
  }

  /** Step 2: DELETE /admin/shelters/{id} (204). The row is removed in place;
   *  reviews/reports/occupancy cascade server-side. */
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
      this.confirmingDelete.set(null);
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Info request (M10 slice 3)
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
  // Shelter history (M10 slice 2, D4)
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
  // Review-report tab
  // -------------------------------------------------------------------------
  loadReviews(): void {
    this.reviewRows.set(null);
    this.reviewLoadError.set(null);
    this.admin
      .listReviewReports()
      .then((rows) => this.reviewRows.set(rows))
      .catch((error: unknown) => this.reviewLoadError.set(bannerMessage(error, 'shelter')));
  }

  /** Hide the reviewed review (targets row.reviewId — the REVIEW id). */
  async hideReview(row: AdminReviewReportDto): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.hideReview(row.reviewId);
      this.patchReview(row.id, { reviewHidden: true });
      this.success.set('Review hidden.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Restore a hidden review (clears the marker; rejoins the public list). */
  async restoreReview(row: AdminReviewReportDto): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.clearFeedback();
    this.busy.set(true);
    try {
      await this.admin.restoreReview(row.reviewId);
      this.patchReview(row.id, { reviewHidden: false });
      this.success.set('Review restored.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'shelter'));
    } finally {
      this.busy.set(false);
    }
  }

  private patchReview(reportRowId: number, patch: Partial<AdminReviewReportDto>): void {
    this.reviewRows.update((rows) =>
      (rows ?? []).map((r) => (r.id === reportRowId ? { ...r, ...patch } : r)),
    );
  }

  // -------------------------------------------------------------------------
  // Alerts tab (M3 slice 4)
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
  // Users tab (M10 slice 1)
  // -------------------------------------------------------------------------
  loadUsers(): void {
    this.userRows.set(null);
    this.userLoadError.set(null);
    this.confirmingUserAction.set(null);
    this.admin
      .listUsers()
      .then((rows) => this.userRows.set(rows))
      .catch((error: unknown) => this.userLoadError.set(bannerMessage(error, 'shelter')));
  }

  /** Step 1 of the two-tap confirm: arm the confirm strip for the row. */
  requestUserAction(id: number, action: 'suspend' | 'unsuspend'): void {
    this.clearFeedback();
    this.confirmingUserAction.set({ id, action });
  }

  cancelUserAction(): void {
    this.confirmingUserAction.set(null);
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
      this.confirmingUserAction.set(null);
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
