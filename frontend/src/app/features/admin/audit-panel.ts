import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AdminAuditAction, AdminAuditRow } from '../../core/models';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ListState } from '../../shared/list-state';
import { Pagination } from '../../shared/pagination';
import { PAGE_SIZES } from '../../shared/paging';
import { AUDIT_ACTION_LABEL } from '../../shared/admin-copy';

/**
 * The Audit tab panel (last tab — the read-only moderation trail):
 * when / moderator / shelter / action / change / reason, newest first.
 *
 * Presentation only (the extracted-panel contract): the page owns the
 * rows, the URL-backed view (reportPage… no — auditPage/auditSize), the
 * load and the banner copy; the panel renders the paged list and emits
 * the intents. The list pages on the shared control (the owner's
 * "every admin list pages" rule — its `app-pagination` + the honest
 * `app-list-state` states, the same control as the shelters list).
 *
 * Shelter names are resolved server-side (a deleted shelter reads
 * "Deleted shelter"); the guidance/media rows read their
 * subjectLabel snapshot in the same column.
 */
@Component({
  selector: 'app-audit-panel',
  imports: [DatePipe, LoadingIndicator, ListState, Pagination, TranslatePipe],
  templateUrl: './audit-panel.html',
  styleUrl: './audit-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPanel {
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  readonly rows = input<AdminAuditRow[] | null>(null);
  readonly loadError = input<string | null>(null);
  /** The current page (1-based), its count and the out-of-range flag —
   *  a past-the-end page renders the explicit notice, never a bare
   *  empty list (the shared component). */
  readonly page = input(1);
  readonly pages = input(1);
  readonly size = input(20);
  readonly outOfRange = input(false);
  /** The SELECTABLE SIZES — the range the endpoint serves (limit 1..200
   *  honours all of 10..100 step 10): a plain property, the app's fixed
   *  paging vocabulary. */
  protected readonly pageSizes = PAGE_SIZES;

  readonly retry = output<void>();
  /** The pagination control's intent (prev/next/size). */
  readonly navigate = output<{ page: number; size: number }>();
  /** The out-of-range notice's action: back to the first page. */
  readonly goFirstPage = output<void>();

  /** Audit-log action label (the machine value → human copy). */
  protected auditActionLabel(action: AdminAuditAction): string {
    return AUDIT_ACTION_LABEL[action];
  }

  /** Audit-log status change cell: "A → B", the single status when one
   *  side is null (delete/reject), or "—" when neither (e.g. report
   *  dismiss). */
  protected auditChangeText(previous: string | null, next: string | null): string {
    if (previous === null && next === null) {
      return '—';
    }
    if (previous === null || next === null) {
      return (previous ?? next) as string;
    }
    return `${previous} → ${next}`;
  }

  onRetry(): void {
    this.retry.emit();
  }

  onNavigate(view: { page: number; size: number }): void {
    this.navigate.emit(view);
  }

  onGoFirstPage(): void {
    this.goFirstPage.emit();
  }
}
