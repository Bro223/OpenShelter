import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  output,
  viewChildren,
} from '@angular/core';

/** The five selectable rating values (backend domain: 1..5). */
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Accessible 1–5 star rating (01 puml, M5 design decision 3 — ONE
 * presentational implementation, reused in the detail header, review rows
 * and the review form). No business logic, no API access.
 *
 * Display mode (default): renders a whole/fractional average with
 * half-star support plus the numeric value. The star strip is one image to
 * the screen reader (`role="img"`, aria-label "4.2 out of 5"); the individual
 * glyphs are aria-hidden. `rating = null` means "no ratings yet" (never an
 * invented 0 — 06-CONTEXT decision 3).
 *
 * Input mode: the same five stars become a keyboard-operable radio group —
 * click, arrow keys, Home/End and digit keys all select a value and emit
 * `selectionChange`; the parent owns the selection (`selected` input).
 */
@Component({
  selector: 'app-rating-stars',
  imports: [],
  templateUrl: './rating-stars.html',
  styleUrl: './rating-stars.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingStars {
  /** 'display' = average read-out; 'input' = 1–5 selector. */
  readonly mode = input<'display' | 'input'>('display');

  /** Display mode: the average to render (null = no ratings yet). */
  readonly rating = input<number | null>(null);

  /** Input mode: the current selection (null = nothing picked yet). */
  readonly selected = input<number | null>(null);

  /** Input mode: emitted with the picked value (1–5). */
  readonly selectionChange = output<number>();

  protected readonly starValues = STAR_VALUES;

  protected readonly starBtns = viewChildren<ElementRef<HTMLButtonElement>>('starBtn');

  /** Fill percentage (0..100) of star #index for the displayed average. */
  protected fill(index: number): number {
    const rating = this.rating();
    if (rating === null) {
      return 0;
    }
    // Round to a tenth of a percent — averages never need more precision,
    // and this keeps binary float drift (e.g. 4.2 - 4) out of the style.
    return Math.round(Math.min(1, Math.max(0, rating - index)) * 1000) / 10;
  }

  /** Display-mode accessible name: "4.2 out of 5", or the no-ratings notice. */
  protected ariaLabel(): string {
    const rating = this.rating();
    return rating === null ? 'No ratings yet' : `${rating.toFixed(1)} out of 5`;
  }

  /** Display-mode numeric value ("4.2"); null renders nothing. */
  protected ratingText(): string | null {
    const rating = this.rating();
    return rating === null ? null : rating.toFixed(1);
  }

  protected isInputMode(): boolean {
    return this.mode() === 'input';
  }

  protected isSelected(value: number): boolean {
    return this.selected() === value;
  }

  /** Roving tabindex: the selected star (or the first when none) is reachable. */
  protected tabIndexFor(value: number): number {
    if (!this.isInputMode()) {
      return -1;
    }
    const focusValue = this.selected() ?? 1;
    return value === focusValue ? 0 : -1;
  }

  protected pick(value: number): void {
    if (this.isInputMode() && !this.isSelected(value)) {
      this.selectionChange.emit(value);
      this.focusStar(value);
    }
  }

  /** Arrow/Home/End/digit keys — the radio-group keyboard pattern. */
  protected onStarKeydown(event: KeyboardEvent, value: number): void {
    if (!this.isInputMode()) {
      return;
    }
    const max = STAR_VALUES[STAR_VALUES.length - 1];
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(max, value + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(1, value - 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = max;
        break;
      default:
        if (/^[1-5]$/.test(event.key)) {
          next = Number(event.key);
        }
        break;
    }
    if (next !== null) {
      event.preventDefault();
      this.pick(next);
    }
  }

  private focusStar(value: number): void {
    this.starBtns()
      .find((btn) => Number(btn.nativeElement.dataset['value']) === value)
      ?.nativeElement.focus();
  }
}
