import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { MediaAssetDto } from '../../core/models';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { ConfirmAction } from '../../shared/confirm-action';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ListState } from '../../shared/list-state';
import { Pagination } from '../../shared/pagination';
import { PAGE_SIZES } from '../../shared/paging';

/**
 * The Media Library tab panel: the asset inventory
 * — thumbnail, filename, dimensions, size, upload date, reused-by count
 * — plus the multipart upload (field `file`).
 *
 * Presentation only (the extracted-panel contract): the page owns the
 * rows, the URL-backed view (mediaPage/mediaSize), the upload, the
 * delete and the banner copy; the panel renders the upload zone and the
 * paged table and emits the intents. The list pages on the shared
 * control (the owner's "every admin list pages" rule — its
 * `app-pagination` + the honest `app-list-state` states, the same
 * control as the shelters list); the newest-first order means a fresh
 * upload lands on page 1 (the page navigates there after a successful
 * upload).
 *
 * Delete is API-FIRST — the first tap calls DELETE (unreferenced → 200,
 * row gone; referenced → 409 naming the affected posts, which arms the
 * confirm strip that re-issues with confirm=true — never a dead end).
 * The in-use confirm instance is PAGE-owned (the tab-switch path
 * disarms it); the panel renders the trigger and the strip.
 */
@Component({
  selector: 'app-media-panel',
  imports: [DatePipe, LoadingIndicator, ListState, Pagination, TranslatePipe],
  templateUrl: './media-panel.html',
  styleUrl: './media-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPanel {
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty.
   *  Newest first; the guidance editor's hero picker reuses these rows
   *  (the current page of the library). */
  readonly rows = input<MediaAssetDto[] | null>(null);
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
  /** The in-use delete confirm: the PAGE owns the instance (it disarms
   *  it from the tab-switch path); this template renders the trigger
   *  and the strip. The armed value is the 409's server message
   *  (naming the affected posts). */
  readonly deleteInUse = input<ConfirmAction<number, string> | null>(null);

  readonly retry = output<void>();
  readonly navigate = output<{ page: number; size: number }>();
  readonly goFirstPage = output<void>();
  /** The file input's chosen file (the page hands it to the upload). */
  readonly fileChosen = output<File>();
  readonly requestDelete = output<number>();
  readonly confirmDelete = output<number>();
  readonly cancelDelete = output<void>();

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

  onRetry(): void {
    this.retry.emit();
  }

  onNavigate(view: { page: number; size: number }): void {
    this.navigate.emit(view);
  }

  onGoFirstPage(): void {
    this.goFirstPage.emit();
  }

  /** The file input's change: hand the chosen file to the page (the
   *  input value resets FIRST — the same file stays re-selectable). */
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Index access (not .item): FileList is indexable, and the spec sets
    // a plain array on `files`.
    const file = input.files?.[0];
    input.value = '';
    if (file !== null && file !== undefined) {
      this.fileChosen.emit(file);
    }
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
}
