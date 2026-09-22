import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import type { AdminShelterDto } from '../../core/models';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { isPrivateLocation } from '../../shared/shelter-copy';

/**
 * The Unconfirmed tab panel (the community review queue, first tab):
 * every USER row in the NEW state — a client-side filter of the FULL
 * shelters list (the unconfirmed subset IS the queue, newest first).
 *
 * Presentation only (the extracted-panel contract): the page owns the
 * rows, the reject-reason form control and the review mutations; the
 * panel renders the queue and emits the intents.
 *
 * Deliberately UN-PAGED: the queue is a filter of the WHOLE un-paged
 * scope (the page keeps the full list so the Shelters tab's paging never
 * hollows out the queue) — there is no server-side scope to page
 * through, so the shared paging control has nothing to page (the owner's
 * "every admin list pages" rule applies where the endpoint pages).
 */
@Component({
  selector: 'app-unconfirmed-panel',
  imports: [ReactiveFormsModule, LoadingIndicator, TranslatePipe],
  templateUrl: './unconfirmed-panel.html',
  styleUrl: './unconfirmed-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnconfirmedPanel {
  /** The queue rows (USER + NEW, newest first); null = not loaded yet;
   *  [] = loaded and empty. */
  readonly rows = input<AdminShelterDto[] | null>(null);
  readonly loadError = input<string | null>(null);
  /** The page's shared busy flag (one in-flight mutation at a time). */
  readonly busy = input(false);
  /** The row whose reject-reason editor is open (null = closed). */
  readonly rejectFor = input<number | null>(null);
  /** The reject reason (the PAGE owns the control — it validates and
   *  resets it from the mutation path). */
  readonly rejectReason = input.required<FormControl<string>>();

  readonly retry = output<void>();
  readonly confirmRow = output<AdminShelterDto>();
  readonly openRejectEditor = output<AdminShelterDto>();
  readonly rejectRow = output<AdminShelterDto>();
  readonly cancelReject = output<void>();

  protected isPrivateLocation = isPrivateLocation;

  onRetry(): void {
    this.retry.emit();
  }

  onConfirmRow(row: AdminShelterDto): void {
    this.confirmRow.emit(row);
  }

  onOpenRejectEditor(row: AdminShelterDto): void {
    this.openRejectEditor.emit(row);
  }

  onRejectRow(row: AdminShelterDto): void {
    this.rejectRow.emit(row);
  }

  onCancelReject(): void {
    this.cancelReject.emit();
  }
}
