import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '../core/i18n/translate-pipe';
import type { MessageKey } from '../core/i18n/messages';

/**
 * The shared page + page-size control (list-page-paging). Renders the
 * prev/next buttons, the "Page X of Y" status line and the size selector
 * (10..100 in steps of 10 by default — the owner's paging contract).
 *
 * <p>Pointless-control rule: it renders NOTHING while {@code pages < 2} —
 * an empty list and a single-page list show no chrome at all, because at
 * one page the size selector cannot change what is on screen either.
 *
 * <p>Presentation only: the component owns NO URL. The host page receives
 * the intent through {@link onNavigate} and writes the page number and
 * the size to the route query (so a link or a refresh keeps the view —
 * and the host is the one that clamps a size change which would strand
 * the current page beyond the last one).
 *
 * <p>Keyboard-reachable by construction: real {@code <button>}s for
 * prev/next (disabled at the boundary, never hidden mid-list) and a
 * native {@code <select>} for the size.
 */
@Component({
  selector: 'app-pagination',
  imports: [NgIf, TranslatePipe],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  /** The current page (1-based). */
  readonly page = input.required<number>();
  /** The total number of pages at the current size (0 or 1 = no chrome). */
  readonly pages = input.required<number>();
  /** The current page size (the selector's value). */
  readonly size = input.required<number>();
  /**
   * The selectable sizes. The host passes the range its ENDPOINT actually
   * serves — the control must never offer a size the backend would reject
   * (the shelter/guidance endpoints bound limit at 200, so 10..100 always
   * fits); 10..100 step 10 is the default.
   */
  readonly sizes = input<number[]>([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  /** The "per page" label key (posts by default; a host with other rows
   *  passes its own — the numbers themselves are never translated). */
  readonly sizeLabelKey = input<MessageKey>('pagination.size');
  /** The navigation intent: the host writes {page, size} to the URL. */
  readonly onNavigate = output<{ page: number; size: number }>();

  onPrev(): void {
    this.onNavigate.emit({ page: this.page() - 1, size: this.size() });
  }

  onNext(): void {
    this.onNavigate.emit({ page: this.page() + 1, size: this.size() });
  }

  onSizeChange(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (Number.isInteger(size) && size > 0) {
      this.onNavigate.emit({ page: this.page(), size });
    }
  }
}
