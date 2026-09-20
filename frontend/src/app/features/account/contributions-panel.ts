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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, type UrlTree, createUrlTreeFromSnapshot } from '@angular/router';
import { skip } from 'rxjs';
import type { MineShelterDto } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { ConfirmAction } from '../../shared/confirm-action';
import { bannerMessage } from '../../shared/error-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { communityBadgeClass as communityBadgeClassShared } from '../../shared/shelter-copy';

/**
 * "My contributions" panel on the /account page (user-contributions): the
 * caller's own shelters (list/edit/delete). The reviews list is
 * gone with the review model (owner decision).
 *
 * Edit = the shared /submit form in edit mode (M5): the Edit entry is a
 * link to /submit?edit=<id> — the SAME full creation form prefilled with
 * the row's current values (same fields, same location capture modes).
 * The account area no longer hosts its own reduced inline edit form;
 * save is PUT /api/shelters/{id} on that page, and the edit publishes
 * immediately with the pending-verification (NEW) trust state.
 * Delete = two-step confirm (the button arm + "Confirm delete?";
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
  /** The active route: the edit entry builds its /submit?edit=<id> UrlTree
   *  against this route's snapshot (M5). */
  private readonly route = inject(ActivatedRoute);
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

  // ---- shelter edit: the shared /submit form (M5) ---------------------------
  // The inline edit form is gone (M5): Edit is a routerLink to
  // /submit?edit=<id> — the full creation form in edit mode (same fields,
  // same location capture modes), prefilled with the row's values. The
  // account area is no longer where shelter edits happen.

  /**
   * The Edit entry (M5): the shared /submit form in edit mode, one UrlTree
   * per row. The UrlTree form is required here: this Angular version's
   * routerLink input is `string | string[] | UrlTree`, and NEITHER plain
   * form can carry query params — the array form misreads an options object
   * as a route segment, the string form URL-encodes the '?'. row.id is a
   * numeric primary key, so String() is lossless.
   */
  protected editLink(id: number): UrlTree {
    return createUrlTreeFromSnapshot(this.route.snapshot, ['/submit'], { edit: String(id) });
  }

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
  // Shelter rows: view (routerLink in the template), edit (routerLink to
  // the shared /submit?edit=<id> form, M5), delete
  // -------------------------------------------------------------------------

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
