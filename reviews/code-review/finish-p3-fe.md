# FINISH-P3-FE — finish pass for the P3-E/F/G frontend items

Branch `code-review`, worktree `/home/aleks/MyScripts/LocalRepos/OpenShelter`. Nothing committed
(this lane's rule: the parent commits). All gates detached with exit files.

## Verdicts (one per owner item)

| # | Item | Verdict |
|---|------|---------|
| 1 | `color-scheme: dark` on the dark themes | **Done** — appended at the end of `styles.scss` + a new pin in `design-tokens.spec.ts` |
| 2 | Hero `sizes="400px"` — measure, then correct or record | **Measured → keep 400px** (supremum of the rendered hero slot ≈ 390px); two false comments corrected |
| 3 | Remaining P3-E/F/G safe items | **Safe subset applied** (one guard-doc comment); everything else verified already-resolved or reported out-of-scope |
| 4 | Frozen-spec prose/titles citing unresolvable names | **Done** — 47 comment/title-only replacements across 24 spec files; all remaining id-looking tokens verified resolvable or proven by a prior lane |

## Item 1 — `color-scheme: dark` (board #4, SIMPLIFY-CORE-FE:82)

**Change.** `frontend/src/styles.scss:922-931` (appended after the final rule; file 920 → 929 lines):

```scss
[data-theme='high-contrast'],
[data-theme='black-and-yellow'] {
  color-scheme: dark;
}
```

with an explanatory header comment. The light theme deliberately declares nothing (default light
scheme). Black-and-yellow is covered by the same attribute selector: its tokens are runtime inline
custom properties (`core/theme-tokens.ts` + ThemeStore), but the `data-theme` attribute is what the
selector keys on, and the attribute is set pre-paint.

**Why append at the end.** `DocumentationFactsTest` (Java side, not my gate) locates the
high-contrast block by first occurrence + comment-aware brace counting and checks the frontend
README's `styles.scss:LO-HI` citation against it; inserting mid-file would shift anchored lines
and renumber the doc citation. An append shifts nothing. Verified against the test's own logic
(`DocumentationFactsTest.java:1105-1144`).

**Pin (no test deletion/weakening — one added).** `frontend/src/app/design-tokens.spec.ts:497-506`:
`styles.scss — both dark themes declare color-scheme: dark`. It matches the grouped
selector + declaration in comment-blanked source (the file's `withoutCssComments` idiom, so only a
real declaration can satisfy it). File total 147 → 148 tests; suite total 1582 → **1583**.

## Item 2 — hero `sizes="400px"` (board #5)

**Method (real rendered measurement, not the scss-derived guess).** `ng build` output served at
`127.0.0.1:8123` with `/api` proxied to the live dev backend (:8080, 7 guidance posts); headless
Chromium via CDP; viewport sweep 320–1440px plus DPR-2 rows; measured
`getBoundingClientRect()` on `.guidance-post` (card) and `.guidance-post__hero` (the actual slot).
Harness: `/tmp/hero-measure/{serve,measure}.mjs`; raw rows in `/tmp/finish-p3-fe-measure.log`
(kept in this report below).

**Results (css px).** Shell outer box = viewport − 15px below the 1080px cap (page-chrome
offset), then `.shell-body`'s 2 × 20px padding:

| viewport | content | columns | max card | max hero slot |
|---------:|--------:|:--------|---------:|--------------:|
| 320 | 265 | 1×265 | 265 | 239 |
| 360 | 305 | 1×305 | 305 | 279 |
| 416 | 361 | 1×361 | 361 | 335 |
| 440 | 385 | 1×385 | 385 | 359 |
| 455 | 400 | 1×400 | 400 | 374 |
| 456 | 401 | 1×401 | 401 | 375 |
| 460 | 405 | 1×405 | 405 | **379** (measured max) |
| 500 | 445 | 2×214.5 | 214.5 | 188.5 |
| 630 | 575 | 2×279.5 | 279.5 | 253.5 |
| 632 | 577 | 2×280.5 | 280.5 | 254.5 |
| 640 | 585 | 2×284.5 | 284.5 | 258.5 |
| 700 | 645 | 3×204.33 | 204.33 | 178.33 |
| 768 | 713 | 3×227 | 227 | 201 |
| 848 | 793 | 3×253.67 | 253.67 | 227.67 |
| 888 | 833 | 3×267 | 267 | 241 |
| 900 | 845 | 3×271 | 271 | 245 |
| 1024 | 969 | 4×230.25 | 230.25 | 204.25 |
| 1080 | 1025 | 4×244.25 | 244.25 | 218.25 |
| 1280 | 1040 | 4×248 | 248 | 222 |
| 1440 | 1040 | 4×248 | 248 | 222 |

(The scss's own breakpoint notes — "3 / 2 / 1 at 888px / 672px / 456px viewports" — check out
against the measured column counts.)

**Supremum.** The single-column band lasts until the content width reaches the 2-column threshold
(416px, i.e. viewport ≈ 471px): within it the hero slot = content − 26px (card padding + border),
so it approaches **390px** (card border box → 416px) as the breakpoint is approached from below.
The measured sweep max is 379px (viewport 460); the 390px bound is the analytic limit of the same
measured function.

**Decision: keep `sizes="400px"`.** 400px ≥ the 390px supremum, so "the chosen derivative is never
too small" holds. Against the server's real ladder (96/192/480/800w, verified on
`/api/guidance`), a 400px declaration and a tight 390px declaration select the **identical**
derivative in every DPR case (DPR1 → 480w; DPR2 → 800w), so changing the attribute would be
cosmetic with zero traffic effect; the ≤2.6% over-declaration is the safe side of the
spec's contract.

