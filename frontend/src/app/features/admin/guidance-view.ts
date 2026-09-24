import {
  Injector,
  afterNextRender,
  computed,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { FormControl } from '@angular/forms';
import type { ActivatedRoute, Router, Params } from '@angular/router';
import type {
  AdminGuidancePostDto,
  GuidanceStatus,
  GuidanceTranslationDto,
} from '../../core/models';
import { AdminGateway } from '../../gateways/admin-gateway';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { ConfirmAction } from '../../shared/confirm-action';
import { PAGE_SIZE_DEFAULT, clampPage, lastPage, parsePage, parseSize } from '../../shared/paging';
import { I18nService } from '../../core/i18n/i18n.service';
import { LOCALES, type Locale } from '../../core/i18n/locale';
import type { GuidanceEditorSave } from './guidance-editor';

/**
 * The host-page dependencies the view reads: the gateways for the loads
 * (the permit-all public index is the published-date merge source),
 * i18n for the content-locale scoping and the banner copy, the
 * route/router for the URL contract, the host element for the two-tap
 * confirms' focus handling and the editor reveal, and the page-level
 * shared feedback it joins (one in-flight mutation at a time, one
 * banner). `tabActive` is the page's tab state (the content-locale
 * re-load only runs while the Guidance tab is the one on screen);
 * `ensureMediaLoaded` loads the media library the editor's hero picker
 * reads (a sibling tab's state, on the page).
 */
interface GuidanceViewDeps {
  admin: AdminGateway;
  publicGuidance: GuidanceGateway;
  i18n: I18nService;
  route: ActivatedRoute;
  router: Router;
  host: HTMLElement;
  injector: Injector;
  busy: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
  success: WritableSignal<string | null>;
  clearFeedback: () => void;
  tabActive: () => boolean;
  ensureMediaLoaded: () => void;
}

/**
 * The Guidance tab's URL→state→load seam: the view the URL expresses
 * (`q`, `guidancePage`, `guidanceSize` — namespaced params on the shared
 * /admin route), the signals that render it, the in-flight fetch-sequence
 * guards, the editor lifecycle (open/fetch/reveal/save/publish/delete),
 * and the open post's translation rows.
 *
 * A state object, not a component: the tab's presentation is already
 * extracted (GuidancePanel — the presentational panel contract: OnPush,
 * inputs in, outputs out), and the state must survive tab switches (a
 * visit after a load keeps the in-memory rows — the lazy-load rule), so
 * it lives on the page's lifetime, one level below the page: the page
 * constructs it once, hands it the shared feedback, and the template
 * feeds the panel's inputs/outputs through it.
 *
 * The URL contract: the view IS the URL (a link or a refresh keeps the
 * view — the applied search term, the page and the size). `syncFromParams`
 * is the only writer of the view signals from the URL (the page's
 * queryParams subscription and the tab switch both funnel through it);
 * `navigate` is the only writer of the URL from the view (defaults
 * omitted — page 1, size 20, no term). The hand-typed-value
 * normalization (replaceUrl) stays with the page's shared normalizer:
 * it is one atomic pass over ALL the tabs' params, one history entry —
 * the guidance half (guidancePage/guidanceSize) cannot navigate
 * separately without fragmenting that single replaceUrl.
 */
export class GuidanceView {
  // ---- list view -------------------------------------------------------------
  /** The admin's CONTENT language: the guidance list, detail fetches,
   *  saves and reorders all scope to it — the template renders it in
   *  the "posts in {locale}" line and the scoped empty state. It
   *  defaults to the UI language on first entry, then persists
   *  independently of it (a UI-language switch never re-fetches — the
   *  listed content is untouched). */
  readonly contentLocale: Signal<Locale>;
  /** The supported locales — the content-language select renders from
   *  this list (the language codes are the labels, the public
   *  switcher's convention). */
  readonly locales = LOCALES;
  /** The post list: null = not loaded yet (lazy on first switch);
   *  [] = loaded and empty. Scoped to the content language: only the
   *  posts that have content in it (a translation row there or the
   *  home being it), each carrying that locale's content, in the
   *  stored global manual order. */
  readonly rows = signal<AdminGuidancePostDto[] | null>(null);
  readonly loadError = signal<string | null>(null);
  /** The applied search term: the URL's `q` — set on submit
   *  (submit-based, never per-keystroke), scoped to the content
   *  locale's list; '' = no filter. */
  readonly query = signal('');
  /** The search input (public so specs can drive it — page convention;
   *  the view owns the control). */
  readonly search = new FormControl('', { nonNullable: true });
  /** The un-paged (search-filtered) total (X-Total-Count) and the
   *  derived page count / out-of-range flag. */
  readonly total = signal(0);
  readonly page = signal(1);
  readonly size = signal(PAGE_SIZE_DEFAULT);
  readonly pages = computed(() => lastPage(this.total(), this.size()));
  readonly outOfRange = computed(() => this.total() > 0 && this.page() > this.pages());
  /** Manual order (the move buttons, the drag & drop AND the full-list
   *  order PUT) is ALL-ROWS-by-nature: available only while the whole
   *  (searched, scoped) list fits the current page. */
  readonly reorderable = computed(() => this.total() <= this.size());
  /** The Published column's instants (slug -> publishedAt). The admin
   *  DTO carries NO publishedAt — the instants live in the permit-all
   *  public index, which this map merges (a failed merge degrades the
   *  column to "—", never the list). */
  readonly publishedAt = signal<Map<string, string>>(new Map());

  // ---- editor ------------------------------------------------------------------
  /** The open editor: null = closed; 'new' = create mode; a post = edit
   *  mode (the id-keyed GET result — the row's copy may be stale). */
  readonly editor = signal<AdminGuidancePostDto | 'new' | null>(null);
  readonly editorLoading = signal(false);
  /** The failed save's server message (the editor stays open — the
   *  admin keeps the draft). */
  readonly editorError = signal<string | null>(null);
  /** Two-tap delete confirm (no window.confirm): the armed post id. The
   *  gateway ALWAYS sends confirm=true (the server 400s without it). */
  readonly deleteConfirm: ConfirmAction<number>;

  // ---- translations (the open post's per-locale rows) ---------------------------
  /** The open post's translation rows: null = not loaded (fetched when
   *  the editor opens in edit mode). The home-locale row is always
   *  present (the server guarantees it) — the section's empty state is
   *  a shell post (no rows at all) only. */
  readonly translations = signal<GuidanceTranslationDto[] | null>(null);
  /** The locale the open editor is authoring a NEW translation in;
   *  null = the ordinary create/edit form. The template branches on it
   *  so the editor RECREATES on a switch (the prefill and the save
   *  payload pick the mode). */
  readonly translationTarget = signal<string | null>(null);
  /** The locale whose EXISTING translation row the open editor is
   *  editing in place; null = not in translation-edit mode. The
   *  template branches on it so the editor RECREATES on a switch — the
   *  post fetch behind it is scoped to the locale being edited, so the
   *  form shows THAT row. The home-locale row never takes this mode
   *  (its edit is the ordinary post edit that re-syncs the home row),
   *  so the row's buttons are offered for foreign rows only. */
  readonly translationEditTarget = signal<string | null>(null);
  /** The translation delete's two-tap confirm, keyed by LOCALE (the
   *  home-locale row is never offered the trigger — the server 400s
   *  deleting it). */
  readonly translationDeleteConfirm: ConfirmAction<string>;

  /** The monotonic guidance-list fetch sequence — a stale (out-of-order)
   *  response is dropped. */
  private fetchSeq = 0;
  /** The monotonic editor-detail fetch sequence (same guard). */
  private editorFetchSeq = 0;
  /** The monotonic editor-reveal sequence: a superseded open (a newer
   *  Edit/New) or a close cancels a pending reveal, so a stale callback
   *  can never scroll or focus after the editor it belongs to is gone.
   *  A re-render WITHOUT an open bumps nothing — no scroll, no focus
   *  steal. */
  private editorRevealSeq = 0;
  /** The last-applied view key — a queryParams emission re-loads only
   *  when the view's own params (or the content locale) differ from the
   *  last load. */
  private viewKey = '';
  /** The content-language subscription (toObservable of the i18n
   *  content-locale signal; skip(1) — the subscribe-time emission is
   *  the current value, only a real switch triggers it). */
  private readonly contentLocaleSub;

  constructor(private readonly deps: GuidanceViewDeps) {
    this.contentLocale = deps.i18n.contentLocale;
    this.deleteConfirm = new ConfirmAction<number>(deps.host);
    this.translationDeleteConfirm = new ConfirmAction<string>(deps.host);
    this.contentLocaleSub = toObservable(deps.i18n.contentLocale, {
      injector: deps.injector,
    })
      .pipe(skip(1))
      .subscribe(() => {
        this.onContentLocaleSwitch();
      });
  }

  /** The content language changed. The cached rows are the OLD locale's
   *  and must never render as stale-locale rows: the open editor is
   *  closed (its unsaved edits are DISCARDED — they belong to the
   *  previous language's rows) and the list is invalidated. On the
   *  Guidance tab (and the list not in an error state) the search and
   *  page are reset to the first page and the list re-fetched in the
   *  new scope (a scope change voids them — the old page would often
   *  land out-of-range); the URL is normalized in place (replaceUrl —
   *  no history entry for the cosmetic fix). A failed load keeps its
   *  Retry — a switch does not silently recover it. A switch made from
   *  elsewhere leaves the rows nulled, and the tab's lazy-load rule
   *  re-fetches them in the new locale on the next visit. */
  private onContentLocaleSwitch(): void {
    this.closeEditor();
    this.rows.set(null);
    if (!this.deps.tabActive() || this.loadError() !== null) {
      return;
    }
    const params = { ...this.deps.route.snapshot.queryParams };
    delete params['q'];
    delete params['guidancePage'];
    delete params['guidanceSize'];
    this.query.set('');
    // The input is the filter's editor (one source of truth): it clears
    // WITH the filter, so a switch can never leave a term in the field
    // that is not applied.
    this.search.reset('');
    this.page.set(1);
    this.size.set(PAGE_SIZE_DEFAULT);
    this.viewKey = ['', 1, PAGE_SIZE_DEFAULT, this.deps.i18n.contentLocale()].join('|');
    this.load();
    void this.deps.router.navigate([], {
      relativeTo: this.deps.route,
      queryParams: params,
      replaceUrl: true,
    });
  }

  destroy(): void {
    this.contentLocaleSub.unsubscribe();
  }

  // -------------------------------------------------------------------------
  // View sync + URL
  // -------------------------------------------------------------------------
  /** The Guidance tab's view (the URL's `q` + guidancePage/guidanceSize)
   *  into the signals, loading when `firstVisit` (the lazy-load rule)
   *  or the view actually changed. The content locale is part of the
   *  key — the locale switch handles its own reset, so a stale key
   *  cannot re-load the old scope. */
  syncFromParams(params: Params, firstVisit: boolean): void {
    const q = (params['q'] ?? '').trim();
    const page = parsePage(params['guidancePage'] ?? null);
    const size = parseSize(params['guidanceSize'] ?? null);
    const key = [q, page, size, this.deps.i18n.contentLocale()].join('|');
    // A query-param change that lands WHILE A LOAD IS IN FLIGHT (rows
    // nulled, no error yet) must re-load with the new view — never
    // return early (a dropped change leaves the URL reading the new
    // filter while the list renders the old one, and re-clicking cannot
    // recover because the router skips a same-URL navigation). The
    // load's fetch-sequence guard drops the superseded response.
    if (!firstVisit && key === this.viewKey) {
      return;
    }
    this.viewKey = key;
    // One source of truth (the URL's `q`): when the APPLIED term
    // changes, the input (the filter's editor) follows it — a
    // hand-opened /admin?q=… or a history step pre-fills the field
    // instead of leaving it disagreeing with the filter. An unchanged
    // term (a page/size step) leaves the field alone: an unsubmitted
    // draft is user state, not view state. emitEvent: false — a view
    // write, not user input.
    const prevQ = this.query();
    this.query.set(q);
    if (q !== prevQ) {
      this.search.setValue(q, { emitEvent: false });
    }
    this.page.set(page);
    this.size.set(size);
    this.load();
  }

  /** The "Content language" select (the Guidance tab — with the content
   *  it scopes): sets the content language (persisted under its own
   *  key — the UI language is untouched). The cached rows are
   *  invalidated here: they belong to the previous content language. */
  setContentLocale(locale: Locale): void {
    this.deps.i18n.setContentLocale(locale);
    this.rows.set(null); // the cached rows are the old locale's
  }

  /** Load the CURRENT page of the posts visible in the CONTENT
   *  language, search-filtered: the server runs the `q` filter over the
   *  scope's rendered content and slices the (filtered) stored manual
   *  order with limit/offset — the page never fetches-and-slices
   *  client-side, and the order is never re-sorted by the search. The
   *  un-paged (filtered) total arrives as X-Total-Count; an out-of-range
   *  page is the derived flag, not a bare empty list. The monotonic
   *  fetch sequence drops a stale (out-of-order) response: a
   *  superseded load must not overwrite a newer one. */
  load(): void {
    this.rows.set(null);
    this.loadError.set(null);
    const seq = ++this.fetchSeq;
    const page = this.page();
    const size = this.size();
    this.deps.admin
      .listGuidancePostsPage({
        locale: this.deps.i18n.contentLocale(),
        q: this.query() === '' ? undefined : this.query(),
        limit: size,
        offset: (page - 1) * size,
      })
      .then(({ rows, total }) => {
        if (seq !== this.fetchSeq) {
          return; // a newer load superseded this response
        }
        this.total.set(total);
        this.rows.set(rows);
        // The admin projection has NO publishedAt — the publication
        // instants live in the permit-all public index; merge them (a
        // failed merge degrades the column to "—", never the list
        // itself).
        if (rows.some((r) => r.status === 'PUBLISHED')) {
          this.refreshPublishedIndex();
        } else {
          this.publishedAt.set(new Map());
        }
      })
      .catch((error: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.loadError.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
      });
  }

  /** The publishedAt merge source (the permit-all public index —
   *  PUBLISHED posts with their publication instants, keyed by slug).
   *  Fire-and-forget: a failure just leaves the column showing "—"
   *  until the next load. */
  private refreshPublishedIndex(): void {
    this.deps.publicGuidance
      .list()
      .then((posts) => this.publishedAt.set(new Map(posts.map((p) => [p.slug, p.publishedAt]))))
      .catch(() => this.publishedAt.set(new Map()));
  }

  /**
   * The search submit: capture the term and re-query — SUBMIT-based,
   *  never per-keystroke. A new filter has its own page 1 (keeping the
   *  old page number would often land out-of-range). The term is
   *  written to the URL (`q`) so a link or a refresh keeps it.
   */
  onSearchSubmit(): void {
    const term = this.search.value.trim();
    this.query.set(term);
    this.deps.clearFeedback();
    // The term goes to the URL (`q`) — that emission is what re-loads
    // (the term itself is not part of the URL's page/size state).
    this.navigate({ page: 1, q: term });
  }

  /** The explicit clear: removes `q` from the URL and resets to page 1
   *  (the "no posts yet" empty state comes back for an empty scope). */
  onSearchClear(): void {
    this.search.reset('');
    this.query.set('');
    this.deps.clearFeedback();
    this.navigate({ page: 1, q: '' });
  }

  /** Write the Guidance tab's view to the URL (merging the other tab's
   *  params — the tabs share one route); the query emission re-loads via
   *  the sync. Defaults are omitted (page 1, size 20, no search). */
  private navigate(view: { page?: number; size?: number; q?: string }): void {
    const params: Record<string, string> = { ...this.deps.route.snapshot.queryParams };
    if (view.q !== undefined) {
      if (view.q === '') {
        delete params['q'];
      } else {
        params['q'] = view.q;
      }
    }
    if (view.page !== undefined) {
      if (view.page > 1) {
        params['guidancePage'] = String(view.page);
      } else {
        delete params['guidancePage'];
      }
    }
    if (view.size !== undefined) {
      if (view.size !== PAGE_SIZE_DEFAULT) {
        params['guidanceSize'] = String(view.size);
      } else {
        delete params['guidanceSize'];
      }
    }
    void this.deps.router.navigate([], {
      relativeTo: this.deps.route,
      queryParams: params,
    });
  }

  /** The pagination control's intent (prev/next/size): a SIZE change
   *  that would strand the current page past the last one clamps the
   *  page to the last page AT THE NEW SIZE (the total is known whenever
   *  the control is visible), so a size flip never lands on a dead page.
   *  The search term is kept (a new page of the same filter). */
  onNavigate({ page, size }: { page: number; size: number }): void {
    this.navigate({ page: clampPage(page, this.total(), size), size });
  }

  /** The out-of-range notice's action: back to the first page (the
   *  current size and the search term are kept). */
  gotoFirstPage(): void {
    this.navigate({ page: 1 });
  }

  // -------------------------------------------------------------------------
  // Editor
  // -------------------------------------------------------------------------
  /**
   * Open the editor. Create mode opens directly (the form is prefilled
   *  with the CONTENT language — the post is created in it); edit mode
   *  fetches the id-keyed detail FIRST, SCOPED to the content language
   *  (the stored (sanitized) bodyHtml is what the editor round-trips —
   *  the row's copy may be stale after a save from elsewhere; a post
   *  without content in the locale 404s — unreachable from a scoped
   *  row). The media library loads for the hero picker when the media
   *  tab hasn't loaded it yet.
   */
  openEditor(post: AdminGuidancePostDto | null): void {
    this.deps.clearFeedback();
    this.editorError.set(null);
    this.deleteConfirm.disarm();
    // A fresh open: no pending translation authoring or edit mode, no
    // stale rows (the edit-mode load below refetches the list for this
    // post).
    this.translationTarget.set(null);
    this.translationEditTarget.set(null);
    this.translations.set(null);
    this.translationDeleteConfirm.disarm();
    this.deps.ensureMediaLoaded();
    if (post === null) {
      this.editor.set('new');
      // Create mode: the form renders immediately from this write — the
      // reveal waits for that render (afterNextRender), not the click.
      this.revealEditor();
      return;
    }
    const seq = ++this.editorFetchSeq;
    this.editor.set('new'); // the editor section renders (loading…)
    this.editorLoading.set(true);
    this.deps.admin
      .getGuidancePost(post.id, this.deps.i18n.contentLocale())
      .then((fetched) => {
        if (seq !== this.editorFetchSeq) {
          return; // superseded (a newer open/cancel) — drop the stale post
        }
        this.editor.set(fetched);
        this.editorLoading.set(false);
        // EDIT MODE: the reveal only runs once the row's data is loaded
        // AND this write has rendered the real form — never on the
        // click (when only the loading placeholder exists).
        this.revealEditor();
        // The translations section loads in parallel: its failure
        // surfaces on the page banner, the post editing itself is
        // unaffected (the list is an add-on, not a gate).
        void this.loadTranslations(fetched.id);
      })
      .catch((error: unknown) => {
        if (seq !== this.editorFetchSeq) {
          return;
        }
        // 404 (the post went away) or any other failure: close the
        // editor, surface the server message on the page banner.
        this.editor.set(null);
        this.editorLoading.set(false);
        this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
      });
  }

  /** Close the editor (tab switch, cancel, a successful save). Bumps
   *  the fetch sequence so an in-flight edit detail cannot land late,
   *  and the reveal sequence so a pending scroll+focus is cancelled
   *  with the editor. */
  closeEditor(): void {
    this.editorFetchSeq++;
    this.editorRevealSeq++;
    this.editor.set(null);
    this.editorLoading.set(false);
    this.editorError.set(null);
    // The translations section is part of the open editor: no pending
    // authoring or edit mode, no stale rows, no armed delete confirm.
    this.translationTarget.set(null);
    this.translationEditTarget.set(null);
    this.translations.set(null);
    this.translationDeleteConfirm.disarm();
  }

  /**
   * The explicit-open reveal (Edit / New post — the ONLY triggers): once
   *  the editor's data is loaded and the form has RENDERED, scroll the
   *  editor region into view and move focus to the form's first field
   *  (the title). The admin who clicked Edit on a row at the BOTTOM of
   *  a long list must not hunt for the form — the form comes to them,
   *  and a keyboard user lands inside it, not somewhere arbitrary.
   *
   *  Deferred to afterNextRender (the map-page's scrollRowIntoView
   *  idiom): the signal write re-renders the form first, so the scroll
   *  measures the final layout — never the click-time placeholder. A
   *  re-render without an explicit open (a row patch, a refetch) never
   *  calls this, and a superseded/closed open is dropped by the reveal
   *  sequence.
   *
   *  The scroll honours prefers-reduced-motion — the repo's motion
   *  policy: the OS reduce request removes the motion, the state still
   *  flips. Under reduce the jump is INSTANT, not smooth. jsdom has no
   *  matchMedia at all (and it would be the only place to miss it) —
   *  the typeof guard keeps the default (smooth) there.
   */
  private revealEditor(): void {
    const seq = ++this.editorRevealSeq;
    afterNextRender(
      () => {
        if (seq !== this.editorRevealSeq) {
          return; // superseded (a newer open) or cancelled (a close)
        }
        const region = this.deps.host.querySelector<HTMLElement>('.admin-editor');
        if (region === null) {
          return; // the editor is gone (destroyed mid-flight) — no reveal
        }
        const reducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        region.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
        // The form's first field — the title input (the Quill body
        // comes after it and must not be the focus target).
        const firstField = this.deps.host.querySelector<HTMLInputElement>('#ge-title');
        firstField?.focus();
      },
      { injector: this.deps.injector },
    );
  }

  /** The post the editor is bound to: null = create mode, the fetched
   *  post = edit mode. The 'new' loading placeholder never reaches the
   *  editor (template type narrowing can't exclude it from the union). */
  editorPost(): AdminGuidancePostDto | null {
    const v = this.editor();
    return v === 'new' ? null : v;
  }

  /**
   * Route the editor's validated payload to the right endpoint: create
   * (POST, 200 with the created post) or update (PUT, 200 with the
   * updated post). The 200 bodies carry the STORED post (sanitized
   * body, server-derived slug) — the row adopts it in place. On failure
   * the editor STAYS open (the admin keeps the draft); the server
   * message (400 validation / 409 slug collision naming the slug / 404
   * unknown hero) is echoed in the editor's banner.
   */
  async savePost(save: GuidanceEditorSave): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.editorError.set(null);
    this.deps.busy.set(true);
    try {
      if (save.createTranslation !== undefined && save.id !== null) {
        // Translation authoring: the NEW row for the target locale —
        // the CREATE endpoint, never the update one (the row does not
        // exist yet). The editor STAYS open (the target resets — the
        // template branch recreates it in the ordinary edit mode for
        // the on-screen row) and the translation list re-loads.
        await this.deps.admin.createGuidanceTranslation(save.id, save.createTranslation);
        this.deps.success.set(this.deps.i18n.t('admin.guidance.success.translationCreated'));
        this.translationTarget.set(null);
        await this.loadTranslations(save.id);
        return;
      }
      if (save.updateTranslation !== undefined && save.id !== null) {
        // Translation EDIT: the EXISTING row for the target locale —
        // the UPDATE endpoint (never the create one — the row exists;
        // never the post-level update — that writes the home locale's
        // columns, a different row). The bound post is the
        // EDIT-locale-scoped fetch, so after the save it is re-fetched
        // in the CONTENT locale: the editor re-opens in the ordinary
        // edit mode on the row a content-locale save would target (the
        // content language is unchanged). The translation list
        // re-loads; the post-level row patch is not applied — the
        // edited locale's row is not the content-locale row.
        const { locale, request } = save.updateTranslation;
        await this.deps.admin.updateGuidanceTranslation(save.id, locale, request);
        this.deps.success.set(this.deps.i18n.t('admin.guidance.success.translationUpdated'));
        try {
          const restored = await this.deps.admin.getGuidancePost(
            save.id,
            this.deps.i18n.contentLocale(),
          );
          this.translationEditTarget.set(null);
          this.editor.set(restored);
          await this.loadTranslations(save.id);
        } catch {
          // The post went away concurrently (deleted mid-edit): close
          // the editor, the success is kept (the row itself was
          // updated).
          this.closeEditor();
        }
        return;
      }
      let result: AdminGuidancePostDto;
      if (save.id === null) {
        result = await this.deps.admin.createGuidancePost(save.create!);
        // The new post APPENDS at the END of the stored manual order
        // (the server does — it is not newest-first anymore), so the
        // row is appended, not prepended; the (filtered) total grows
        // with it.
        this.total.update((t) => t + 1);
        this.rows.update((rows) => [...(rows ?? []), result]);
        this.deps.success.set(this.deps.i18n.t('admin.guidance.success.created'));
      } else {
        // SCOPED to the CONTENT language: the content fields land on
        // that locale's translation row (the post-level fields stay
        // shared).
        result = await this.deps.admin.updateGuidancePost(
          save.id,
          save.update!,
          this.deps.i18n.contentLocale(),
        );
        this.rows.update((rows) => (rows ?? []).map((r) => (r.id === result.id ? result : r)));
        this.deps.success.set(this.deps.i18n.t('admin.guidance.success.updated'));
      }
      if (result.heroImportError !== null && result.heroImportError !== undefined) {
        // The save SUCCEEDED — the post was stored — but its hero
        // import FAILED at save (the write response carries the
        // failure). Keep the editor open on the saved row: the failure
        // is surfaced against the hero field (the editor reads
        // heroImportError off the bound post), the URL stays for a
        // retry, and the admin fixes and re-saves from there. (The
        // create-mode switch from 'new' to the stored post is
        // deliberate: the stored row is what the retry edits.) The
        // success copy is cleared — the editor's field error is the
        // signal (a "Post created." banner next to a field error
        // argues with it).
        this.deps.success.set(null);
        this.editor.set(result);
      } else {
        this.closeEditor();
      }
      // The slug may have moved (or a save-and-publish set the status)
      // — the publishedAt merge follows the new state.
      this.refreshPublishedIndex();
    } catch (error) {
      this.editorError.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }

  /** Publish (POST /{id}/publish, 204, idempotent). The row patches in
   *  place; the stamp itself is server state the 204 does not carry —
   *  the public index refresh refreshes the Published column. */
  async publish(row: AdminGuidancePostDto): Promise<void> {
    await this.setPublished(row, 'PUBLISHED');
  }

  /** Unpublish (POST /{id}/unpublish, 204, idempotent) — back to DRAFT,
   *  publishedAt cleared. */
  async unpublish(row: AdminGuidancePostDto): Promise<void> {
    await this.setPublished(row, 'DRAFT');
  }

  private async setPublished(row: AdminGuidancePostDto, status: GuidanceStatus): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      if (status === 'PUBLISHED') {
        // Publish is a pure stamp: it fetches, validates and stores
        // NOTHING — the hero import runs at SAVE. The 204 therefore
        // changes nothing on the row besides the status, so there is
        // no detail re-fetch.
        await this.deps.admin.publishGuidancePost(row.id);
      } else {
        await this.deps.admin.unpublishGuidancePost(row.id);
      }
      this.patchGuidance(row.id, { status });
      // The 204 carries no body — the publication instant is public
      // state; refresh the merge (publish: a fresh stamp; unpublish:
      // the slug is off the public index).
      if (status === 'PUBLISHED') {
        this.refreshPublishedIndex();
      } else {
        this.publishedAt.update((m) => {
          const next = new Map(m);
          next.delete(row.slug);
          return next;
        });
      }
      this.deps.success.set(
        this.deps.i18n.t(
          status === 'PUBLISHED'
            ? 'admin.guidance.success.published'
            : 'admin.guidance.success.unpublished',
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

  /** Step 2: DELETE /admin/guidance/{id}?confirm=true (204 — the
   *  gateway always sends the required confirm flag). The row is
   *  removed in place; its media assets stay in the library, its audit
   *  rows keep their label snapshot. */
  async confirmDelete(id: number): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      const row = (this.rows() ?? []).find((r) => r.id === id) ?? null;
      await this.deps.admin.deleteGuidancePost(id);
      this.rows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      // The (filtered) total shrinks — the page count follows (the
      // control hides itself at one page; a page left past the end
      // shows the out-of-range notice with its first-page action).
      this.total.update((t) => Math.max(0, t - 1));
      if (row !== null && row.status === 'PUBLISHED') {
        this.publishedAt.update((m) => {
          const next = new Map(m);
          next.delete(row.slug);
          return next;
        });
      }
      this.deps.success.set(this.deps.i18n.t('admin.guidance.success.deleted'));
    } catch (error) {
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      // A deleted post being edited: the form's target is gone.
      const editor = this.editor();
      if (editor !== null && editor !== 'new' && editor.id === id) {
        this.closeEditor();
      }
      this.deleteConfirm.disarm();
      this.deps.busy.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Translations
  // -------------------------------------------------------------------------
  //
  // The post's per-locale rows live in the translations section under
  // the open editor (edit mode only): add a missing locale (the editor
  // recreates in translation-authoring mode), delete a foreign one (the
  // two-tap confirm; the home-locale row is the post itself — never
  // offered). Editing an EXISTING translation is the ordinary scoped
  // edit: switch the content language to it, open the post, save.

  /**
   * GET /admin/guidance/{id}/translations — the rows the section
   * renders. A stale answer (the editor moved on to another post in
   * the meantime) is dropped; a failed load surfaces on the page
   * banner — the post editing itself is unaffected (the list is an
   * add-on, not a gate).
   */
  loadTranslations(postId: number): Promise<void> {
    return this.deps.admin
      .listGuidanceTranslations(postId)
      .then((rows) => {
        if (this.editorPost()?.id === postId) {
          this.translations.set(rows);
        }
      })
      .catch((error: unknown) => {
        this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
      });
  }

  /** Arm the editor for a NEW translation in `locale`: the template's
   *  branch switch recreates it in translation-authoring mode,
   *  prefilled from the on-screen row (the admin translates from what
   *  they see). The home declaration / pinned / hero choice are off
   *  that form. */
  startTranslation(locale: string): void {
    this.translationDeleteConfirm.disarm();
    this.translationTarget.set(locale);
  }

  /**
   * The per-locale edit trigger (the foreign row's Edit button): the
   *  on-screen row is the CONTENT-locale row, so the row being edited
   *  needs its own scoped fetch first; then the template's branch
   *  switch recreates the editor in translation-edit mode (the prefill
   *  shows THAT row — the slug prefilled, a blank slug keeps it; Save
   *  emits the update-translation payload for the UPDATE endpoint).
   *  The home-locale row never reaches this (its buttons are not
   *  offered). On a scoped fetch FAILURE the current editor stays
   *  as-is (no switch — the rows are intact, the editor banner carries
   *  the message).
   */
  async startTranslationEdit(locale: string): Promise<void> {
    const post = this.editorPost();
    if (post === null || this.editor() === 'new') {
      return;
    }
    this.translationDeleteConfirm.disarm();
    this.deps.busy.set(true);
    this.editorLoading.set(true);
    this.editorError.set(null);
    const seq = ++this.editorFetchSeq;
    try {
      const scoped = await this.deps.admin.getGuidancePost(post.id, locale);
      if (seq !== this.editorFetchSeq) {
        return;
      }
      this.editor.set(scoped);
      this.translationEditTarget.set(locale);
      this.revealEditor();
    } catch (error) {
      if (seq !== this.editorFetchSeq) {
        return;
      }
      this.editorError.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      if (seq === this.editorFetchSeq) {
        this.editorLoading.set(false);
      }
      this.deps.busy.set(false);
    }
  }

  /** Step 1 of the two-tap translation delete: arm the confirm strip
   *  for the locale. */
  requestDeleteTranslation(locale: string): void {
    this.deps.clearFeedback();
    this.translationDeleteConfirm.arm(locale);
  }

  cancelDeleteTranslation(): void {
    this.translationDeleteConfirm.cancel();
  }

  /**
   * Step 2: DELETE /admin/guidance/{id}/translations/{locale} (204; no
   *  confirm parameter — the two-tap IS the confirm; the home-locale
   *  row 400s server-side and is never offered the trigger). Deleting
   *  the row the editor is SHOWING (the content-locale row of a
   *  foreign-locale edit) removes the post from the current scoped
   *  list: close the editor and re-load the list. Any other row just
   *  refreshes the section under the open editor.
   */
  async confirmDeleteTranslation(locale: string): Promise<void> {
    const post = this.editorPost();
    if (post === null || this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.deleteGuidanceTranslation(post.id, locale);
      this.deps.success.set(this.deps.i18n.t('admin.guidance.success.translationDeleted'));
      if (locale === post.locale) {
        this.closeEditor();
        this.load();
      } else {
        await this.loadTranslations(post.id);
      }
    } catch (error) {
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.translationDeleteConfirm.disarm();
      this.deps.busy.set(false);
    }
  }

  private patchGuidance(id: number, patch: Partial<AdminGuidancePostDto>): void {
    this.rows.update((rows) => (rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // -------------------------------------------------------------------------
  // Manual ordering
  // -------------------------------------------------------------------------
  //
  // The interaction (move buttons, drag & drop, the drop-target
  // highlight, the per-row reorder computation) lives in
  // GuidanceOrderList; it emits the FULL ordered list and the page
  // submits it below. The list order IS the public order; the server
  // renumbers 1..N and the table reorders in place (no reload).

  /** The shared submission: PUT /admin/guidance/order with the FULL
   *  submitted order — SCOPEd to the CONTENT language: the list is
   *  exactly the posts visible in it, and the server rewrites them
   *  into their slots of the GLOBAL order (slot-preserving — the other
   *  languages' posts are untouched). Success reorders the table in
   *  place (the server confirmed it — its 204 is the confirmation); a
   *  failure (400 stale / unknown / not-visible-in-the-locale list, or
   *  the network) KEEPS the last confirmed order and shows the error
   *  banner. */
  async submitOrder(nextRows: AdminGuidancePostDto[]): Promise<void> {
    if (this.deps.busy()) {
      return;
    }
    this.deps.clearFeedback();
    this.deps.busy.set(true);
    try {
      await this.deps.admin.reorderGuidanceOrder(
        nextRows.map((r) => r.id),
        this.deps.i18n.contentLocale(),
      );
      this.rows.set(nextRows);
      this.deps.success.set(this.deps.i18n.t('admin.guidance.success.reordered'));
    } catch (error) {
      this.deps.error.set(bannerMessage(error, 'shelter', (key) => this.deps.i18n.t(key)));
    } finally {
      this.deps.busy.set(false);
    }
  }
}
