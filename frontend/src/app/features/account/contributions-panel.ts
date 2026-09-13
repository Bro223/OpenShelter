import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import {
  type AbstractControl,
  type ValidationErrors,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { MineShelterDto, MyReviewDto, UpdateShelterRequest } from '../../core/models';
import { ReviewGateway } from '../../gateways/review-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { AccountGateway } from '../../gateways/account-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { capacityValidator, nameBlankValidator, readCoordinate } from '../../shared/form-helpers';
import { LoadingIndicator } from '../../shared/loading-indicator';
import {
  communityBadgeClass as communityBadgeClassShared,
  communityTrustLabel as communityTrustLabelShared,
  ratingText as ratingTextShared,
} from '../../shared/shelter-copy';
import { RatingStars } from '../../shared/rating-stars';

/** Coordinate controls are required and within the geographic bounds (backend
 *  re-checks the same @DecimalMin/@DecimalMax). Estonia-ness is NOT checked
 *  client-side — the backend bbox is the gate; a 400 surfaces as the row error. */
function coordinateValidator(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = readCoordinate(control.value);
    if (value === null) {
      return { required: true };
    }
    if (value < min || value > max) {
      return { range: true };
    }
    return null;
  };
}

/**
 * "My contributions" panel on the /account page (user-contributions): the
 * caller's own shelters (list/edit/delete, inline) and reviews (list/edit/
 * delete, inline). One panel, two independent lists — each with its own
 * loading/empty/error state (the other list never blocks).
 *
 * Edit = inline expanding form in the row (one open at a time, signals —
 * no modal). Delete = two-step confirm (the button arm + "Confirm delete?";
 * no window.confirm, consistent with the app's inline style).
 *
 * After a successful mutation the in-memory row is updated from the response
 * (no full refetch); a shelter delete also drops its review row locally
 * (mirrors the DB's ON DELETE CASCADE). Rejected mutations (400/403/404)
 * surface a row-level error via the standard banner copy mapping — the row
 * stays in its previous state.
 */
