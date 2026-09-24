import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import type {
  AdminShelterDto,
  AdminShelterHistoryEvent,
  AdminShelterHistoryFieldChange,
  AdminOccupancy,
  ShelterSourceFilter,
} from '../../core/models';
import type { MessageKey } from '../../core/i18n/messages';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { ConfirmAction } from '../../shared/confirm-action';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ListState } from '../../shared/list-state';
import { Pagination } from '../../shared/pagination';
import { PAGE_SIZES } from '../../shared/paging';
import { SHELTER_HISTORY_ACTION_LABEL } from '../../shared/admin-copy';
import {
  occupancyText as occupancyTextShared,
  sourceTrustLabel as sourceTrustLabelShared,
  communityBadgeClass as communityBadgeClassShared,
  isPrivateLocation as isPrivateLocationShared,
} from '../../shared/shelter-copy';

/**
 * The Shelters tab panel: every row incl. hidden — the name/address
 * search (submit-based, the server does the substring match; the term is
 * URL-backed — the tab-scoped `shelterQ`, the page owns the control and
 * the submit's URL), the source chips (All / Registry / Community), the
 * paged table, the inline
 * history / info-request / mark-inaccurate panels and the two-tap
 * delete confirm for USER rows (registry rows are read-only —
 * import-owned, the UI never offers actions for them).
 *
 * Presentation only (the extracted-panel contract): the page owns the
 * rows, the URL-backed view (source/shelterPage/shelterSize), the form
 * controls, the confirm instance and every mutation; the panel renders
 * the toolbar, the table and the inline panels and emits the intents.
 *
 * The list pages on the shared control (its `app-pagination` + the
 * honest `app-list-state` states) — the owner's "every admin list pages"
 * rule, this surface's first adopter.
 */
