# QW-ADMIN-PAGE report — QW2 (state bugs) + QW3 (admin i18n)

Scope: `features/admin/**` + i18n catalogs + `shared/shelter-copy.ts`. No commits
(parent commits on completion). `design-tokens.spec.ts` and
`guidance-editor.spec.ts` untouched. DnD×pagination rule untouched and still
passing (its tests are green in the final run).

## QW2 — the two admin state bugs

### Bug 1 — the `!live` guard drops an in-flight filter change (P1-5a/5b, client half)

**Before.** `syncSheltersFromParams` / `syncGuidanceFromParams` bailed out when
`live` (a fetch in flight) was true AND the params key changed — so clicking
a source chip while the first load was in flight navigated the URL to
`source=USER` while the list kept rendering the unfiltered response, and the
re-click could not recover (same-URL navigation is skipped, the view never
re-syncs).

**After.** The guard is now `!firstVisit && key === viewKey` — an in-flight
fetch no longer suppresses a params change. The stale *response* is handled
by the existing sequence guards (see bug 2), so the late unfiltered page is
discarded and the filtered reload (triggered by the navigation) wins.

### Bug 2 — the shelters loader had no fetch-sequence guard (P1-1 client half)

**Before.** `loadShelters` captured no sequence: a slow first response that
landed after a second fetch (e.g. the filtered reload above) overwrote the
newer list. The sibling guidance path ~40 lines below already had exactly
this guard.

**After.** `private shelterFetchSeq = 0`, incremented per request; `then` and
`catch` both drop stale responses (`seq !== this.shelterFetchSeq`). The
paged-refresh leg in `refreshShelters` snapshots the seq without bumping it
(the refresh is the continuation of the same logical load).

### Pinning tests (7 new, in "AdminPage paged list view state")

1. `shelterPage=abc` → clamped to 1, `shelterPage` dropped from the URL.
2. `shelterPage=0` → clamped to 1, dropped.
3. `shelterSize=abc` → default 20, dropped.
4. `shelterSize=25` → nearest valid size (30), `shelterSize` kept.
5. `shelterSize=500` → 100; `guidanceSize=5` → 10 (both tabs clamp).
6. `source=BOGUS` and `source=ALL` are dropped from the URL by
   `normalizeListParams` (the old URL's own comment said only REGISTRY/USER
   were valid); `source=REGISTRY` is kept.
7. In-flight: first page load held open, 'Community' chip clicked mid-load →
   third call is `{source:'USER', limit:20, offset:0}`; resolving the stale
   unfiltered response afterwards renders nothing of it ('Linna Varjend'
   absent).

**Mutation proof** (isolated worktree at HEAD + my files, because a
concurrent lane had `guidance-editor.spec.ts` temporarily non-compiling in
the shared tree): M1 (restore `!live`) → in-flight test fails; M2 (remove
seq guard) → stale row renders, test fails; M3 (neuter normalizer) → all six
clamp tests fail. Worktree removed afterwards.

## QW3 — the admin i18n bypass

### What was bypassed

- **29** `bannerMessage(error, 'shelter')` call sites passed no translate
  callback → every 4xx/5xx on the admin surface rendered the *English*
  fallback regardless of the moderator's language. All 29 now pass
  `(key) => this.i18n.t(key)`.
- **10** success-banner literals hardcoded in English (11 distinct strings;
  'Shelter restored.' appears twice) → now `this.i18n.t('admin.shelters.success.*')`
  / `admin.reports.success.dismissed` / `admin.users.success.*` (incl. the
  hidden/restored and suspended/unsuspended ternaries).
- **3** copy constants frozen to English in `shared/shelter-copy.ts`:
  `PRIVATE_LOCATION_BADGE`, `INACCURATE_BADGE`, `INACCURATE_WARNING` — consumed
  only by `admin-page.ts`. Removed; the templates now render catalog values
  through the `t` pipe (`'shelter.privateBadge' | t`,
  `'account.contrib.inaccurate' | t`, `'admin.shelters.inaccurate.badge' | t`)
  — the map-page idiom. The other three constants
  (`PRIVATE_LOCATION_NOTE`, `COMMUNITY_UNVERIFIED_WARNING`,
  `REPORT_SUBMITTED*`) are out-of-scope dead code (P3-E) and stay.
- **Helpers re-exposed without the seam**: `sourceTrustLabel(row)` and
  `occupancyText`/`ageText` were called with no translate callback on the
  admin surface → trust badges and occupancy lines stayed EN. Added the
  map-page-idiom seam `private readonly translate = (key, params?) =>
  this.i18n.t(key, params)` and passed it at every shared-copy call site.

### Catalogs (one batch, all 4 files, 12 keys × 3 languages)

`admin.shelters.inaccurate.badge`; `admin.shelters.success.{confirmed,
rejected, hidden, restored, deleted, questionSent, inaccurateMarked,
inaccurateCleared}`; `admin.reports.success.dismissed`;
`admin.users.success.{suspended, unsuspended}`. EN values are byte-identical
to the old literals (so the 7 existing EN spec pins now pin the EN catalog,
not dead literals). ET/RU translated — note: a concurrent lane landed a
large ET catalog rework in commit `804101d`; my ET values sit on top of that
and the parity guards pass. The identity + parity specs
(`catalog-identity.spec.ts`, `i18n.spec.ts`) are green; because the
`Messages` interface is derived from `messages.ts`, a missing catalog key is
a **compile error**, not just a test failure.

