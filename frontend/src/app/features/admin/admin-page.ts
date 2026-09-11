import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  AdminOccupancy,
  AdminShelterDto,
  AdminShelterReportDto,
  AdminReviewReportDto,
  ShelterOccupancy,
  ShelterReportType,
  ShelterSource,
  ShelterStatus,
  ReviewReportReason,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { bannerMessage } from '../../shared/error-copy';
import {
  occupancyText as occupancyTextShared,
  recencyText,
  ratingText as ratingTextShared,
  statusFlagText,
} from '../../shared/shelter-copy';
import { BannerComponent } from '../../shared/banner.component';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { RatingStars } from '../../shared/rating-stars';

/** The three moderation tabs. */
export type AdminTab = 'shelters' | 'reports' | 'reviews';

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

/** The source column: the public provenance wording without the USER
 *  verified split (the admin sees the submitter's name in its own column). */
export function adminSourceLabel(source: ShelterSource): string {
  if (source === 'PAASETEAMET') {
    return 'Paasteamet registry';
  }
  if (source === 'MUNICIPALITY') {
    return 'Municipal registry';
  }
  return 'User';
}

/** Reporter identity for a queue row: name + e-mail, null-safe. */
export function reporterText(row: {
  reporterName: string | null;
  reporterEmail: string | null;
}): string {
  const name = row.reporterName ?? 'Unknown';
  return row.reporterEmail === null ? name : `${name} <${row.reporterEmail}>`;
}

/**
 * /admin (adminGuard — admin-kind accounts only; anonymous AND authenticated
 * non-admins are redirected home by the guard, mirroring the backend's
 * 401/403 per request). Three tabs, each one queue:
 *
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
 *
 * Mutations update the in-memory row in place (no full refetch — the backend
 * answers 204 with no body); a rejected mutation surfaces the server message
 * through the page-level error banner (bannerMessage: 403/409 echo the
 * backend message; 401 mid-session is the global interceptor's job).
 */
@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent, LoadingIndicator, RatingStars],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage implements OnInit {
  private readonly admin = inject(AdminGateway);

  // ---- tabs ----------------------------------------------------------------
  protected readonly tab = signal<AdminTab>('shelters');

  // ---- shelters tab ----------------------------------------------------------
  /** null = loading; [] = loaded and empty. */
  protected readonly shelterRows = signal<AdminShelterDto[] | null>(null);
  protected readonly shelterLoadError = signal<string | null>(null);
  /** The active name/address search term (set on submit). */
  protected readonly shelterQuery = signal('');
  /** Search input (public so specs can drive it — page convention). */
  readonly searchQuery = new FormControl('', { nonNullable: true });

  // ---- shelter-report tab ----------------------------------------------------
  protected readonly reportRows = signal<AdminShelterReportDto[] | null>(null);
  protected readonly reportLoadError = signal<string | null>(null);

  // ---- review-report tab -----------------------------------------------------
  protected readonly reviewRows = signal<AdminReviewReportDto[] | null>(null);
  protected readonly reviewLoadError = signal<string | null>(null);

  // ---- shared UI state ---------------------------------------------------------
  /** One in-flight mutation at a time (the row buttons all share it). */
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** Two-tap delete confirm: the armed shelter id (no window.confirm). */
  protected readonly confirmingDelete = signal<number | null>(null);

  // ---- shared copy helpers (exposed to the template) ---------------------------
  protected readonly ratingText = ratingTextShared;
  protected readonly sourceLabel = adminSourceLabel;
  protected readonly reporterText = reporterText;
  protected readonly flagText = statusFlagText;

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

  ngOnInit(): void {
    // The default tab loads immediately; the other tabs load lazily on
    // first switch (a visit after a load keeps the in-memory rows — the
    // queue does not refetch itself).
    this.loadShelters();
  }

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------
  switchTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.clearFeedback();
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

  /** Search submit: capture the term and re-query (the server does the
   *  name/address substring match — no client-side filtering). */
  onSearchSubmit(): void {
    this.shelterQuery.set(this.searchQuery.value.trim());
    this.clearFeedback();
    this.confirmingDelete.set(null);
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
      this.confirmingDelete.set(null);
      this.busy.set(false);
    }
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

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
