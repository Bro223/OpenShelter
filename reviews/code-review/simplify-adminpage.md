# SIMPLIFY-ADMINPAGE — the two named seams out of `admin-page.ts`

**Lane:** SIMPLIFY-ADMINPAGE · **Branch:** `code-review` (baseline `33793ce`) · **Status:** done, gate evidence below.
**Scope:** `frontend/src/app/features/admin/admin-page.{ts,html,scss,spec.ts}` + two new sibling files (`guidance-view.ts`, `paged-view.ts`) + the `ADMIN_PAGE_MAX_LINES` constant in `frontend/src/app/architecture.spec.ts` (the one guard value this run expects me to move). Nothing else touched; cross-lane items went to `docs/autopilot/CODE-REVIEW-NOTES.md`.

---

## 1. What changed

### 1.1 The guidance tab's state → `guidance-view.ts` (957 lines, new)

The seam the ceiling note and `inventory.md` named: the guidance tab's URL→state→load surface, extracted the same way as `SheltersView` — a **page-owned state object, not a component**, because the state must survive tab switches (the lazy-load rule: a visit after a load keeps the in-memory rows) and the presentation is already extracted (the panel is OnPush, inputs in, outputs out). The page constructs it once, hands it its dependencies (gateways, route/router, host, injector, the shared `busy`/`error`/`success` feedback, `clearFeedback`, a `tabActive` probe, and the page's `ensureMediaLoaded`), and the template feeds the panel through it.

What moved into the view:

- The post-list state (rows, the search term, page/size, total/pages/out-of-range, the fetch-sequence guard, the view-key) and its `syncFromParams` / `navigate` URL writers.
- The `publishedAt` merge (the admin DTO carries no publish date; the column merges the permit-all public index by slug; a merge failure degrades the column to "—", never the list).
- The editor lifecycle (open/close, the editor fetch, the reveal sequence, save/publish/unpublish, the delete confirm), the translation rows and their actions, the manual-order submission.
- The **content-locale subscription** — with the locale-switch invalidation rule (rows of the previous language are nulled and never rendered as stale-locale; an open editor is closed and its unsaved edits discarded). It is a `toObservable(signal, { injector })` + `afterNextRender(..., { injector })` subscription — both confirmed supported on Angular 22 before the move — destroyed in the view's `destroy()`, which the page's `ngOnDestroy` now calls.

What stayed on the page: the tab's scope signal is gone too — the only guidance-side page method left is `onContentLanguageChange`, a two-line delegate to `guidance.setContentLocale`. The `GuidancePanel` component API (another lane's file) is byte-identical; only the page-side bindings changed.

### 1.2 The four server-paged tabs → `paged-view.ts` (179 lines, new)

The second cohesive seam, the same pattern: the report queue, the accounts, the media library and the audit trail each carried the identical ~65-line shape (rows/loadError/page/size/total/pages/outOfRange signals, a fetch-sequence field, a view-key field, a `syncXFromParams`, a `loadX`, a `navigateX` with the omit-defaults URL write, an `onXNavigate` with the size-change clamp, a `gotoXFirstPage`) — ~260 lines of duplication the `clean-code` skill's Duplicated Code smell says to extract the shared shape for. Now:

- `PagedView<T>` holds the shape: the signals, the fetch-sequence guard (a stale response is dropped), the view-key rule (a query-param change landing mid-load re-loads — never an early return, or the URL reads the new view over the old list and re-clicking cannot recover because the router skips a same-URL navigation), and the URL writers (`syncFromParams` the only writer from the URL; `navigate` the only writer to the URL).
- The four tabs are four instances; only the `fetch` differs (the gateway call) and the URL param names (`reportPage/reportSize`, `userPage/userSize`, `mediaPage/mediaSize`, `auditPage/auditSize` — the namespacing the pinned URL tests verify).
- Two deliberate extensions, both used by exactly one tab and both plain: `keyPart` (the reports filter is part of the last-applied key, so a scope change re-loads and a scope-less emission never re-loads on its own) and `navigate({ extra })` (the reports filter writes `excludeDismissed` alongside the page/size in the same navigation — one history entry, not two).
- What stayed on the page: the tab-specific behaviours that are not paging — `reportExcludeDismissed` (the scope signal), `userActionConfirm` + a thin `loadUsers()` wrapper (a reload disarms the armed suspend confirm), `mediaDeleteInUse`, the row mutations (`dismissReport`, `restoreShelter`, `patchUser`, the media upload/delete pair), and `ensureMediaLoaded` (the hero picker's lazy read of the library). The shared `normalizeListParams` (one atomic replaceUrl pass over ALL tabs' params — it cannot be per-tab without fragmenting that single history entry) also stays, and is why `parsePage`/`parseSize`/`PAGE_SIZE_DEFAULT` remain page imports while `clampPage`/`lastPage` moved into the view.

