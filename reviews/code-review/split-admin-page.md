# SPLIT-ADMIN-PAGE — the review-queue seam out of `admin-page.ts`

Branch `code-review-2`. Scope: `frontend/src/app/features/admin/admin-page.ts` (981 lines, at its
guard ceiling) + the file extracted from it + the ceiling guard. The spec
(`admin-page.spec.ts`, 4093 lines) is the contract and stayed **byte-identical**.

## 1. Seam verdicts

The file after the previous split is: the tab vocabulary + URL machinery, the five view
constructions, the nine tab panels' bindings, and the row-action handlers of the four
server-paged tabs (whose paged state already lives in the shared `PagedView` instances).
Judged every remaining section against the established standard — a page-owned state object
for a cohesive tab whose state must survive tab switches (the lazy-load rule):

### REAL — extracted

**The Unconfirmed (review-queue) tab → `unconfirmed-view.ts` (166 lines, new).** This is the
seam the architecture guard's ceiling note itself named ("What comes out FIRST when the ceiling
bites next: the review-queue state — the full shelters list, the reject-reason editor, the
confirm/reject row actions and their refetch"). It passes the test cleanly:

- Cohesive state: `queueRows` (the FULL un-paged shelters list — the queue is a filter of the
  WHOLE scope, so the Shelters tab's paging must not hollow it out), the `rows` computed
  (USER+NEW, id-descending), `rejectRowFor`, the `rejectReason` control (required non-blank,
  ≤500 — `REJECT_REASON_MAX`).
- Its own handlers: `load()`, `confirmRow`, `openRejectEditor`, `cancelReject`, `rejectRow`.
- Its cross-tab refetch: `refreshShelters()` (the queue's full list always + the Shelters tab's
  loaded page when loaded — the paged leg's fetch-sequence guard stays with `SheltersView`).
- The state must survive tab switches (the queue loads in `ngOnInit` and a visit after a load
  keeps the in-memory rows) — exactly the `SheltersView`/`GuidanceView` pattern.

The spec pins exactly two members of this section (`page.rejectReason` ×2, `page.rejectRow` ×1
— the whole pinned surface of the 4093-line spec is `searchQuery` ×2, `requestMessage` ×1,
`rejectReason` ×2, `rejectRow` ×1), so the page keeps two thin re-exposures on the view — the
`rejectReason` getter and the `rejectRow` delegate — the same idiom the previous split used for
`searchQuery`/`requestMessage`. No spec line was touched.

Cross-tab wiring (kept explicit, both directions through the page):

- The load error stays `SheltersView.loadError` (one endpoint, one banner — documented
  sharing); the view receives it as a dep signal, and the panel's `[loadError]` binding is
  unchanged.
- `SheltersView.reviewRefetch` (its request-info / mark-inaccurate / clear-inaccurate row
  actions) now points at `unconfirmed.refreshShelters()`; the view's confirm/reject call it
  directly. The refetch moved as a unit from the page to its state's owner.

### REJECTED — with reasons

1. **Media tab** (~150 L: `mediaDeleteInUse`, the `media` PagedView instance, six methods).
   The paged state is ALREADY extracted (the "four PagedView instances declared together"
   pattern the previous split landed and documented); what remains is a transient two-tap
   `ConfirmAction` (disarmed on EVERY tab switch — it needs no survival) plus row-action
   handlers, which the established pattern keeps on the page (`dismissReport`,
   `confirmUserAction`, `patchUser` all survived the previous split for this reason).
   Extracting the whole tab would nest a PagedView instance a level deeper and break the
   four-instances idiom; extracting only the delete-confirm trio would scatter the tab's state
   across two files.
2. **Users tab** (~85 L: `userActionConfirm` + five methods) — same reason: paged state already
   in its PagedView; the rest is a transient `ConfirmAction` (disarmed on tab switch and on
   reload) + row actions.
3. **Reports tab** (~90 L: `reportExcludeDismissed` + three methods). The paged state is in
   PagedView; `reportExcludeDismissed` is cross-panel VIEW SCOPE — part of the reports view key,
   read by the page's normalizer and written by `onReportFilterChange`'s URL write — so moving
   it would scatter the URL contract; and `restoreShelter` crosses into
   `shelters.patchShelter` (cross-tab).
4. **Alerts tab** (~25 L) — one lazy-loaded list plus a 12-line load, no row actions. A view
   object there is ceremony; the previous split deliberately left it page-level.
5. **The URL normalizer** (`normalizeListParams` + `onQueryChange` + `syncReports`, ~160 L) —
   deliberately page-level by documented design: ONE atomic `replaceUrl` pass over ALL the
   tabs' params, one history entry; a tab's half cannot navigate separately without
   fragmenting that single navigation (stated in both `shelters-view.ts` and `paged-view.ts`
   docs). It is the last coherent block — now named as such in the ceiling note.

## 2. What changed (file:line)

**`admin-page.ts` (981 → 901, −80):**

- Imports: dropped `computed`, `Validators`, `nameBlankValidator`, `REJECT_REASON_MAX`
  (all moved to the view); `FormControl` kept type-only (the two re-exposure getters); added
  `UnconfirmedView`.
- Fields (old 198-220 → new 198-203): the four state fields replaced by the spec-pinned
  `rejectReason` getter onto the view.
- Shared UI state (new 263-301): `shelters` doc updated, `reviewRefetch` retargeted to
  `this.unconfirmed.refreshShelters()`; new `unconfirmed` field (declared AFTER `shelters` —
  its initializer reads `this.shelters.loadError` eagerly; the reverse reference is a lazy
  arrow, safe at call time). Both fields carry explicit type annotations — the two
  initializers reference each other, so TS inference would otherwise collapse to `any`.
- `ngOnInit` (new 549): `this.loadQueue()` → `this.unconfirmed.load()` (comment untouched).
- Methods (old 621-712 → new 624-633): `loadQueue`/`confirmRow`/`openRejectEditor`/
  `cancelReject`/`rejectRow`/`refreshShelters` out; one spec-pinned `rejectRow` delegate in.
- Class doc (new 73-76): the view-object parenthetical now lists `UnconfirmedView`.

**`admin-page.html` (319 → 321):** the unconfirmed panel block re-expressed through the view —
`unconfirmed.rows()`, `unconfirmed.rejectRowFor()`, `unconfirmed.rejectReason`,
`unconfirmed.load()`, `unconfirmed.confirmRow/openRejectEditor/rejectRow/cancelReject`;
`[loadError]="shelters.loadError()"` UNCHANGED (the shared signal). No other panel touched.

**`unconfirmed-view.ts` (166, new):** deps interface (admin, i18n, the shared `loadError`
signal, busy/error/success, clearFeedback, `sheltersPagedRefresh`) + the state and the five
methods, comment-for-comment from the page (the "verified against the live API" constraint,
the 409-verbatim rule, the editor-stays-open-on-failure rule all travel with the code).

**`architecture.spec.ts` (179 → 187):** ceiling 981 → 901 with the re-measurement note and the
new "what comes out FIRST" pointer (see §4).

## 3. How behaviour is proven unchanged

1. **Spec byte-identical** — sha256 `e1dc73672f1c8c227612b371943b59fe4ad419b8973d848f03f209e9eb284fec`
   before AND after; `git diff` on the file empty. Its direct member accesses
   (`rejectReason`, `rejectRow`) still exist on the page as the same control (same instance,
   re-exposed) and the same-arity async method (now delegating).
2. **Side-effect order preserved line-for-line** in the extracted methods (busy guard →
   clearFeedback → busy.set(true) → mutation → success copy → refetch, catch → banner,
   finally → busy.set(false); the editor STAYS open on reject failure; `loadQueue` still
   clears the shared load error before fetching; the refetch still sets the queue list and
   then calls the paged leg).
3. **Template bindings re-expressed, not re-thought** — every expression is the old one with
   `unconfirmed.` prefixed where the state moved; the panel component (`unconfirmed-panel.ts`,
   another lane's file) is byte-identical, as are all other panels and both views' APIs.
4. **i18n keys, fetch sequencing, stale-response guard, URL state untouched** — nothing in the
   URL machinery, the normalizer, the tab switching, or any translation was modified; the
   fetch-sequence guard lives in `SheltersView.refreshPagedView` and was not touched.
5. **Gate:** `npx ng test --watch=false` **exit 0 — 1583/1583, 65 files** (the stated 1583
   baseline, count unchanged — no test added, removed or weakened), including the
   architecture guard's ceiling assertion at the new number. `npx ng build` **exit 0**
   (detached, exit files `/tmp/splitadmin-test.exit`, `/tmp/splitadmin-build.exit`).

## 4. The ceiling: 981 → 901, and why it is tight

Old `ADMIN_PAGE_MAX_LINES = 981` = the size measured at the previous split (zero slack then).
New `ADMIN_PAGE_MAX_LINES = 901` = `wc -l admin-page.ts` AFTER this split — the guard counts
with wc semantics (final newline doesn't start a line), and the ceiling test passed at
`lines === 901`, i.e. **exactly at the ceiling, zero slack**: one added line turns it red.
That is the same tight convention the number has always had (2535 → lowered → raised → 981,
each a measured size). The note now says what comes out first next time: no state-object seam
is left (the media/users/reports sections are row-action handlers whose paged state is in the
PagedView instances, and the pattern keeps them on the page); the last coherent block is the
shared URL normalizer, and extracting it would have to keep it one atomic `replaceUrl`
navigation (a shared object the page calls, not a per-tab view).

## 5. Anchors (rule 6) — shifts recorded in the notes board

`docs/agent/00-CURRENT-STATE.md` is another lane's file; the three citations into
`admin-page.ts` shifted by exactly +3 (all sit below the net +3-line top-of-file delta and
above the removed methods region):

| Citation (00-CURRENT-STATE.md) | Old | New |
|---|---|---|
| :208 — "the view IS the URL" (querySub doc) | `admin-page.ts:368` | `:371` |
| :215 — `normalizeListParams` | `:419-509` | `:422-512` |
| :219 — the namespaced `{list}Page/{list}Size` `check(` calls | `:453-467` | `:456-470` |

Both were verified in-tree post-edit and recorded in `docs/autopilot/CODE-REVIEW-NOTES.md`
for the single anchor pass. Also recorded there: comment-only doc drift in
`shelters-view.ts:26,39-42,90,94` and `unconfirmed-panel.ts:19,40` (those files are outside
this lane's scope; the cited "page owns X" phrasings now describe `UnconfirmedView`).

## 6. Line counts

| File | Before | After | Δ |
|---|---|---|---|
| `admin-page.ts` | 981 | **901** | −80 |
| `unconfirmed-view.ts` | — | 166 | new |
| `admin-page.html` | 319 | 321 | +2 (view-pointer comment) |
| `architecture.spec.ts` | 179 | 187 | +8 (ceiling note) |

## 7. Gates

- `cd frontend && npx ng test --watch=false` (detached, exit file): **exit 0 — Tests: 1583
  passed (1583), Test Files: 65 (65)** — baseline count unchanged. Log `/tmp/splitadmin-test.log`,
  exit `/tmp/splitadmin-test.exit`.
- `cd frontend && npx ng build` (detached, exit file): **exit 0**. Log `/tmp/splitadmin-build.log`,
  exit `/tmp/splitadmin-build.exit`.
- Backend gate not run — nothing outside `frontend/src` touched (no backend file, no migration,
  no `docs/agent/00-CURRENT-STATE.md` edit — the anchor pass is owed, recorded in §5).

## 8. Unverified / handed over

- Nothing behaviour-unverified: the spec (all 1583) + the production build are both green.
  The one thing not exercised by this run is the view's `refreshShelters` under a genuinely
  concurrent in-flight URL load — but that path is unchanged code (`SheltersView`'s sequence
  guard) and its pins run in the suite.
- Handed to the notes board: the three anchor re-derivations (§5) and the two files' comment
  rewording (SPLIT-ADMIN-PAGE doc-drift entry). Neither is red today.