@Component({
  selector: 'app-contributions-panel',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, NgClass, RatingStars, LoadingIndicator],
  templateUrl: './contributions-panel.html',
  styleUrl: './contributions-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContributionsPanel implements OnInit {
  private readonly shelters = inject(ShelterGateway);
  private readonly reviews = inject(ReviewGateway);
  private readonly account = inject(AccountGateway);

  // ---- shelters list -------------------------------------------------------
  /** null = loading; [] = loaded and empty. The /mine projection carries the
   *  review state (community-review-queue) — badges + the admin note. */
  protected readonly shelterRows = signal<MineShelterDto[] | null>(null);
  /** Load failure (non-null -> error state with Retry). */
  protected readonly shelterLoadError = signal<string | null>(null);

  // ---- reviews list --------------------------------------------------------
  protected readonly reviewRows = signal<MyReviewDto[] | null>(null);
  protected readonly reviewLoadError = signal<string | null>(null);

  // ---- inline edit state (one open at a time, across both lists) -----------
  protected readonly editingShelterId = signal<number | null>(null);
  protected readonly editingReviewShelterId = signal<number | null>(null);
  /** The review edit's current rating (pre-filled from the row; public so
   *  specs can drive it — page convention: forms public). */
  readonly editRating = signal<number>(5);

  // ---- two-step delete state -----------------------------------------------
  protected readonly confirmingShelterDelete = signal<number | null>(null);
  protected readonly confirmingReviewDelete = signal<number | null>(null);

  // ---- row-level mutation errors (backend rejected an edit/delete) ---------
  protected readonly shelterRowError = signal<{ id: number; message: string } | null>(null);
  protected readonly reviewRowError = signal<{ shelterId: number; message: string } | null>(null);

  protected readonly busy = signal(false);

  /** W24: the shared rating summary copy, exposed to the template. */
  protected readonly ratingText = ratingTextShared;
  /** Trust-state badge copy (community-review-queue): "Newly added" /
   *  "Community-checked" / "Rejected". */
  protected readonly trustLabel = communityTrustLabelShared;
  /** The trust-state badge tone: NEW amber, REJECTED danger, CONFIRMED green. */
  protected readonly communityBadgeClass = communityBadgeClassShared;

  /**
   * Auto-hidden row copy (user-contributions, shelter-trust-and-reports):
   * the owner's list includes INACTIVE (auto-hidden) rows, marked with the
   * community non-existence report count. Restore is admin-only — the user
   * UI offers no restore action, so the mark is the row's only new element.
   * Suppressed for REJECTED rows (community-review-queue): a rejection
   * also flips the status to INACTIVE, but the "Rejected" badge + the
   * admin's reason explain the state — the auto-hide mark would be noise.
   */
  protected hiddenText(row: MineShelterDto): string | null {
    if (row.status !== 'INACTIVE' || row.reviewStatus === 'REJECTED') {
      return null;
    }
    const n = row.nonexistentReports;
    return `Hidden — reported by the community (${n} report${n === 1 ? '' : 's'})`;
  }

  // ---- shelter edit form (pre-filled on Edit; public so specs can drive it)
  readonly editName = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(200),
      // Whitespace-only names pass Validators.required — mirror the backend
      // @NotBlank so we never PUT "   " (shared with /submit, A3).
      nameBlankValidator,
    ],
  });
  readonly editDescription = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(2000)],
  });
  readonly editCapacity = new FormControl<number | null>(null, { validators: [capacityValidator] });
  readonly editLatitude = new FormControl<number | null>(null, {
    validators: [coordinateValidator(-90, 90)],
  });
  readonly editLongitude = new FormControl<number | null>(null, {
    validators: [coordinateValidator(-180, 180)],
  });

  // ---- review edit form ------------------------------------------------------
  readonly editComment = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });

  ngOnInit(): void {
    // Both lists load in parallel; each owns its loading/empty/error state.
    this.loadShelters();
    this.loadReviews();
  }

  // -------------------------------------------------------------------------
  // Loading (per list, independent)
  // -------------------------------------------------------------------------
  loadShelters(): void {
    this.shelterRows.set(null);
    this.shelterLoadError.set(null);
    this.shelters
      .mine()
      .then((rows) => this.shelterRows.set(rows))
      .catch((error: unknown) => this.shelterLoadError.set(bannerMessage(error, 'shelter')));
  }

  loadReviews(): void {
    this.reviewRows.set(null);
    this.reviewLoadError.set(null);
    this.account
      .myReviews()
      .then((rows) => this.reviewRows.set(rows))
      .catch((error: unknown) => this.reviewLoadError.set(bannerMessage(error, 'shelter')));
  }

  // -------------------------------------------------------------------------
  // Shelter rows: view (routerLink in the template), inline edit, delete
  // -------------------------------------------------------------------------
  startEditShelter(row: MineShelterDto): void {
    this.editName.setValue(row.name);
    this.editDescription.setValue(row.description ?? '');
    this.editCapacity.setValue(row.capacity);
    this.editLatitude.setValue(row.latitude);
    this.editLongitude.setValue(row.longitude);
    this.editName.markAsUntouched();
    this.editDescription.markAsUntouched();
    this.editCapacity.markAsUntouched();
    this.editLatitude.markAsUntouched();
    this.editLongitude.markAsUntouched();
    // only one inline edit form at a time
    this.editingReviewShelterId.set(null);
    this.editingShelterId.set(row.id);
  }

  cancelEditShelter(): void {
    this.editingShelterId.set(null);
  }

  shelterFormValid(): boolean {
    return (
      this.editName.valid &&
      this.editDescription.valid &&
      this.editCapacity.valid &&
      this.editLatitude.valid &&
      this.editLongitude.valid
    );
  }

  /**
   * PUT /api/shelters/{id} with the five writable fields. Success updates the
   * row in place from the response (no full refetch); 400/403/404 shows a
   * row-level error and the row stays as it was.
   */
  async saveShelterEdit(): Promise<void> {
    const id = this.editingShelterId();
    if (this.busy() || id === null) {
      return;
    }
    if (!this.shelterFormValid()) {
      this.editName.markAsTouched();
      this.editDescription.markAsTouched();
      this.editCapacity.markAsTouched();
      this.editLatitude.markAsTouched();
      this.editLongitude.markAsTouched();
      return;
    }
    const request: UpdateShelterRequest = {
      name: this.editName.value.trim(),
      latitude: readCoordinate(this.editLatitude.value) as number,
      longitude: readCoordinate(this.editLongitude.value) as number,
    };
    const description = this.editDescription.value.trim();
    if (description !== '') {
      request.description = description;
    }
    const capacity = this.editCapacity.value;
    if (typeof capacity === 'number' && Number.isInteger(capacity)) {
      request.capacity = capacity;
    }
    this.busy.set(true);
    try {
      const updated = await this.shelters.update(id, request);
      // The PUT response is the public projection (no reviewNote) — keep the
      // row's review state from the /mine load.
      this.shelterRows.update((rows) =>
        (rows ?? []).map((r) => (r.id === id ? { ...updated, reviewNote: r.reviewNote } : r)),
      );
      // a renamed shelter keeps its review rows in sync (self-review case)
      this.reviewRows.update((rows) =>
        (rows ?? []).map((r) => (r.shelterId === id ? { ...r, shelterName: updated.name } : r)),
      );
      this.editingShelterId.set(null);
      this.shelterRowError.update((e) => (e && e.id === id ? null : e));
    } catch (error: unknown) {
      this.shelterRowError.set({ id, message: bannerMessage(error, 'shelter') });
    } finally {
      this.busy.set(false);
    }
  }

  /** Step 1 of the two-step delete: arm the confirm strip. */
  requestDeleteShelter(id: number): void {
    this.confirmingShelterDelete.set(id);
  }

  cancelDeleteShelter(): void {
    this.confirmingShelterDelete.set(null);
  }

  /** Step 2: DELETE /api/shelters/{id}; the row (and its cascaded review row)
   *  are removed from the lists in place. */
  async confirmDeleteShelter(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.shelters.remove(id);
      this.shelterRows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      // the DB cascades the shelter's reviews — mirror that in memory
      this.reviewRows.update((rows) => (rows ?? []).filter((r) => r.shelterId !== id));
      this.shelterRowError.update((e) => (e && e.id === id ? null : e));
    } catch (error: unknown) {
      this.shelterRowError.set({ id, message: bannerMessage(error, 'shelter') });
    } finally {
      this.confirmingShelterDelete.set(null);
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Review rows: navigate (routerLink in the template), inline edit, delete
  // -------------------------------------------------------------------------
  startEditReview(row: MyReviewDto): void {
    this.editRating.set(row.rating);
    this.editComment.setValue(row.comment ?? '');
    this.editComment.markAsUntouched();
    this.editingShelterId.set(null);
    this.editingReviewShelterId.set(row.shelterId);
  }

  cancelEditReview(): void {
    this.editingReviewShelterId.set(null);
  }

  /** PUT /api/shelters/{shelterId}/reviews/mine (the per-shelter author-only
   *  update endpoint). The response has no updatedAt (ShelterReviewDto), so
   *  the row's timestamp is bumped locally to "now" — the DB updated_at moved
   *  in the same request. */
  async saveReviewEdit(): Promise<void> {
    const shelterId = this.editingReviewShelterId();
    if (this.busy() || shelterId === null) {
      return;
    }
    if (this.editComment.invalid) {
      this.editComment.markAsTouched();
      return;
    }
    const comment = this.editComment.value.trim();
    this.busy.set(true);
    try {
      const updated = await this.reviews.updateMine(shelterId, this.editRating(), comment || null);
      const now = new Date().toISOString();
      this.reviewRows.update((rows) =>
        (rows ?? []).map((r) =>
          r.shelterId === shelterId
            ? { ...r, rating: updated.rating, comment: updated.comment, updatedAt: now }
            : r,
        ),
      );
      this.editingReviewShelterId.set(null);
      this.reviewRowError.update((e) => (e && e.shelterId === shelterId ? null : e));
    } catch (error: unknown) {
      this.reviewRowError.set({ shelterId, message: bannerMessage(error, 'shelter') });
    } finally {
      this.busy.set(false);
    }
  }

  requestDeleteReview(shelterId: number): void {
    this.confirmingReviewDelete.set(shelterId);
  }

  cancelDeleteReview(): void {
    this.confirmingReviewDelete.set(null);
  }

  /** Step 2: DELETE /api/shelters/{shelterId}/reviews/mine (204). */
  async confirmDeleteReview(shelterId: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.reviews.deleteMine(shelterId);
      this.reviewRows.update((rows) => (rows ?? []).filter((r) => r.shelterId !== shelterId));
      this.reviewRowError.update((e) => (e && e.shelterId === shelterId ? null : e));
    } catch (error: unknown) {
      this.reviewRowError.set({ shelterId, message: bannerMessage(error, 'shelter') });
    } finally {
      this.confirmingReviewDelete.set(null);
      this.busy.set(false);
    }
  }
}
