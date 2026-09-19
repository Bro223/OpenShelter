import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DatePipe, NgClass } from '@angular/common';
import {
  type AbstractControl,
  type ValidationErrors,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { skip } from 'rxjs';
import type { MineShelterDto, UpdateShelterRequest } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { ConfirmAction } from '../../shared/confirm-action';
import { bannerMessage } from '../../shared/error-copy';
import { capacityValidator, nameBlankValidator, readCoordinate } from '../../shared/form-helpers';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { communityBadgeClass as communityBadgeClassShared } from '../../shared/shelter-copy';

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
 * caller's own shelters (list/edit/delete, inline). The reviews list is
 * gone with the review model (owner decision).
 *
 * Edit = inline expanding form in the row (one open at a time, signals —
 * no modal). Delete = two-step confirm (the button arm + "Confirm delete?";
 * no window.confirm, consistent with the app's inline style).
 *
 * After a successful mutation the in-memory row is updated from the response
 * (no full refetch). Rejected mutations (400/403/404) surface a row-level
 * error via the standard banner copy mapping — the row stays in its
 * previous state.
 */
@Component({
  selector: 'app-contributions-panel',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, NgClass, LoadingIndicator, TranslatePipe],
  templateUrl: './contributions-panel.html',
  styleUrl: './contributions-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContributionsPanel implements OnInit {
  private readonly shelters = inject(ShelterGateway);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** i18n-et-en: the panel copy is fully catalog-driven; a switcher change
   *  re-renders the panel (labels + the re-derived error banners). The /mine
   *  data is NOT locale-scoped — no re-fetch. */
  readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** The language switcher sets I18nService.locale: re-derive the stored
   *  error banners (raw errors) and re-render every | t label. skip(1) —
   *  only a real switch triggers it (the guidance-page idiom). */
  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.cdr.markForCheck());

  // ---- shelters list -------------------------------------------------------
  /** null = loading; [] = loaded and empty. The /mine projection carries the
   *  review state (community-review-queue) — badges + the admin note. */
  protected readonly shelterRows = signal<MineShelterDto[] | null>(null);
  /** Load failure: the RAW error (non-null -> error state with Retry) —
   *  the banner text is re-derived through the active locale. */
  protected readonly shelterLoadError = signal<unknown | null>(null);

  // ---- inline edit state (one open at a time) ------------------------------
  protected readonly editingShelterId = signal<number | null>(null);

  // ---- two-step delete state -----------------------------------------------
  /** The two-step delete confirm: the armed shelter id (no window.confirm).
   *  The shared ConfirmAction owns the state machine, the focus move onto
   *  Confirm and the focus restore to Delete on cancel. */
  protected readonly shelterDeleteConfirm = new ConfirmAction<number>(this.host.nativeElement);

  // ---- info request -----------------------------------------------------------
  /** The row whose inline info-request panel is open (null = closed) —
   *  one inline panel at a time, like the edit forms. */
  protected readonly infoFor = signal<number | null>(null);
  /** The reply editor: required (non-blank — the shared blank validator),
   *  at most 2000 characters (the V19 bound). */
  readonly replyMessage = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(2000)],
  });

  // ---- row-level mutation errors (backend rejected an edit/delete) ---------
  /** The RAW error per row — the banner text is re-derived through the
   *  active locale at render time (shelterRowErrorMessage). */
  protected readonly shelterRowError = signal<{ id: number; error: unknown } | null>(null);

  protected readonly busy = signal(false);

  /** Panel-local badge label (i18n-et-en): registry rows carry their
   *  registry label, USER rows the trust-state label. The shared
   *  shelter-copy labels are not catalog keys (map/detail/admin still use
   *  them), so this panel renders its own translated set. */
  protected trustBadgeLabel(row: MineShelterDto): string {
    if (row.source === 'PAASETEAMET') {
      return this.i18n.t('account.contrib.source.paasteamet');
    }
    if (row.source === 'MUNICIPALITY') {
      return this.i18n.t('account.contrib.source.municipality');
    }
    switch (row.reviewStatus) {
      case 'NEW':
        return this.i18n.t('account.contrib.badge.new');
      case 'CONFIRMED':
        return this.i18n.t('account.contrib.badge.confirmed');
      case 'REJECTED':
        return this.i18n.t('account.contrib.badge.rejected');
    }
  }

  /** The trust badge tone: NEW amber, REJECTED danger, CONFIRMED green. */
  protected readonly communityBadgeClass = communityBadgeClassShared;

  /** The localized report-count phrase for the hidden-row mark
   *  ("1 report" / "5 reports"; EN/ET/RU plural rules). */
  private reportCountPhrase(n: number): string {
    switch (this.i18n.locale()) {
      case 'et':
        return n === 1 ? '1 teatamine' : `${n} teatamist`;
      case 'ru': {
        const tens = n % 100;
        const ones = n % 10;
        const word =
          tens >= 11 && tens <= 14 ? 'отчётов' : ones === 1 ? 'отчёт' : ones >= 2 && ones <= 4 ? 'отчёта' : 'отчётов';
        return `${n} ${word}`;
      }
      default:
        return `${n} report${n === 1 ? '' : 's'}`;
    }
  }

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
    return this.i18n.t('account.contrib.hidden', {
      count: this.reportCountPhrase(row.nonexistentReports),
    });
  }

  // ---- shelter edit form (pre-filled on Edit; public so specs can drive it)
  readonly editName = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(200),
      // Whitespace-only names pass Validators.required — mirror the backend
      // @NotBlank so we never PUT "   " (shared with /submit).
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

  ngOnInit(): void {
    this.loadShelters();
  }

  ngOnDestroy(): void {
    this.localeSub.unsubscribe();
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
      .catch((error: unknown) => this.shelterLoadError.set(error));
  }

  /** The list-load error banner, re-derived through the active locale. */
  protected shelterLoadErrorMessage(): string | null {
    const error = this.shelterLoadError();
    return error === null ? null : bannerMessage(error, 'shelter', (key) => this.i18n.t(key));
  }

  /** The row-level error banner text, re-derived through the active locale. */
  protected shelterRowErrorMessage(): string | null {
    const state = this.shelterRowError();
    return state === null ? null : bannerMessage(state.error, 'shelter', (key) => this.i18n.t(key));
  }

  // -------------------------------------------------------------------------
  // Shelter rows: view (routerLink in the template), inline edit, delete
  // -------------------------------------------------------------------------
  startEditShelter(row: MineShelterDto): void {
    this.infoFor.set(null);
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
      // The PUT response is the public projection (no reviewNote / no
      // infoRequest) — keep the row's review state + exchange from the
      // /mine load.
      this.shelterRows.update((rows) =>
        (rows ?? []).map((r) =>
          r.id === id ? { ...updated, reviewNote: r.reviewNote, infoRequest: r.infoRequest } : r,
        ),
      );
      this.editingShelterId.set(null);
      this.shelterRowError.update((e) => (e && e.id === id ? null : e));
    } catch (error: unknown) {
      this.shelterRowError.set({ id, error });
    } finally {
      this.busy.set(false);
    }
  }

  /** Step 1 of the two-step delete: arm the confirm strip. */
  requestDeleteShelter(id: number): void {
    this.shelterDeleteConfirm.arm(id);
  }

  cancelDeleteShelter(): void {
    this.shelterDeleteConfirm.cancel();
  }

  /** Step 2: DELETE /api/shelters/{id}; the row is removed from the list in
   *  place. */
  async confirmDeleteShelter(id: number): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.shelters.remove(id);
      this.shelterRows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      this.shelterRowError.update((e) => (e && e.id === id ? null : e));
    } catch (error: unknown) {
      this.shelterRowError.set({ id, error });
    } finally {
      if (this.infoFor() === id) {
        this.closeInfo();
      }
      this.shelterDeleteConfirm.disarm();
      this.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Info request: the moderator's question + the one-time reply
  // -------------------------------------------------------------------------
  /**
   * Toggle the inline info-request panel for a row that carries a request.
   * An OPEN request shows the question + the reply form (the answer is
   * one-time); an ANSWERED request shows the question + your reply
   * read-only (the row is kept after the reply — audit posture, and a
   * second reply is a server-side 409).
   */
  toggleInfo(row: MineShelterDto): void {
    if (this.infoFor() === row.id) {
      this.closeInfo();
      return;
    }
    this.replyMessage.reset('');
    this.replyMessage.markAsUntouched();
    // one inline panel at a time, across the shelter list
    this.editingShelterId.set(null);
    this.infoFor.set(row.id);
  }

  /** Close the open info panel (toggle, edit form, delete, tab leave). */
  closeInfo(): void {
    this.infoFor.set(null);
  }

  /**
   * POST /api/shelters/{id}/info-request/reply (204, the one-time answer).
   * Success patches the row in place — the 204 body is empty, so the reply
   * text is the form value and the timestamp local "now" (the review edit's
   * local updatedAt bump precedent); a 409 (answered meanwhile) or 400/403
   * shows the row error and the row stays as it was.
   */
  async sendInfoReply(row: MineShelterDto): Promise<void> {
    const request = row.infoRequest;
    if (request === null || request.replyMessage !== null) {
      return; // nothing open to answer (the form only renders while open)
    }
    const message = this.replyMessage.value.trim();
    if (message === '' || message.length > 2000) {
      this.replyMessage.markAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.shelters.replyInfoRequest(row.id, message);
      this.shelterRows.update((rows) =>
        (rows ?? []).map((r) =>
          r.id === row.id && r.infoRequest !== null
            ? {
                ...r,
                infoRequest: {
                  ...r.infoRequest,
                  replyMessage: message,
                  repliedAt: new Date().toISOString(),
                },
              }
            : r,
        ),
      );
      this.shelterRowError.update((e) => (e && e.id === row.id ? null : e));
      this.closeInfo();
    } catch (error: unknown) {
      this.shelterRowError.set({ id: row.id, error });
    } finally {
      this.busy.set(false);
    }
  }
}