@Component({
  selector: 'app-shelters-panel',
  imports: [
    DatePipe,
    NgClass,
    RouterLink,
    ReactiveFormsModule,
    LoadingIndicator,
    ListState,
    Pagination,
    TranslatePipe,
  ],
  templateUrl: './shelters-panel.html',
  styleUrl: './shelters-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheltersPanel {
  private readonly i18n = inject(I18nService);

  /** The current PAGE (server-paged); null = loading; [] = loaded and
   *  empty. */
  readonly rows = input<AdminShelterDto[] | null>(null);
  readonly loadError = input<string | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The search input (the PAGE owns the control — it composes the
   *  submit's URL). */
  readonly searchQuery = input.required<FormControl<string>>();
  /** The APPLIED search term (the page's submit-backed signal — distinct
   *  from the input's unsubmitted draft, which is user state, not view
   *  state): part of the empty-state's "a filter is active" test. */
  readonly appliedQuery = input('');
  /** The active source chip (the URL-backed filter). */
  readonly source = input<ShelterSourceFilter>('ALL');
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
  /** The row whose inline history panel is open (null = closed). */
  readonly historyFor = input<number | null>(null);
  /** The open panel's events — null = loading, [] = loaded and empty. */
  readonly historyEvents = input<AdminShelterHistoryEvent[] | null>(null);
  /** The row whose inline info-request panel is open (null = closed). */
  readonly infoFor = input<number | null>(null);
  /** The info-request question editor (the PAGE owns the control). */
  readonly requestMessage = input.required<FormControl<string>>();
  /** The row whose inline mark-inaccurate editor is open (null = closed). */
  readonly inaccurateFor = input<number | null>(null);
  /** The mark-inaccurate reason editor (the PAGE owns the control). */
  readonly inaccurateReason = input.required<FormControl<string>>();
  /** The two-tap delete confirm (the PAGE owns the instance — it disarms
   *  it from the tab-switch and load paths). */
  readonly deleteConfirm = input.required<ConfirmAction<number>>();

  readonly retry = output<void>();
  readonly searchSubmit = output<void>();
  readonly sourceChip = output<ShelterSourceFilter>();
  readonly navigate = output<{ page: number; size: number }>();
  readonly goFirstPage = output<void>();
  readonly openHistory = output<AdminShelterDto>();
  readonly toggleInfo = output<AdminShelterDto>();
  readonly closeInfo = output<void>();
  readonly sendInfoRequest = output<AdminShelterDto>();
  readonly toggleInaccurate = output<AdminShelterDto>();
  readonly markInaccurateAction = output<AdminShelterDto>();
  readonly clearInaccurateAction = output<AdminShelterDto>();
  readonly closeInaccurate = output<void>();
  readonly requestDelete = output<number>();
  readonly confirmDelete = output<number>();
  readonly cancelDelete = output<void>();
  readonly hideShelter = output<AdminShelterDto>();
  readonly activateShelter = output<AdminShelterDto>();

  /** The i18n seam: the shared shelter-copy helpers resolve their copy
   *  through the active locale (the map-page's idiom). */
  private readonly translate = (
    key: MessageKey,
    params?: Record<string, string | number>,
  ): string => this.i18n.t(key, params);

  /** The source filter chips (the table's source vocabulary, short).
   *  All = no filter. */
  protected readonly sourceChips: { value: ShelterSourceFilter; label: MessageKey }[] = [
    { value: 'ALL', label: 'admin.shelters.source.all' },
    { value: 'REGISTRY', label: 'admin.shelters.source.registry' },
    { value: 'USER', label: 'admin.shelters.source.community' },
  ];

  /** Source/trust badge copy (community-review-queue): the source
   *  column shows the source label (registry rows) or the trust-state
   *  label — the admin list keeps hidden rows, so REJECTED renders its
   *  own tone here. Resolved through the active locale. */
  protected sourceTrustLabel(row: AdminShelterDto): string {
    return sourceTrustLabelShared(row, this.translate);
  }

  protected readonly communityBadgeClass = communityBadgeClassShared;
  protected readonly isPrivateLocation = isPrivateLocationShared;

  /** The Reports column: the open trust-report total that drives the
   *  reported state — `nonexistentReports` + the open
   * inaccurate-information reports (the OR of the two, the backend
   *  contract note — the same sum the public "Reported" badge shows).
   *  An older backend omits `inaccurateReports` — absent reads as 0. */
  protected reportedCount(row: AdminShelterDto): number {
    return row.nonexistentReports + (row.inaccurateReports ?? 0);
  }

  /** The admin occupancy block into the shared occupancy copy — the SAME
   *  wire shape as the public list's block (`lastReportedAt` included). */
  protected occupancyText(occ: AdminOccupancy | null, now: number = Date.now()): string | null {
    if (occ === null) {
      return null;
    }
    return occupancyTextShared(occ, now, this.translate);
  }

  /** Edit-history action label (the machine value → human copy). */
  protected historyActionLabel(action: AdminShelterHistoryEvent['action']): string {
    return SHELTER_HISTORY_ACTION_LABEL[action];
  }

  /** The history event's field change as "field: old → new". */
  protected historyChangeText(change: AdminShelterHistoryFieldChange): string {
    return `${change.field}: ${change.from ?? '—'} → ${change.to ?? '—'}`;
  }

  onRetry(): void {
    this.retry.emit();
  }

  onSearchSubmit(): void {
    this.searchSubmit.emit();
  }

  onSourceChip(source: ShelterSourceFilter): void {
    this.sourceChip.emit(source);
  }

  onNavigate(view: { page: number; size: number }): void {
    this.navigate.emit(view);
  }

  onGoFirstPage(): void {
    this.goFirstPage.emit();
  }

  onOpenHistory(row: AdminShelterDto): void {
    this.openHistory.emit(row);
  }

  onToggleInfo(row: AdminShelterDto): void {
    this.toggleInfo.emit(row);
  }

  onCloseInfo(): void {
    this.closeInfo.emit();
  }

  onSendInfoRequest(row: AdminShelterDto): void {
    this.sendInfoRequest.emit(row);
  }

  onToggleInaccurate(row: AdminShelterDto): void {
    this.toggleInaccurate.emit(row);
  }

  onMarkInaccurateAction(row: AdminShelterDto): void {
    this.markInaccurateAction.emit(row);
  }

  onClearInaccurateAction(row: AdminShelterDto): void {
    this.clearInaccurateAction.emit(row);
  }

  onCloseInaccurate(): void {
    this.closeInaccurate.emit();
  }

  onRequestDelete(id: number): void {
    this.requestDelete.emit(id);
  }

  onConfirmDelete(id: number): void {
    this.confirmDelete.emit(id);
  }

  onCancelDelete(): void {
    this.cancelDelete.emit();
  }

  onHideShelter(row: AdminShelterDto): void {
    this.hideShelter.emit(row);
  }

  onActivateShelter(row: AdminShelterDto): void {
    this.activateShelter.emit(row);
  }
}