### 1.3 Expression pass over what remains (981 lines)

- **Planning ids removed** (run comment rule + the GUARD-GAP sweep request): `W2-A`, `W3-B`, `D4`, `D8`, `D12`, `crisis-guidance`, `abuse-limits`, `community-review-queue`, `admin-tab-persist`, `admin-page-size`, `admin-guidance-search` — gone from `admin-page.ts` and `admin-page.html` (verified 0 hits against the guard pattern set); the constraint text each id annotated was kept or carried into the views' docs. The class doc was condensed from ~115 lines to ~70 (the per-tab bullets keep their constraints — why the queue is un-paged, why delete is API-first, why a merge failure degrades the column — and lose the history).
- **Comments state constraints, not history** — e.g. the "first adopter of the admin's list-page-paging follow-up" phrasing is gone; the "owner's" plan-speak is gone; the `onContentLanguageChange` doc no longer re-explains the view's invalidation rules (it points at `guidance-view.ts`).
- **No nested ternaries** in any owned file (checked); the report filter's URL write went from a private 30-line method to the view's `navigate({ extra })` call; `onQueryChange`'s tab dispatch is a flat switch over the nine views.
- **Naming** — the four paged fields read as the tabs they are (`reports`, `users`, `media`, `audit`), replacing 32 scattered `reportX`/`userX`/`mediaX`/`auditX` signals.

### 1.4 The ceiling

`ADMIN_PAGE_MAX_LINES` in `architecture.spec.ts`: **2126 → 981** (measured). The ceiling note was rewritten to record why it is lowered in this commit (both seams, the pattern, and what the next named seam is — the review-queue state: the full shelters list, the reject-reason editor, the confirm/reject row actions and their refetch).

**What I deliberately did NOT do:**

