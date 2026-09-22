import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AdminUserDto } from '../../core/models';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { ConfirmAction } from '../../shared/confirm-action';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ListState } from '../../shared/list-state';
import { Pagination } from '../../shared/pagination';
import { PAGE_SIZES } from '../../shared/paging';

/**
 * The Users tab panel (before the authoring tabs): the account list —
 * name, e-mail, kind, suspension state, newest ids last (id-ordered).
 *
 * Presentation only (the extracted-panel contract): the page owns the
 * rows, the URL-backed view (userPage/userSize), the two-tap confirm
 * instance (it disarms it from the tab-switch path) and the gateway
 * calls; the panel renders the paged table and emits the intents.
 *
 * Suspension stops the ACCOUNT (login/refresh/tokens), not its
 * shelters. Suspend is two-tap (arm + confirm, the shared
 * ConfirmAction owns the state machine, the focus move and the focus
 * restore) and idempotent server-side; a suspended row is dimmed with a
 * "Suspended" badge and an Unsuspend action. Admin-kind rows are listed
 * (the provisioned account is visible) but the Suspend action is never
 * offered for them (backend 403 — a lockout vector).
 *
 * The list pages on the shared control (the owner's "every admin list
 * pages" rule — W2-D's `app-pagination` + the honest `app-list-state`
 * states, the same control as the shelters list).
 */
@Component({
  selector: 'app-users-panel',
  imports: [DatePipe, LoadingIndicator, ListState, Pagination, TranslatePipe],
  templateUrl: './users-panel.html',
  styleUrl: './users-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPanel {
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  readonly rows = input<AdminUserDto[] | null>(null);
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
  /** The two-tap suspend/unsuspend confirm: the PAGE owns the instance
   *  (it disarms it from the tab-switch and load paths); this template
   *  renders the trigger and the strip. */
  readonly actionConfirm = input<ConfirmAction<number, 'suspend' | 'unsuspend'> | null>(null);

  readonly retry = output<void>();
  readonly navigate = output<{ page: number; size: number }>();
  readonly goFirstPage = output<void>();
  readonly requestUserAction = output<{ id: number; action: 'suspend' | 'unsuspend' }>();
  readonly confirmUserAction = output<{ id: number; action: 'suspend' | 'unsuspend' }>();
  readonly cancelUserAction = output<void>();

  onRetry(): void {
    this.retry.emit();
  }

  onNavigate(view: { page: number; size: number }): void {
    this.navigate.emit(view);
  }

  onGoFirstPage(): void {
    this.goFirstPage.emit();
  }

  onRequestUserAction(id: number, action: 'suspend' | 'unsuspend'): void {
    this.requestUserAction.emit({ id, action });
  }

  onConfirmUserAction(id: number, action: 'suspend' | 'unsuspend'): void {
    this.confirmUserAction.emit({ id, action });
  }

  onCancelUserAction(): void {
    this.cancelUserAction.emit();
  }
}
