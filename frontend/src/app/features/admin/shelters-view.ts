import { computed, signal, type WritableSignal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import type { ActivatedRoute, Router, Params } from '@angular/router';
import type {
  AdminShelterDto,
  AdminShelterHistoryEvent,
  ShelterSourceFilter,
  ShelterStatus,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { nameBlankValidator } from '../../shared/form-helpers';
import { ConfirmAction } from '../../shared/confirm-action';
import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZES,
  clampPage,
  lastPage,
  parsePage,
  parseSize,
} from '../../shared/paging';
import { I18nService } from '../../core/i18n/i18n.service';

/** The reject reason's hard limit — mirrored by the backend contract
 *  (community-review-queue): required, at most 500 characters. Shared by
 *  the unconfirmed queue's reject (admin-page.ts) and this view's
 *  mark-inaccurate reason. */
export const REJECT_REASON_MAX = 500;

/** The info-request question's hard limit — mirrored by the backend
 *  contract (V19 column bound): required, at most 2000. */
export const INFO_REQUEST_MAX = 2000;

/**
 * The host-page dependencies the view reads: the gateway and i18n for the
 * loads and the banner copy, the route/router for the URL contract, the
 * host element for the two-tap confirm's focus handling, and the
 * page-level shared feedback it joins (one in-flight mutation at a time,
 * one banner). `reviewRefetch` is the page's cross-tab review-action
 * refetch (the queue's full list AND the paged leg) — the row actions
 * that refetch afterwards trigger it, and the Unconfirmed tab's
 * confirm/reject call it directly.
 */
interface SheltersViewDeps {
  admin: AdminGateway;
  i18n: I18nService;
  route: ActivatedRoute;
  router: Router;
  host: HTMLElement;
  busy: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
  success: WritableSignal<string | null>;
  clearFeedback: () => void;
  reviewRefetch: () => Promise<void>;
}

/**
 * The Shelters tab's URL→state→load seam (W3-B's continuation — review
 * 18 F3's fix note): the view the URL expresses (`shelterQ`, `source`,
 * `shelterPage`, `shelterSize` — tab-scoped namespaced params on the
 * shared /admin route), the signals that render it, the in-flight
 * fetch-sequence guard, and every row action.
 *
 * A state object, not a component: the tab's presentation was already
 * extracted (SheltersPanel — the presentational panel contract: OnPush,
 * inputs in, outputs out), and the state must survive tab switches (a
 * visit after a load keeps the in-memory rows — the lazy-load rule), so
 * it lives on the page's lifetime, one level below the page: the page
 * constructs it once, hands it the shared feedback, and the template
 * feeds the panel's inputs/outputs through it.
 *
 * The URL contract: the view IS the URL (a link or a refresh keeps the
 * view — the applied search term, the source chip, the page and the
 * size). `syncFromParams` is the only writer of the view signals from
 * the URL (the page's queryParams subscription and the tab switch both
 * funnel through it); `navigate` is the only writer of the URL from the
 * view (defaults omitted — page 1, size 20, no filter, no term — so a
 * hand-opened /admin?shelterQ=… pre-fills the input and loads the
 * filtered scope, and the search resets to page 1 on a new term). The
 * hand-typed-value normalization (replaceUrl) stays with the page's
 * shared normalizer: it is one atomic pass over ALL the tabs' params,
 * one history entry — the shelters' half of it (shelterPage/
 * shelterSize/source) cannot navigate separately without fragmenting
 * that single replaceUrl.
 */
export class SheltersView {
  // ---- list view -------------------------------------------------------------
  /** The Shelters tab's current PAGE (server-paged — the owner's
   *  list-page-paging follow-up): null = loading; [] = loaded and empty.
   *  The un-paged queue lives in the page's queueRows (the Unconfirmed
   *  tab). */
  readonly rows = signal<AdminShelterDto[] | null>(null);
  /** The load error (the page-level banner copy) — SHARED with the
   *  unconfirmed queue (one endpoint, one banner): the page's loadQueue
   *  clears it when the queue loads. */
  readonly loadError = signal<string | null>(null);
  /** The APPLIED name/address search term — the URL's `shelterQ` (the
   *  tab-scoped param: the guidance tab keeps its own `q` on the shared
   *  route — each tab's list filters on its OWN search, so a shelters
   *  search never narrows the guidance list and vice versa): set by
   *  syncFromParams from the URL, the server does the substring match.
   *  The paged view's URL-backed params are the search term, source
   *  filter, page and size. */
  readonly query = signal('');
  /** Search input (public so specs can drive it — page convention; the
   *  page re-exposes it). */
  readonly searchQuery = new FormControl('', { nonNullable: true });
  /** The source filter chip (All / Registry / Community — the
   *  frontend-facing grouping the backend speaks), URL-backed (`source`). */
  readonly source = signal<ShelterSourceFilter>('ALL');
  readonly page = signal(1);
  readonly size = signal(PAGE_SIZE_DEFAULT);
  /** The un-paged (filtered) total (X-Total-Count) and the derived page
   *  count / out-of-range flag — a past-the-end page renders an explicit
   *  notice, never a bare empty list. */
  readonly total = signal(0);
  readonly pages = computed(() => lastPage(this.total(), this.size()));
  readonly outOfRange = computed(
    () => this.total() > 0 && this.page() > this.pages(),
  );
  /** The selectable sizes — the range the endpoint serves (limit 1..200
   *  honours all of 10..100 step 10, so the control never offers a size
   *  the backend would refuse). */
  readonly pageSizes = PAGE_SIZES;

  // ---- shelter history ---------------------------------------------------------
  /** The row whose inline history panel is open (null = closed). */
  readonly historyFor = signal<number | null>(null);
  /** The open panel's events — null = loading, [] = loaded and empty. */
  readonly historyEvents = signal<AdminShelterHistoryEvent[] | null>(null);

  // ---- info request ---------------------------------------------------------------
  /** The row whose inline info-request panel is open (null = closed). */
  readonly infoFor = signal<number | null>(null);
  /** The question editor: required (non-blank — the shared blank validator),
   *  at most 2000 characters (the V19 bound). Public so specs can drive
   *  it (the page re-exposes it). */
  readonly requestMessage = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(INFO_REQUEST_MAX)],
  });

  // ---- mark inaccurate -------------------------------------------------------------
  /** The row whose inline mark-inaccurate editor is open (null = closed).
   *  Only opened for UNMARKED USER rows — a marked row shows the clear
   *  action directly, no editor. */
  readonly inaccurateFor = signal<number | null>(null);
  /** The optional reason editor (at most 500 characters — the
   *  moderation_actions.reason bound; blank/absent stores NULL on the
   *  audit row). */
  readonly inaccurateReason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(REJECT_REASON_MAX)],
  });

  /** The monotonic shelters-list fetch sequence (the guidance path's
   *  guard, applied to this list too): a superseded response must not
   *  win — the last response to ARRIVE is not the last view to be asked
   *  for (a chip/search change during an in-flight load). */
  private fetchSeq = 0;
  /** The last-applied view key — a queryParams emission re-loads only
   *  when the active tab's own params (or the local search term) differ
   *  from the last load. */
  private viewKey = '';

  /** Two-tap delete confirm: the armed shelter id (no window.confirm).
   *  Constructed in the body (the host element comes from the deps). */
  readonly deleteConfirm: ConfirmAction<number>;

  constructor(private readonly deps: SheltersViewDeps) {
    this.deleteConfirm = new ConfirmAction<number>(deps.host);
  }

  /** The Shelters tab's view (the URL's shelterQ + source +
   *  shelterPage/shelterSize) into the signals, loading when `firstVisit`
   *  (the lazy-load rule) or the view actually changed. The search term
   *  is URL-BACKED (the tab-scoped `shelterQ` — the guidance tab's `q`
   *  is a DIFFERENT param, so a shelters search never filters the
   *  guidance list): a hand-opened /admin?shelterQ=… or a refresh
   *  re-applies it instead of silently widening to the full list. The
   *  input follows the APPLIED term (one source of truth); an unchanged
   *  term (a page/size step) leaves the field alone — an unsubmitted
   *  draft is user state, not view state. */
  syncFromParams(params: Params, firstVisit: boolean): void {
    const q = (params['shelterQ'] ?? '').trim();
    const source = parseSourceFilter(params['source'] ?? null);
    const page = parsePage(params['shelterPage'] ?? null);
    const size = parseSize(params['shelterSize'] ?? null);
    const key = [q, source, page, size].join('|');
    // In-flight window included: a chip/page/search change that lands
    // while a fetch is running re-loads with the new view (the sequence
    // guard drops the superseded response — see fetchSeq).
    if (!firstVisit && key === this.viewKey) {
      return;
    }
    this.viewKey = key;
    // One source of truth (the URL's `shelterQ`): when the APPLIED term
    // changes, the input (the filter's editor) follows it — a hand-opened
    // /admin?shelterQ=… or a history step pre-fills the field instead of
    // leaving it disagreeing with the filter. An unchanged term leaves the
    // field alone. emitEvent: false — a view write, not user input.
    const prevQ = this.query();
    this.query.set(q);
    if (q !== prevQ) {
      this.searchQuery.setValue(q, { emitEvent: false });
    }
    this.source.set(source);
    this.page.set(page);
    this.size.set(size);
    this.load();
  }

  /** The Shelters tab's current page: the (source, q) filtered slice —
   *  the server does the filtering AND the slicing (no client-side fake
   *  pagination), the un-paged total arrives as X-Total-Count. */
  load(): void {
    this.rows.set(null);
    this.loadError.set(null);
    const q = this.query().trim();
    const size = this.size();
    const seq = ++this.fetchSeq;
    this.deps.admin
      .listShelters({
        source: this.source() === 'ALL' ? undefined : this.source(),
        q: q === '' ? undefined : q,
        limit: size,
        offset: (this.page() - 1) * size,
      })
      .then((paged) => {
        if (seq !== this.fetchSeq) {
          return; // a newer load superseded this response
        }
        this.total.set(paged.total);
        this.rows.set(paged.rows);
      })
      .catch((error: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.loadError.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
      });
  }

  /** The paged leg of the review actions' refetch: the Shelters tab's
   *  page, when it is loaded (the queue leg — the full un-paged list —
   *  is the page's coordinator's, which this is called from). Both views
   *  of the same endpoint are kept quiet — no loading flash over an
   *  already-rendered list. */
  async refreshPagedView(): Promise<void> {
    if (this.rows() !== null || this.loadError() !== null) {
      const q = this.query().trim();
      const size = this.size();
      // The shared fetch-sequence guard: a URL-driven load that started
      // while this refresh's page leg was in flight supersedes it (its
      // view is the newer one — the stale page is dropped).
      const seq = this.fetchSeq;
      const paged = await this.deps.admin.listShelters({
        source: this.source() === 'ALL' ? undefined : this.source(),
        q: q === '' ? undefined : q,
        limit: size,
        offset: (this.page() - 1) * size,
      });
      if (seq !== this.fetchSeq) {
        return;
      }
      this.total.set(paged.total);
      this.rows.set(paged.rows);
    }
  }

  /** Search submit: the term goes to the URL (`shelterQ`) — that emission
   * is what re-loads with the new term (the server does the name/address
   * substring match — no client-side filtering). A new filter has its own
   * page 1 (keeping the old page number would often land out-of-range).
   * An empty term removes the param, so the full list comes back with the
   * unfiltered total. The form's native submit is prevented in the panel
   * (a reload would be the only thing between the in-SPA state and the
   * URL). */
  onSearchSubmit(): void {
    const term = this.searchQuery.value.trim();
    this.query.set(term);
    this.deps.clearFeedback();
    this.deleteConfirm.disarm();
    this.closeHistory();
    this.closeInfo();
    this.closeInaccurate();
    this.navigate({ page: 1, q: term });
  }

  /** The source chip (admin Shelters tab): write `source` to the URL
   *  (a link or refresh keeps the filter), which composes with the
   *  status filter and the search (AND on the server). The chip starts
   *  at page 1. */
  onSourceChip(source: ShelterSourceFilter): void {
    if (source === this.source()) {
      return;
    }
    this.deps.clearFeedback();
    this.deleteConfirm.disarm();
    this.closeHistory();
    this.closeInfo();
    this.closeInaccurate();
    this.navigate({ source, page: 1 });
  }

  /** Write the Shelters tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted from the URL (page 1, size 20, no
   *  source filter, no search). */
  private navigate(view: {
    page?: number;
    size?: number;
    source?: ShelterSourceFilter;
    q?: string;
  }): void {
    const params: Record<string, string> = { ...this.deps.route.snapshot.queryParams };
    if (view.q !== undefined) {
      if (view.q === '') {
        delete params['shelterQ'];
      } else {
        params['shelterQ'] = view.q;
      }
    }
    if (view.source !== undefined) {
      if (view.source === 'ALL') {
        delete params['source'];
      } else {
        params['source'] = view.source;
      }
    }
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['shelterPage'] = String(view.page);
      } else {
        delete params['shelterPage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['shelterSize'] = String(view.size);
      } else {
        delete params['shelterSize'];
      }
    }
    void this.deps.router.navigate([], { relativeTo: this.deps.route, queryParams: params });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page.
   */
  onNavigate({ page, size }: { page: number; size: number }): void {
    this.navigate({ page: clampPage(page, this.total(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size and source are kept). */
  gotoFirstPage(): void {
    this.navigate({ page: 1 });
  }

  /** Hide a USER row (POST /admin/shelters/{id}/status INACTIVE). */
  hideShelter(row: AdminShelterDto): void {
    void this.setShelterStatus(row, 'INACTIVE');
  }

  /** Restore a hidden USER row (POST …status ACTIVE). The backend's restore
   *  also disarms auto-hide — the manual-change marker is server-side. */
  activateShelter(row: AdminShelterDto): void {
    void this.setShelterStatus(row, 'ACTIVE');
  }

  private async setShelterStatus(row: AdminShelterDto, status: ShelterStatus): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.setShelterStatus(row.id, status);
      this.patchShelter(row.id, { status });
      this.deps.success.set(
        this.deps.i18n.t(
          status === 'INACTIVE'
            ? 'admin.shelters.success.hidden'
            : 'admin.shelters.success.restored',
        ),
      );
    } catch (error) {
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  /** Step 1 of the two-tap delete: arm the confirm strip for the row. */
  requestDelete(id: number): void {
    this.deps.clearFeedback();
    this.deleteConfirm.arm(id);
  }

  cancelDelete(): void {
    this.deleteConfirm.cancel();
  }

  /** Step 2: DELETE /admin/shelters/{id} (204). The row is removed in place;
   *  reports/occupancy cascade server-side. */
  async confirmDelete(id: number): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.deleteShelter(id);
      this.rows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      // The (filtered) total shrinks — the page count follows (the
      // control hides itself at one page; a page left past the end shows
      // the out-of-range notice with its first-page action).
      this.total.update((t) => Math.max(0, t - 1));
      this.deps.success.set(this.deps.i18n.t('admin.shelters.success.deleted'));
    } catch (error) {
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      if (this.historyFor() === id) {
        this.closeHistory();
      }
      if (this.infoFor() === id) {
        this.closeInfo();
      }
      if (this.inaccurateFor() === id) {
        this.closeInaccurate();
      }
      this.deleteConfirm.disarm();
      this.deps.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Info request
  // -------------------------------------------------------------------------
  /**
   * Toggle the inline info-request panel for a USER row. A row WITHOUT a
   * request shows the question editor (required, ≤2000) and the send
   * action; a row WITH one shows the exchange read-only — the question
   * with the requester, and the submitter's answer once given (the row is
   * kept after the reply — audit posture; a second request is a server-
   * side 409, one exchange per shelter).
   */
  toggleInfo(row: AdminShelterDto): void {
    if (this.infoFor() === row.id) {
      this.closeInfo();
      return;
    }
    this.deps.clearFeedback();
    this.requestMessage.reset('');
    this.infoFor.set(row.id);
  }

  /** Close the open info panel (tab switch, search, delete, toggle). */
  closeInfo(): void {
    this.infoFor.set(null);
  }

  /**
   * "Send": POST /admin/shelters/{id}/request-info (204). The shelters
   * list refetches afterwards — the server resolves the requester name
   * and the timestamp, which the 204 body does not carry (the
   * review-action refetch precedent).
   */
  async sendInfoRequest(row: AdminShelterDto): Promise<void> {
    const message = this.requestMessage.value.trim();
    if (message === '' || message.length > INFO_REQUEST_MAX) {
      this.requestMessage.markAsTouched();
      return;
    }
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.requestInfo(row.id, message);
      this.deps.success.set(this.deps.i18n.t('admin.shelters.success.questionSent'));
      await this.deps.reviewRefetch();
      this.closeInfo();
    } catch (error) {
      // The panel STAYS open on failure (the admin keeps the question).
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  /**
   * Toggle the inline mark-inaccurate editor for an UNMARKED USER row.
   * A marked row never opens the editor — it shows the Clear action
   * directly (the flag's state, not a question). A second click on the
   * open row closes the editor.
   */
  toggleInaccurate(row: AdminShelterDto): void {
    if (this.inaccurateFor() === row.id) {
      this.closeInaccurate();
      return;
    }
    this.deps.clearFeedback();
    this.inaccurateReason.reset('');
    this.inaccurateFor.set(row.id);
  }

  /** Close the open mark-inaccurate editor (tab switch, search, delete, toggle). */
  closeInaccurate(): void {
    this.inaccurateFor.set(null);
  }

  /**
   * "Mark": POST /admin/shelters/{id}/mark-inaccurate {reason?} (204).
   * The reason is optional — blank/absent stores NULL on the audit row.
   * The shelters list refetches afterwards (the server stamps the flag;
   * the 204 carries no body, the request-info refetch precedent).
   */
  async markInaccurateAction(row: AdminShelterDto): Promise<void> {
    const reason = this.inaccurateReason.value.trim();
    if (reason.length > REJECT_REASON_MAX) {
      this.inaccurateReason.markAsTouched();
      return;
    }
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.markInaccurate(row.id, reason);
      this.deps.success.set(this.deps.i18n.t('admin.shelters.success.inaccurateMarked'));
      await this.deps.reviewRefetch();
      this.closeInaccurate();
    } catch (error) {
      // The editor STAYS open on failure (the admin keeps the reason).
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  /**
   * "Clear inaccurate": POST /admin/shelters/{id}/clear-inaccurate (204,
   * idempotent). The list refetches — the flag is server state.
   */
  async clearInaccurateAction(row: AdminShelterDto): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.clearInaccurate(row.id);
      this.deps.success.set(this.deps.i18n.t('admin.shelters.success.inaccurateCleared'));
      await this.deps.reviewRefetch();
    } catch (error) {
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Shelter history
  // -------------------------------------------------------------------------
  /**
   * Toggle the inline edit-history panel for a USER row. The panel lists
   * the row's lifecycle events ascending (Created / Edited — with the
   * server-parsed field changes / Deleted); a second click closes it.
   * History is a USER-row promise only — registry rows never get the
   * button (the import keeps its own data_imports audit and writes no
   * history rows).
   */
  async openHistory(row: AdminShelterDto): Promise<void> {
    if (this.historyFor() === row.id) {
      this.closeHistory();
      return;
    }
    this.historyFor.set(row.id);
    this.historyEvents.set(null);
    try {
      this.historyEvents.set(await this.deps.admin.listShelterHistory(row.id));
    } catch (error) {
      this.closeHistory();
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    }
  }

  /** Close the open history panel (tab switch, search, delete, toggle). */
  closeHistory(): void {
    this.historyFor.set(null);
    this.historyEvents.set(null);
  }

  /** The 204 mutations have no body — the changed field is patched into
   *  the in-memory row (no full refetch). Public: the reports tab's
   *  "Restore shelter" shortcut patches the row cross-tab. */
  patchShelter(id: number, patch: Partial<AdminShelterDto>): void {
    this.rows.update((rows) =>
      (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }
}

/** source chip: a legal grouping or 'ALL' (a stray hand-typed value is
 *  the no-filter default — the server would 400 an illegal one, and
 *  normalizeListParams drops it from the URL before it can reach a
 *  link — the URL and the rendered filter stay in agreement). */
function parseSourceFilter(raw: string | null): ShelterSourceFilter {
  return raw === 'REGISTRY' || raw === 'USER' ? raw : 'ALL';
}