### Two-sources-of-truth (guidance search)

`guidanceQuery` (applied filter, URL-backed) vs `guidanceSearch` (the form
control) were synced in the submit/clear handlers only. Fix: in
`syncGuidanceFromParams`, when the *applied* term changes (`q !== prevQ`),
the control is written with `{emitEvent:false}` — so a hand-opened
`/admin?q=…` and history steps pre-fill the field, while page/size steps
leave an unsubmitted draft alone (user state, not view state). The
content-locale subscription already cleared the control (its
`setValue('', …)` predates this change) — verified by mutation.

Pinning tests:
- `a hand-opened /admin?q=… pre-fills the guidance search input` — **fails
  without the fix** (mutation M4: the 2-line sync block removed → input
  stays empty, filter still runs; 106/107 pass, this one fails).
- `a content-language switch clears the guidance search input WITH the
  filter` — pins the reset (input cleared, `q=` dropped from the URL, reload
  with `{locale:'ru', limit:20, offset:0}` and no duplicate load).

Mutation M5+M7 (all 29 callbacks removed + one literal restored) → the ET
test fails, 106/107. Mutation M6 (12 EN keys deleted) → **build fails**
(`TS2740: Type … missing 'admin.shelters.inaccurate.badge', … 8 more`),
proving the compile-time parity guard.

### ET-moderator proof (new test)

`an Estonian moderator reads the moderation surface in Estonian` — sets
`et`, `ensureCatalog('et')`, then asserts: 'Uus kogukonnalt' (source/trust
seam), 'Täis · 12 min tagasi' (occupancy seam), 'Privaatkodu
(deklareeritud)' (private badge), 'Ebatäpne' (inaccurate badge), 'Teatatud
ebatäpseks — detailid võivad olla valed' (warning), success 'Varjupaik
peidetud.' after hiding (and NOT 'Shelter hidden.'), and the 5xx
client-error copy 'Midagi läks valesti. Palun proovi uuesti.' after a 503.

## Follow-up items (from the finishing lane)

1. `shelter-copy.ts` — "amber marker treatment" doc corrected: NEW and
   CONFIRMED are ONE unified yellow after the pin-colour unification
   (`--color-new == --color-verified`); the reported tone (red-orange,
   `--color-reported`) is untouched. Four comment sites fixed (trust-label
   doc, `communityBadgeClass` doc, status-rule doc, badge-text doc).
2. `map-page.html` — legend comment corrected ("the amber NEW tone" → the
   NEW tone is the unified yellow, deliberately not a legend entry — the
   owner decision and the deliberate absence of a NEW swatch are preserved).
   Two more stale "amber" comments in the same file fixed. **Comments
   only — zero behaviour change, no swatch added.**
3. pi-lens advisory `prevQ declared but never used` (admin-page.ts L663) —
   **stale**: it fired during my transient mutation state (which
   temporarily removed the `if (q !== prevQ)` block while leaving the
   declaration). The live file uses `prevQ` (declared L665, used L667);
   `lens_diagnostics` on the current file reports no such finding.

### Future work (NOT started, per owner)

Every admin list gets the shared pagination control + reports list hides
dismissed reports — queued behind the shared paging component. Kept
adoptable: all list state stays in the uniform per-tab shape
(`pagedState {page,size,total}` keyed by tab, URL params `<tab>Page` /
`<tab>Size`, one normalizer + one sync per tab). No ad-hoc state introduced
in reports/users/media/audit handling during this batch.

## Verification (final state, after the follow-up items)

- `npx ng test --watch=false`: `Test Files 59 passed (59)` /
  `Tests 1410 passed (1410)`. (Baseline at session start was 1399; the
  drift is concurrent lanes' added tests plus my 10 new tests.)
- `npx ng build`: `Output location: …/dist/frontend` (only the pre-existing
  SCSS budget warnings).
- `lens_diagnostics` (LSP) on the three touched files: no errors; remaining
  findings are repo-wide ast-grep style hints (import-extension,
  no-unknown-parameters, etc.) that predate this work.

## Coordination notes (unverifiable / lane-crossing)

- HEAD moved mid-task: `804101d chore: the remaining admin and frontend
  work` (01:14, parent commit of the other lane's finish) landed a large
  i18n catalog rework and admin/template changes; my batch applied cleanly
  on top and no key collisions resulted (each of my 12 keys appears exactly
  once per catalog).
- A concurrent pass renamed the page's `i18nService` member to `i18n` in
  the working tree **after** my first full green run; the post-rename tree
  re-verified green (1410) before I touched anything else.
- Mutation proofs M1–M3 ran in an isolated worktree (see QW2) because the
  shared tree was transiently non-compiling due to the other lane's
  `guidance-editor.spec.ts` mid-edit; M4–M7 ran in-tree with
  backup/restore and each mutation was verified to restore byte-identical.