**Changes (attribute untouched; two false comments corrected):**
- `frontend/src/app/features/guidance/guidance-list-page.html:60-71` — the comment claimed
  "400 px — always ≥ the rendered card width". The card's border box reaches ~416px (> 400), so
  that referent was wrong; the correct referent is the rendered hero width. Rewritten to record
  the measurement (fluid slot, ~390px supremum, ladder 96/192/480/800w, never-too-small).
- `frontend/src/app/hero-geometry.spec.ts:147` — comment `// the slot's fixed CSS width` →
  `// the fluid slot's measured max (~390px) is covered`. The `toBe('400px')` pin is unchanged.

**Out of scope, noted.** The detail hero's `sizes="704px"` (`guidance-detail-page.html:47`) is a
correct bound — the article column is capped at `44rem` = 704px (`guidance-detail-page.scss:6`).
Left as is.

## Item 3 — P3-E/F/G remaining items (act on what's safe)

**Applied.**
- `frontend/src/app/core/i18n/i18n-template-guard.spec.ts:60` — doc comment "(31 files)" →
  "(35 files)": `EXPECTED_TEMPLATES` has 35 entries and there are 35 `.html` files under
  `src/app` (P3-G "stale count in the guard's own doc"; the number drifted 23 → 26 → 31 → 35
  across lanes).

**Verified already resolved in the current tree (grep, not assumed):**
- `AdminGateway.listGuidancePosts` + `guidanceListPath`: **0 hits** (the 86 grep hits are the live
  paged `listGuidancePostsPage`).
- `updateGuidanceTranslation`: live — `admin-gateway.ts:437`, consumed by the UI
  (`admin-page.spec.ts:326` fakes the real call).
- `shelter-copy.ts` occupancy constants: now LIVE (used at `shelter-copy.ts:385-386`).
- `readCoordinate`: 0 hits. `AdminShelterFilters.status`: removed (`models.ts:634`).
  `ThemeRoot` / `isSiteTextKey`: 0 hits.
- `.chip` copy-paste: deduplicated (0 in `admin-page.scss`, 1 in `map-page.scss`).
- `admin-gateway.ts` header: "thirty-two endpoints over thirty-one methods — the bare and the
  paged guidance list share one" — matches the actual 31 public methods / 32 endpoint lines.
- `ShelterDto.provenance` / `MediaAssetDto.sourceUrl`: documented as intentionally unconsumed at
  `models-contract.spec.ts:21-22` → leave (a consumption change is behaviour, not hygiene).
- Quill asset pin: strengthened (`guidance-editor.spec.ts` covers both `angular.json` asset
  halves) — verified before this lane's compaction, still present.

**Proved dead but not deletable (rule: no test deletion).** The spec-only exports
(`ShelterTranslate`, `communityTrustLabel`, `OCCUPANCY_FIRM_KEY`, `OCCUPANCY_HEDGED_KEY` —
"0 external files") are each referenced by `shelter-copy.spec.ts` tests → a reference exists →
deletion would require deleting tests. **Leave; reported.**

**Left as out-of-safe-scope (behaviour changes / cross-boundary / other lanes) — report only:**
- P3-E nits needing behaviour changes or router-semantics verification: bare URL-literal contract
  in `admin-page.ts` (F5/F6), `index(row)` O(3n²) in `guidance-order-list.ts`, route query params
  read at construction (`login/verify/submit`), the two `paramMap`-completes-on-deactivate
  comments (`shelter-detail-page.ts:475-480`, `guidance-detail-page.ts:114-119` — claimed false in
  router 22.1.5; I did not verify router semantics, so I did not touch the comments), the `t`-pipe
  consumer-count comment, `ResendCountdown.active` invariant, tab-switch refetch, `Date.now()`
  template defaults, admin thumbnail `alt` duplication, origin-blind interceptor, logout not
  cross-tab (F8/F9).
