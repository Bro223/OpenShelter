import { computed, signal, type WritableSignal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import type { AdminShelterDto } from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { REJECT_REASON_MAX } from './shelters-view';

/**
 * The Unconfirmed (review-queue) tab's state object: the queue's source —
 * the FULL un-paged shelters list (the queue is a filter of the WHOLE
 * scope, so the Shelters tab's paging must not hollow it out) — the queue
 * derived from it, the reject-reason editor (the armed row + the control),
 * and the two row actions (mark confirmed, reject with a reason) and their
 * cross-tab refetch.
 *
 * A state object, not a component: the tab's presentation was already
 * extracted (UnconfirmedPanel — the presentational panel contract: OnPush,
 * inputs in, outputs out), and the queue must survive tab switches (the
 * lazy-load rule: a visit after a load keeps the in-memory rows), so it
 * lives on the page's lifetime, one level below the page: the page
 * constructs it once, hands it the shared feedback, and the template feeds
 * the panel's inputs/outputs through it.
 *
 * Cross-tab, deliberately: the queue and the Shelters tab are two views of
 * the same endpoint. The load error is the Shelters view's (one endpoint,
 * one banner — the page keeps the panel's [loadError] wired to it), the
 * review actions refetch the queue's full list AND the Shelters tab's
 * loaded page (the `sheltersPagedRefresh` dep), and the Shelters view's
 * own review-triggering row actions (request-info, mark-inaccurate,
 * clear-inaccurate) trigger this same refetch through the page's
 * `reviewRefetch` wiring.
 */
interface UnconfirmedViewDeps {
  admin: AdminGateway;
  i18n: I18nService;
  /** The load error SHARED with the Shelters tab (one endpoint, one
   *  banner). */
  loadError: WritableSignal<string | null>;
  /** One in-flight mutation at a time (the row buttons all share it). */
  busy: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
  success: WritableSignal<string | null>;
  clearFeedback: () => void;
  /** The Shelters tab's paged leg of the review-action refetch. */
  sheltersPagedRefresh: () => Promise<void>;
}

export class UnconfirmedView {
  /** The queue's source: the FULL un-paged shelters list (the queue is a
   *  filter of the whole scope — the Shelters tab's paging must not
   *  hollow it out). null = loading; [] = loaded and empty. */
  readonly queueRows = signal<AdminShelterDto[] | null>(null);
  /** The queue: USER rows in the NEW state (client-side filter of the
   *  full list — no extra endpoint), newest first. The backend is
   *  id-ordered (auto-increment id = creation order) and carries NO
   *  creation timestamp on the admin projection (verified against the
   *  live API), so the id IS the creation-order proxy. */
  readonly rows = computed(() =>
    (this.queueRows() ?? [])
      .filter((row) => row.source === 'USER' && row.reviewStatus === 'NEW')
      .sort((a, b) => b.id - a.id),
  );
  /** The row whose reject-reason editor is open (null = closed). */
  readonly rejectRowFor = signal<AdminShelterDto | null>(null);
  /** The reject reason: required (non-blank — the shared blank validator,
   *  whitespace-only passes Validators.required), at most 500 characters.
   *  Public so specs can drive it — page convention; the page
   *  re-exposes it. */
  readonly rejectReason = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(REJECT_REASON_MAX)],
  });

  constructor(private readonly deps: UnconfirmedViewDeps) {}

  /** The queue's source: the FULL un-paged shelters list (the queue is a
   *  filter of the whole scope — the Shelters tab's paging must not
   *  hollow it out). The error state is shared with the Shelters tab
   *  (one endpoint, one banner). */
  load(): void {
    this.queueRows.set(null);
    this.deps.loadError.set(null);
    this.deps.admin
      .listShelters()
      .then((page) => this.queueRows.set(page.rows))
      .catch((error: unknown) =>
        this.deps.loadError.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key))),
      );
  }

  /** "Mark confirmed": direct, no reason (POST /admin/shelters/{id}/review).
   *  The shelters list refetches so both this queue and the Shelters tab
   *  show the new state. */
  async confirmRow(row: AdminShelterDto): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.reviewShelter(row.id, { action: 'CONFIRM' });
      this.deps.success.set(this.deps.i18n.t('admin.shelters.success.confirmed'));
      await this.refreshShelters();
    } catch (error) {
      // A 409 (the row moved since this list load) surfaces the server
      // message verbatim — the admin reloads and re-acts.
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  /** Open the inline reject-reason editor for the row. */
  openRejectEditor(row: AdminShelterDto): void {
    this.deps.clearFeedback();
    this.rejectReason.reset('');
    this.rejectRowFor.set(row);
  }

  cancelReject(): void {
    this.rejectRowFor.set(null);
  }

  /** "Reject": the reason is REQUIRED (non-blank, ≤500). On success the
   *  editor closes and the shelters list refetches (the queue recomputes). */
  async rejectRow(row: AdminShelterDto): Promise<void> {
    const reason = this.rejectReason.value.trim();
    if (reason === '' || reason.length > REJECT_REASON_MAX) {
      this.rejectReason.markAsTouched();
      return;
    }
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.reviewShelter(row.id, { action: 'REJECT', reason });
      this.deps.success.set(this.deps.i18n.t('admin.shelters.success.rejected'));
      this.rejectRowFor.set(null);
      await this.refreshShelters();
    } catch (error) {
      // The editor STAYS open on failure (the admin keeps the reason).
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  /** The review actions' refetch — this tab's confirm/reject, and the
   *  Shelters tab's request-info / mark-inaccurate / clear-inaccurate row
   *  actions (which trigger it through the page's `reviewRefetch` wiring):
   *  the queue's full list always (the action changed the queue's
   *  scope), the Shelters tab's page when it is loaded (both views of
   *  the same endpoint — kept quiet, no loading flash over an
   *  already-rendered list; the paged leg's fetch-sequence guard lives
   *  with the Shelters view, so a URL-driven load in flight supersedes
   *  it). */
  async refreshShelters(): Promise<void> {
    const page = await this.deps.admin.listShelters();
    this.queueRows.set(page.rows);
    await this.deps.sheltersPagedRefresh();
  }
}
