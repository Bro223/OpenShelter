import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AdminShelterReportDto, ShelterReportType } from '../../core/models';
import type { MessageKey } from '../../core/i18n/messages';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ListState } from '../../shared/list-state';
import { Pagination } from '../../shared/pagination';
import { PAGE_SIZES } from '../../shared/paging';
import { reporterText, SHELTER_REPORT_TYPE_LABEL } from '../../shared/admin-copy';
import { recencyText } from '../../shared/shelter-copy';

/**
 * The Shelter-reports tab panel: the report queue — shelter link, type,
 * reporter, age, detail, the dismiss / restore actions.
 *
 * Presentation only (the extracted-panel contract): the page owns the
 * rows, the URL-backed view (reportPage/reportSize + the `excludeDismissed`
 * filter), the mutations and the banner copy; the panel renders the
 * filter chips, the queue and the paged list and emits the intents.
 *
 * The hide-dismissed filter (the owner's first-class control): the chips
 * are a pressed-state group, the DEFAULT is 'All' — everything renders,
 * nothing is hidden silently. 'Open only' asks the endpoint for the OPEN
 * scope (`excludeDismissed=true`): the dismissed (resolved) rows are out
 * of the list AND of the page count, agreeing with the per-shelter open
 * counts the Shelters tab's pins express. With the default the
 * dismissed rows stay in the queue, DIMMED (audit trail — the admin sees
 * what was resolved).
 *
 * The list pages on the shared control (the owner's "every admin list
 * pages" rule — its `app-pagination` + the honest `app-list-state`
 * states, the same control as the shelters list): the server slices the
 * (filtered) newest-first queue with limit/offset and the un-paged
 * (filtered) total arrives as X-Total-Count.
 */
@Component({
  selector: 'app-reports-panel',
  imports: [RouterLink, LoadingIndicator, ListState, Pagination, TranslatePipe],
  templateUrl: './reports-panel.html',
  styleUrl: './reports-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPanel {
  private readonly i18n = inject(I18nService);

  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  readonly rows = input<AdminShelterReportDto[] | null>(null);
  readonly loadError = input<string | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
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
  /** The hide-dismissed filter (the owner's control): false = 'All'
   *  (the default — dismissed rows render, dimmed); true = 'Open only'
   *  (the endpoint's filtered scope). */
  readonly excludeDismissed = input(false);

  readonly retry = output<void>();
  readonly navigate = output<{ page: number; size: number }>();
  readonly goFirstPage = output<void>();
  /** The filter chips' intent: the new scope (false = All, true = Open). */
  readonly filterChange = output<boolean>();
  readonly dismissReport = output<number>();
  readonly restoreShelter = output<number>();

  /** The i18n seam: the shared copy helpers resolve through the active
   *  locale (the map-page's idiom) — the queue reads in the moderator's
   *  language, not a frozen English const. */
  private readonly translate = (
    key: MessageKey,
    params?: Record<string, string | number>,
  ): string => this.i18n.t(key, params);

  /** Queue-row age ("12 min ago") — the shared recency copy (active
   *  locale). */
  protected ageText(iso: string): string {
    return recencyText(iso, Date.now(), this.translate);
  }

  protected reportTypeLabel(type: ShelterReportType): string {
    return SHELTER_REPORT_TYPE_LABEL[type];
  }

  /** Reporter identity for a queue row: name + e-mail, null-safe (the
   *  shared admin copy). */
  protected readonly reporterText = reporterText;

  onRetry(): void {
    this.retry.emit();
  }

  onNavigate(view: { page: number; size: number }): void {
    this.navigate.emit(view);
  }

  onGoFirstPage(): void {
    this.goFirstPage.emit();
  }

  onFilterChange(exclude: boolean): void {
    this.filterChange.emit(exclude);
  }

  onDismissReport(id: number): void {
    this.dismissReport.emit(id);
  }

  onRestoreShelter(shelterId: number): void {
    this.restoreShelter.emit(shelterId);
  }
}