- `.badge` base copy-pasted in four stylesheets: NOT safe to dedupe — moving the base into
  `styles.scss` changes the colour-literal audit surface (literals are only legal inside the
  `:root`/high-contrast blocks there) and any per-file divergence would silently change
  rendering.
- P3-F: `POST /admin/guidance/{id}/translations/attach` has no FE consumer (unreachable
  pair-existing-posts flow — a feature gap, backend exists); CSP-safe `index.html` is produced
  only by the npm `postbuild` hook — a bare `ng build` (the gate's command) exits 0 but emits the
  CSP-hostile `onload` swap (pipeline/doc gap; the gate spec is what the owner set).
- P3-G backend half (two boot-the-world ITs, three lane files with fully-qualified names): BE
  lanes.

## Item 4 — frozen-spec prose/titles citing unresolvable names

**Resolvability rulings (the repo's own standard: a citation resolves if the reader can open the
thing it names).**
- `01-TASK.md §8` — the document has §1–§7 only → **dead** (15 spec fakes headers).
- `bundle-lazy-i18n` — never existed as a change name (no dir, archived or live) → **dead**
  (16 spec comment prefixes + 1 in `index.html`, a main file — reported, not edited).
- Bare `N\d`/`F\d`/`W\d+` title parentheticals — review-pass ids with no resolvable artefact →
  **dead** (13 residual titles after the concurrent lane's sweep).
- `(owner report: “…")` provenance tag and `(see report)` — no document → **dead tags** (the
  quoted regression text kept; the stale "i18n lane adds it this wave" sentence dropped — the key
  `authPage.reset.newPasswordTooShort` is in the catalog).
- **Left as resolvable:** `site_texts` (live table, `V27__site_texts.sql:20`); `models-contract`
  F1/F2-class citations (`reviews/11-integration-devops.md` and
  `reviews/stale-decisions/SD-1-colour-rendering.md` exist); `01-TASK.md §4` / `§5.10` main-file
  citations (sections exist); `reviews/12-summary` QW6 and `reviews/19-spacing-audit.md`
  citations (exist); "the owner reported" as narrative (a role, not a document).
- `i18n-et-en` (archived → dead name): **0 hits** in the current tree — the catalog lane already
  cleaned it. `admin-locale-split` (dead slug): 0 hits — ID-SWEEP's parent-authorised pass
  cleaned the seven `admin-page.spec.ts` it-titles and the `i18n.spec.ts` describe before this
  lane. Nothing left to do for either.

**Changes (this lane): 47 comment/title-only replacements across 24 spec files — zero assertion,
expectation, or string-literal changes** (verified: each replacement matched its expected count
exactly; the full suite diff is comments/titles only). Treatment = the ID-SWEEP idiom: drop the
dead citation, keep the constraint each stood for.

| File | What |
|------|------|
| `core/i18n/i18n.spec.ts` (58, 158, 195, 236) | `bundle-lazy-i18n:` prefix ×4 |
| `core/api-interceptor.spec.ts:190` | title `(F2)` |
| `session/auth-store.spec.ts` (53, 215, 365, 386, 407, 601) | fakes header §8; titles `(W13) (F3) (F4) (F4) (F1)` |
| `shared/consent-banner.component.spec.ts:94` | `bundle-lazy-i18n:` |
| `shared/page-shell.spec.ts` (890, 943, 971) | `bundle-lazy-i18n:` ×3 |
| `features/auth/login-page.spec.ts` (304, 334, 355) | `bundle-lazy-i18n:` ×3 |
| `features/auth/reset-page.spec.ts:318-321` | stale "(see report)" comment block → cut to the constraint |
| `features/account/account-page.spec.ts` (50, 463, 500) | fakes header §8; titles `(F5) (F5)` |
| `features/account/contributions-panel.spec.ts:33` | fakes header §8 |
| `features/account/verify-page.spec.ts:25` | fakes header §8 |
| `features/admin/admin-page.spec.ts:295` | fakes header §8 |
| `features/admin/guidance-editor.spec.ts:156` | fakes header §8 |
| `features/admin/site-texts-panel.spec.ts:97` | `bundle-lazy-i18n:` |
| `features/guidance/guidance-list-page.spec.ts` (15, 325, 676) | fakes header §8; owner-report tag; `bundle-lazy-i18n:` |
| `features/guidance/guidance-detail-page.spec.ts` (16, 469) | fakes header §8; owner-report tag |
| `features/legal/privacy-policy-page.spec.ts:116` | `bundle-lazy-i18n:` |
| `features/legal/terms-page.spec.ts:92` | `bundle-lazy-i18n:` |
| `features/map/map-page.spec.ts` (28, 927, 985, 1021, 1859) | fakes header §8; titles `(F6) (F1) (F5)`; `bundle-lazy-i18n:` |
| `features/shelter/shelter-detail-page.spec.ts` (29, 772, 881) | fakes header §8; titles `(F1: …)` (explanation kept) `(F9)` |
| `features/shelter/submit-shelter-page.spec.ts:15` | fakes header §8 |
| `gateways/{admin,geo,guidance,shelter}-gateway.spec.ts` | fakes headers `(01-TASK.md §8)` ×4 |

**Concurrency note (verified, not assumed).** A parallel owner-spawned lane
**FINISH-COPY-GUARD** (subagent `sa-b3900157`) was sweeping the same frozen-spec class
(N-series titles in 11 spec files, planning comments in `login-page.ts`/`register-page.ts`/
`reset-page.ts`, the `en.ts` `how.sources` triangle sentence, and the `SourceVocabularyTest`
census extension — board #15). We did not collide: I claimed my 27 files
(`claim_files`, first-wins, no conflicts reported), every replacement in my sweep used
exact-string matching with per-pattern count assertions (47/47 matched), and a re-census after
the concurrent edits showed zero overlap of surviving markers. Its changes are in the same
worktree and are green under my gates below.

**Board "six guidance spec lines" reconciliation:** filed as `guidance-list-page.spec.ts:15,325,443;
guidance-detail-page.spec.ts:16,391,404` (pre line-drift). Current-tree markers resolved to
`list:15,325,676` and `detail:16,469,696`; the filed `:443`/`:391`/`:404` lines carry no
unresolvable name in the current text (constraint prose) and were correctly left.

## Translation-value reports (per my rule: report, never edit)

- **`how.sources` triangle copy** — the concurrent FINISH-COPY-GUARD lane removed the
  "unverified submitter shows a yellow triangle" sentence from the **EN** value (board #1).
  The ET/RU values are untouched in the worktree → cross-locale asymmetry pending that lane's
  completion (its report: `reviews/code-review/finish-copy-guard.md`).
- **ET `admin.reports.dismiss` "Arvelda"** — untouched; owner native-review decision (board #2).
- **Submit placeholders not ending "…"** — untouched; owner copy decision (board #3).

## Gates (detached, exit files)

| Gate | Command | Exit | Result |
|------|---------|:----:|--------|
| test (gate 1) | `npx ng test --watch=false` | — | 1583 tests / 65 files, 1 fail (my pin's first-draft regex — fixed same pass) |
| test (gate 2) | `npx ng test --watch=false` | — | 1583 tests / 65 files, 1 fail (stale pin load) — all other 1582 green |
| targeted | `ng test --include=design-tokens.spec.ts` | 0 | 148/148 (pin fixed) |
| **test (gate 3, definitive)** | `npx ng test --watch=false` | **0** | **65/65 files, 1583/1583 tests** (baseline 1582/65 + 1 new pin = the only delta) |
| **build (gate 4, definitive)** | `npx ng build` | **0** | dist emitted (`/tmp/finish-p3-fe-build2.exit`, log `/tmp/finish-p3-fe-build2.log`) |

Logs: `/tmp/finish-p3-fe-test{1,2,3}.log`, `/tmp/finish-p3-fe-build{1,2}.log`.

## Unverified / residual

- **Maven/Java gates not run** (BE-lane territory; flock discipline per board #21; a concurrent
  `mvn` build was active). My only file touching a Java-asserted surface is the `styles.scss`
  append, which cannot shift any anchored line (verified against `DocumentationFactsTest`'s
  first-occurrence + brace-count + README-range logic).
- Hero measurement is one Chromium build on the dev backend's live data; the DPR-2 rows confirm
  the derivative selection is DPR-stable for the 400px declaration.
- The two `paramMap` comment claims were not verified (router semantics) → left untouched and
  reported, per the "act only on what's safe" rule.
- `index.html:98` still carries the dead `bundle-lazy-i18n` slug in a comment — a **main file**,
  outside the frozen-spec-prose scope of item 4; flagged for the next serial pass or the parent.
