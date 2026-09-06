import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RatingStars } from './rating-stars';

/**
 * The signed-in user's own review form (01 puml, M5 design decision 2 —
 * forms stay dumb: this component collects {rating, comment} and emits
 * `save`; the PAGE calls the gateway and maps the upsert result).
 *
 * 'add' mode is shown when the user has no known review this session;
 * 'edit' mode seeds the picker/comment from the existing review and offers
 * "delete my review" (author-only, server-enforced). The backend upserts —
 * a first review is 201, a later one updates (200) — the page decides which
 * gateway method to call (06-CONTEXT decision 2: "mine" detection is local,
 * the v1 DTO carries no author identity).
 */
@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, RatingStars],
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewForm {
  /** 'add' = first review; 'edit' = the user already has one (this session). */
  readonly mode = input<'add' | 'edit'>('add');

  /** True while the page has a write in flight — both buttons disable. */
  readonly busy = input(false);

  /** Seed for the star picker (null = nothing picked yet). */
  readonly initialRating = input<number | null>(null);

  /** Seed for the comment (null = empty). */
  readonly initialComment = input<string | null>(null);

  /** Emitted with the collected review on submit (comment null = none). */
  readonly save = output<{ rating: number; comment: string | null }>();

  /** Emitted when "delete my review" is pressed (edit mode only). */
  readonly deleteReview = output<void>();

  readonly comment = new FormControl(this.initialComment() ?? '', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });

  /** The picked rating (1–5); null until the user chooses — required to save. */
  readonly rating = signal<number | null>(this.initialRating() ?? null);

  /** True once a submit failed for a missing rating (inline error, no crash). */
  protected readonly ratingMissing = signal(false);

  constructor() {
    // The parent re-seeds the form (mode switch / after a save refetch):
    // adopt the new seed values when they change. Unchanged seeds never
    // clobber in-progress typing — the parent only re-seeds after a save.
    effect(() => {
      this.rating.set(this.initialRating() ?? null);
      const seed = this.initialComment() ?? '';
      if (this.comment.value !== seed) {
        this.comment.setValue(seed);
      }
    });
  }

  /**
   * A method, not a computed: `comment.valid` is plain state, not a signal —
   * the template re-evaluates it on every change-detection pass, including
   * the one the reactive form triggers on value change (zoneless-safe).
   */
  protected canSave(): boolean {
    return this.rating() !== null && this.comment.valid;
  }

  protected ratingValue(): number | null {
    return this.rating();
  }

  protected onStars(value: number): void {
    this.rating.set(value);
    this.ratingMissing.set(false);
  }

  protected onSubmit(): void {
    const rating = this.rating();
    if (rating === null) {
      this.ratingMissing.set(true);
      return;
    }
    const text = this.comment.value.trim();
    this.save.emit({ rating, comment: text === '' ? null : text });
  }

  protected onDelete(): void {
    this.deleteReview.emit();
  }
}