- A fifth extraction (the review-queue state). It is the next named seam, but at ~120 lines it does not yet pay for its own object — extracting it would create a view with one consumer and one method each, which is the speculative-generalization failure mode the `clean-code` skill warns about. The ceiling note names it for when the ceiling bites.
- A `PagedView` for the Unconfirmed/Alerts tabs — they are deliberately un-paged (the queue filters the whole scope; the alerts ring is the backend's bounded in-memory cap), so the shared shape does not fit and forcing it would lie.
- Moving the shared normalizer into the view (§1.2) — one atomic replaceUrl over all tabs' params is a page-level invariant.

---

## 2. How the URL contract is proven unchanged

The contract: the tab is in the URL (`tab` param, absence = default); **user-initiated switches PUSH** (back returns the previous tab and its view); **clamping normalizes in place** (`replaceUrl`, no history entry for the cosmetic fix); **bad values normalize to the default/first legal value**; defaults are the param's absence (omit-defaults); a view change re-loads only when the view's own params changed; a change landing mid-load re-loads with the fetch-sequence guard dropping the superseded response.

- Every writer moved as a unit: `syncFromParams` (URL→state) and `navigate` (state→URL) in `PagedView`/`GuidanceView` are the only writers, exactly as the per-tab methods were on the page. The `firstVisit` (lazy-load) flag, the view-key format (reports: `page|size|exclude`; the others: `page|size`), the omit-defaults omissions, the `clampPage`-at-new-size rule in `onNavigate`, and the snapshot-merge in `navigate` are preserved line-for-line in the extracted code (diff-verified against the pre-edit methods).
- The 20+ pinned URL-semantics tests in the **unmodified** spec (per-tab namespaced params, the default omissions, the clamping replaceUrl, the out-of-range notice, the mid-load re-load, the tab switch push vs the URL-step no-write) all pass — see §3/§5.
- The pinned template hooks the spec drives (`switchTab('…')` calls, the `tab() === '…'` guards — both asserted by the architecture spec across all 9 tabs) are untouched.

## 3. How the rest of the behaviour is proven unchanged

1. **The spec is byte-identical** — `git diff -- admin-page.spec.ts` is empty (4097 lines before and after). Its direct member accesses (`searchQuery`, `rejectReason`, `requestMessage`, `rejectRow`) all still exist on the page (the first two as the same proxy getters onto `SheltersView`; `rejectReason` the same control; `rejectRow` the same method).
2. **Baseline → post-extraction gates both 1562/1562, exit 0** (same test count as the run's stated baseline of 1562 tests / 65 files) — one green run before this lane's PagedView pass and one after it (§5). No test was added, removed, or weakened; no test file was modified.
3. **The row mutations keep their exact side-effect order** — e.g. `dismissReport` still patches the in-memory row/total in scope (filter out + total−1 with the open scope, dim-in-place with the default scope) before setting the success copy; `restoreShelter` still patches the report row AND the shelters view in the same call; the media upload still jumps to page 1 via the URL (re-load) on a later page and prepends in place on page 1; the 409 delete still arms the confirm strip with the server message.
4. **The `GuidancePanel`/`ReportsPanel`/`UsersPanel`/`MediaPanel`/`AuditPanel` component APIs are untouched** (other lanes' files) — only the page-side bindings, which re-express the same expressions through the views (`reportRows()` → `reports.rows()`, `loadReports()` → `reports.load()`, `onReportsNavigate($event)` → `reports.onNavigate($event)`, …).

## 4. Line counts

| File | Before (HEAD) | After | Δ |
|---|---|---|---|
| `features/admin/admin-page.ts` | 2126 | **981** | **−1145 (−54%)** |
| `features/admin/admin-page.html` | 319 | 319 | 0 (164 binding lines rewritten through the views) |
| `features/admin/admin-page.scss` | 39 | 39 | 0 (untouched) |
| `features/admin/admin-page.spec.ts` | 4097 | 4097 | 0 (frozen by the brief) |
| `features/admin/guidance-view.ts` | — | 957 | new |
| `features/admin/paged-view.ts` | — | 179 | new |
| `architecture.spec.ts` (ceiling) | 2126 constant | 981 constant | lowered in-commit |

The total admin-page surface is 981 + 957 + 179 = 2117 lines vs 2126 before — the win is structure, not line count: four single-purpose seams instead of one 2126-line god object, with the page back under the ~1000-line mark where it can be read top-to-bottom.

## 5. Gates

`cd frontend && npx ng test --watch=false` and `npx ng build`, run detached with exit files (the run's gate shape):

- **Gate A (post guidance-extraction, pre paged pass): tests exit 0** — 1562/1562, 65/65 files.
- **Gate B (final state): tests exit 0** — 1562/1562, 65/65 files, including the updated architecture ceiling test (981 ≤ 981). One transient failure on the first final run: the ceiling test saw 982 lines because the gate started while a comment edit was one line over; the file was corrected to 981 and the re-run (Gate B) is green. Logged here for transparency.
- **Build (final state): exit 0.** Budget: the 15 per-component SCSS warnings in the log are pre-existing and identical in count to the pre-change run, all on SCSS files this lane never touched (`guidance-panel.scss`, `guidance-translations.scss`, `guidance-editor.scss`, `media-panel.scss`, `page-shell.scss`, `submit-shelter-page.scss`); initial/bundle budgets are green.
- `tsc --noEmit -p tsconfig.app.json`: exit 0 on the final tree.
- `admin-page.spec.ts` passes **untouched** in every run (4097 lines, 0 diff).

## 6. Unverified / handed over

- **The 17 planning-id lines in `admin-page.spec.ts`** (`:85,150,412,519,1075,1386,1631,2184,2231,2865,2999,3140,3714,3716,3832,3836,3894`) — GUARD-GAP's sweep request cannot be honoured by this lane: the brief freezes the spec ("all existing specs must pass UNCHANGED; if a spec must change, stop and report"). The ids are comment/`it()`-title only (zero behaviour), so a comment-only rewording would be safe — but that is the parent's authorization to give, or the lines can be assigned to the guard lane. On the notes board; `SourceVocabularyTest` stays red on them until then.
- **`docs/agent/00-CURRENT-STATE.md` anchors** (docs-lane-owned, outside my write scope): `:515` → `:368`, `:575-602,651-656` → `:425-508`, `:603-618` → `:453-468` (verified against the final file). `DocumentationFactsTest` stays red until the docs lane moves the citations — the two backend lanes already had this on the board; my reply carries the new ranges.
- **Attribution flag for the parent:** my `architecture.spec.ts` ceiling edit (2126 → 981 + note) was committed inside a **parallel lane's commit `33793ce`** (shared worktree, broad `git add` swept the in-progress edit; the commit message does not mention it). The content is correct and gate-verified; the parent may wish to note it at review time. My lane's own files remain uncommitted per the run rule.
- **Skills findings acted on:** `clean-code` — Duplicated Code (the four paged tabs) extracted to the shared shape; Feature Envy (the tab state calling back into page feedback) resolved by the view owning its state; comments reduced to constraints; planning ids removed per the run rule. `code-review` — the two speculative constructs I nearly shipped (a one-use `patchRow` helper, an `error` signal dep the view doesn't need) were caught and dropped. `web-design-guidelines` — the touched template carries **no visual-behaviour change** (binding re-expression only; no markup, class, or attribute changes), my owned SCSS (39 lines) is untouched, and the guidance panel's a11y surface (labels, focus, two-tap confirms) is untouched component-side; nothing to act on from that audit for this diff.
- **Not verified:** nothing in scope remains unverified by the gates. The one residual red that depends on this lane is the frozen spec's id lines (§6.1) — a decision, not a defect.
