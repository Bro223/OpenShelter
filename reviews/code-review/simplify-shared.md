# SIMPLIFY-SHARED — shared/ readability lane

**Scope:** `frontend/src/app/shared/**` (serialized lane — sole writer). Targets: `leaflet-service.ts`, `paging.ts`, `shelter-copy.ts`, `list-state.*`, `admin-copy.ts` + the shared helpers; audit extended to every file in the directory.
**Branch:** `code-review` · **Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` · **Skills:** `clean-code`, `code-review`, `web-design-guidelines` (current rules fetched 2026-09-24 from the URL inside `docs/skills/web-design-guidelines.md`).

---

## 1. What changed

### 1.1 Dead exports un-exported (zero-importer census)

A word-boundary census over every `.ts`/`.html`/`.scss` under `frontend/src` (definition file excluded) found eight exported symbols with **no reference anywhere** — not in features, not in specs. They were un-exported (visibility-only; no signature, value or behaviour change):

| File | Symbol | Why it was dead |
|---|---|---|
| `admin-tab.ts:44` | `AdminTabValue` | used only inside the file (`ADMIN_TAB_DEFAULT`, `parseAdminTab`) |
| `banner.component.ts:3` | `BannerSeverity` | used only as the `severity` input type |
| `confirm-action.ts:6` | `ArmedConfirm` | used only by the class's own state signal |
| `error-copy.ts:100` | `ErrorCopyKey` | used only inside `bannerMessage`'s seam type + `CLIENT_COPY` |
| `geolocation.ts:31` | `HIGH_ACCURACY_POSITION_OPTIONS` | used only inside `getCurrentPositionHighAccuracy` |
| `geolocation.ts:47` | `geolocationErrorKind` | used only inside `getCurrentPositionHighAccuracy` |
| `list-state.ts:26` | `ListStateKind` | used only as the `kind` input type |
| `location-input.ts:18` | `ESTONIA_PARSE_BOUNDS` | used only inside `inEstoniaBox` |

Spec-only exports (`PAGE_SIZE_MIN/MAX/STEP`, `CAPACITY_MIN/MAX`, `ParseLocationResult`, `ShelterTranslate`, `communityTrustLabel`, `OCCUPANCY_FIRM_KEY`, `OCCUPANCY_HEDGED_KEY`) were **kept exported** — their own frozen specs import them.

### 1.2 Flattened

- **`page-shell.ts`** — three injected services carried two names each (a private field + a `protected` template alias: `store`/`auth`, `themeStore`/`theme`, `i18nService`/`i18n`). One name per thing now: the fields are injected under the template's name (`protected readonly auth`, `protected readonly i18n`). The `themeStore`/`theme` pair was **pure dead code** — the high-contrast toggle it backed was replaced by the accessibility dialog, and the template never reads `theme`. Removed the dead `ThemeStore` injection entirely; construction timing is unchanged (the always-rendered `AccessibilityDialog` child still injects it, and the pre-paint script owns first paint — verified in `core/prepaint.ts`). Net −3 lines (176 → 173).
- **`pagination.html` / `pagination.ts`** — the last `*ngIf` in shared/ converted to `@if`, dropping the `NgIf` import (every other shared template already uses control flow). The pointless-control comparison lives in the component as `showChrome()` ("no chrome while the list fits one page"), so the template reads `@if (showChrome())` — the class-doc rule by name instead of as an inline expression.
- **`shelter-copy.ts`** — two orphaned doc blocks that described copy the module no longer renders (the private-home badge and the reported-inaccurate warning both moved to the catalog + `t` pipe) floated with no code between them. Merged into one constraint block above the only related helper (`isPrivateLocation`), keeping both live constraints (badge copy must say what it IS — the app carries no access data; the warning is muted, the row stays visible with trust state untouched). Net −6 lines (537 → 531).

### 1.3 Renamed

- **`location-input.ts`** — `HEMISHERE_ADMONST_PATTERN` (misspelled + unresolvable word) → `HEMISPHERE_LETTER_PATTERN`, with its existing doc. Internal constant, one use site.
- **`location-input.ts`** — `dmsTokens` carried a **misplaced doc comment** ("Extract the pair carried by one URL query param value …" — that belongs to `toDecimalPair`'s neighbour). `toDecimalPair` got the doc it lacked; `dmsTokens` got an accurate one.

### 1.4 Reworded comments to constraints (no planning ids, no history)

- **`paging.ts:13-15`** — deleted the history clause "(the previous lane re-implemented it in four shapes)"; the constraint (single-sourced policy, `PAGE_SIZES` shared with the control) stays.
- **`leaflet-service.ts:49-51`** — repaired a mangled doc line in `markerTone`'s contract comment (a stray `*` from a stripped link; the sentence now reads).
- **`leaflet-service.ts:321-323`** — dropped the planning id "N7 i18n-completeness" from `setAnchor`; the constraint (service is locale-agnostic, the label is the caller's localized copy) is stated instead.
- **`shelter-copy.ts:21`** — dropped "N7 i18n-completeness" from the module header, same replacement.
- **`shelter-copy.ts`** — fixed a broken sentence in `communityReportsText`'s doc ("…inaccurate, .) a separate line…" — a mangled parenthesis and dangling fragment) and a mid-sentence lowercase "this line" in `lastVerifiedText`'s doc.
- **`geolocation.ts:28-31`** — the options comment claimed the shape was "pinned by the page specs' toHaveBeenCalledWith assertions" as if the spec imported the constant; the real pin is the /submit page's **inlined** options literal (submit-shelter-page.spec.ts:999-1004). Reworded to state the actual cross-file sync constraint.

### 1.5 Line counts (before → after, `wc -l`)

| File | Before | After | Net |
|---|---:|---:|---:|
| `paging.ts` | 79 | 78 | −1 |
| `leaflet-service.ts` | 371 | 372 | +1 |
| `shelter-copy.ts` | 537 | 531 | −6 |
| `list-state.ts` | 49 | 49 | 0 |
| `list-state.html` / `.scss` | 17 / 29 | 17 / 29 | 0 |
| `admin-copy.ts` | 76 | 76 | 0 |
| `admin-tab.ts` | 54 | 54 | 0 |
| `banner.component.ts` | 20 | 20 | 0 |
| `confirm-action.ts` | 78 | 78 | 0 |
| `error-copy.ts` | 209 | 209 | 0 |
| `geolocation.ts` | 94 | 96 | +2 |
| `location-input.ts` | 408 | 409 | +1 |
| `page-shell.ts` | 176 | 173 | −3 |
| `pagination.ts` | 69 | 74 | +5 |
| `pagination.html` | 40 | 42 | +2 |

Line-classification of the full diff (`git diff -U0`, non-comment lines only): the three pinned files (`paging.ts`, `leaflet-service.ts`, `shelter-copy.ts`) have **zero changed code lines** — every hunk is a comment line. The only non-comment changes anywhere are the eight export modifiers, the one identifier rename (2 lines), the page-shell DI fold, the pagination `*ngIf`→`@if` + the `showChrome()` method, and the template line that calls it.

## 2. Pinned behaviours — evidence they still hold

All three pins are spec-pinned; **no spec file was touched** (`git diff --stat -- 'frontend/src/app/shared/*.spec.ts'` → empty).

| Pin | Pinned by | Lane's diff to the code | Evidence |
|---|---|---|---|
| Paging clamp vocabulary (single source for clamp + size steps) | `paging.spec.ts` — `PAGE_SIZES` exactly 10..100 step 10; `parsePage`/`parseSize`/`lastPage`/`clampPage`/`parseTotal` matrices (12 tests) | comment line only (header history clause) | post-gate run: all `paging.spec.ts` tests pass unmodified (inside 1562/1562) |
| Marker tone mapping (pins carry depth by shape and colour) | `leaflet-service.spec.ts:694-736` (`markerTone` — every depth resolves its tone, reported ORs over it, registry stays registry) + the `renderShelters` shape/colour tests :113-417 | two comment hunks only (mangled line, planning id) | post-gate run: all `leaflet-service.spec.ts` tests pass unmodified |
| `shelter-copy.ts` badge logic | `shelter-copy.spec.ts` — pinned copy for `sourceTrustLabel`/`communityBadgeClass`, the reported OR (`hasReports`), the chip-vs-badge cross-pin suite, occupancy/recency/last-verified matrices | comment-only hunks (header id, two orphan blocks, broken sentence) | post-gate run: all `shelter-copy.spec.ts` tests pass unmodified |

## 3. Signature changes

**None made, none filed.** No public function/class signature changed. The eight un-exports tighten visibility of symbols with zero importers (proven by the full-tree census; `tsc --noEmit` exit 0 confirms nothing resolves them). No feature directory needed a change, so no NOTES request was owed on this axis.

## 4. Anchor shifts (run rule 6 — for the single docs-lane anchor pass)

`docs/agent/00-CURRENT-STATE.md` cites exact line ranges in three files I edited. Old → new, re-derived against the new tree (old positions taken from `git show HEAD`):

| Citation (doc line) | Old | New | Status |
|---|---|---|---|
| `paging.ts:1-13` (L191) | 1-13 | 1-13 | unchanged (my edit starts at old L14) |
| `paging.ts:20,24,27,31` (L191 constants) | 20,24,27,31 | **19,23,26,30** | shifted −1 |
| `paging.ts:42-57` (L192 parsePage/parseSize) | 42-57 | **41-56** | shifted −1 |
| `paging.ts:61-63` (L193 lastPage) | 61-63 | **60-62** | shifted −1 |
| `paging.ts:68-70` (L193 clampPage) | 68-70 | **67-69** | shifted −1 |
| `paging.ts:71-79` (L203 parseTotal) | 71-79 | **70-78** | shifted −1 |
| `leaflet-service.ts:69-91,78-79,80-89,90,86-88,285` (L44,58-60,87-88,104,147) | as cited | as cited | unchanged (markerTone doc edit was line-preserving at L50-51; the +1-line edit landed at old L321, after all of these) |
| `leaflet-service.ts:317,337` (L87-88 anchor diamond) | 317,337 | **317,338** | second ref shifted +1 |
| `shelter-copy.ts:93-101` (L62 verificationTone) | 93-101 | 93-101 | unchanged (verified byte-identical at both positions) |
| `list-state.ts:16-20` (L179) | 16-20 | 16-20 | unchanged (edit at L26, 1:1 line) |

The old `paging.ts` ranges still carry content, so `DocumentationFactsTest` stays green on them — precision drift only, same class as the ANCHOR-PASS entries.

## 5. Web Interface Guidelines audit

Fetched the current rule set from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` (2026-09-24) and audited every shared template + stylesheet + the keyboard/focus code:

- **pass** — `pagination.html` (real buttons + native select, both buttons `aria-label`ed, nav labelled, `role=status` on the page line; the select carries explicit `color` + `background` for Windows dark mode — pagination.scss:26-27); `list-state.html` (role=status, honest states, no bare empty list); `report-gauge.html` (SVG `aria-hidden` + `focusable=false`, meaning in the visible caption + end labels — never colour-only or gesture-only); `banner.component.html` (`alert` vs `status` by severity); `loading-indicator.html` (`role=status`, "Loading…"); `page-shell.html` (skip link, labelled burger with `aria-expanded`/`aria-controls`, route-change focus landing on `#main`, focus never pulled from behind an open modal); `accessibility-dialog` (real radio group in a fieldset/legend, label+control one hit target, focus trap, Escape, focus return to trigger); `consent-banner` (single explicit dismissal, trapped focus, labelled dialog).
- **pass (documented exceptions)** — the two `outline: none` sites are intentional programmatic-focus cases with the rationale in the SCSS (page-shell.scss:137-150 `#main` route-change target; consent-banner.component.scss:38-43 dialog container — the screen reader announces the dialog name instead of a ring on the box). The burger morph animates only `transform`/`opacity` and is disabled under `prefers-reduced-motion` (page-shell.scss:446-448).
- No `transition: all`, no unlabelled controls, no icon-only buttons, no missing `aria-live` on async states, no gesture-only actions found in the directory.

## 6. Gate

Run detached (`nohup …; echo $? > exit-file`), logs kept:

| Gate | Baseline (pristine tree) | Final (all edits) |
|---|---|---|
| `cd frontend && npx ng test --watch=false` | exit **0** — 1562/1562 tests, 65 files (log: /tmp/shared-gate-base-test.log) | exit **0** — 1562/1562 tests, 65 files (log: /tmp/shared-gate-final-test.log) |
| `cd frontend && npx ng build` | exit **0** (/tmp/shared-gate-base-build.log) | exit **0** (/tmp/shared-gate-final-build.log) |

Baseline validity: the pristine bundle was generated 07:55:32; my first file edit landed 07:56:52 (mtime-verified) — the baseline is the untouched tree. The final gate ran after the last edit (last file mtime 08:10:41; final bundle 08:22:50). Test count is identical to the run's baseline (1562/65) — nothing deleted or weakened. `npx tsc --noEmit -p tsconfig.app.json` exit 0 on the final tree. (An intermediate full gate on the pre-`showChrome` state was also green: 1562/1562 + build 0, /tmp/shared-gate-post-*.log.)

**Foreign concurrent work (named, per the gate rule):** the worktree carried in-flight edits from another lane in five backend files (`src/main/java/ee/sheltermap/{api/ShelterController,app/ShelterService}.java` + three test files — the owner-edit `OwnerEdit` seam, matching SIMPLIFY-MODERATION's filed-not-fixed note). They are outside my scope and cannot affect the frontend gate (`ng test`/`ng build` read only `frontend/`); no frontend file in the diff is mine-but-theirs or theirs-but-mine — all 13 frontend modifications are this lane's.

## 7. Deliberately left (and why)

- **Focus-trap duplication** between `accessibility-dialog.component.ts:137-163` and `consent-banner.component.ts:36-57` (~20 near-identical lines, with deliberate differences: the dialog's selector includes `input` and filters `disabled`; the consent one does not). Unifying would change the consent trap's effective selector — a behaviour change to a spec-pinned mechanism; the run's "keep the verified mechanisms alone" wins.
- **`COPY` in `error-copy.ts`** is production-referenced only by its own spec — but that is the pin's design: the spec matrix reads the constants as its expected values, so copy and matrix cannot drift. Removing it would require rewriting the frozen spec's expectations.
- **`ResendCountdown`/`gaugeAngle`/`confirm-action`** — small, flat, one-thing-per-function already; nothing to simplify without gold-plating.
- **`admin-copy.ts`** — already the single-sourced label maps; the "historical rows" word is accurate domain vocabulary (rows from before the deprecation), not a history-tone comment.
- **Spec titles carrying "N6"/"N7" id tokens** (`error-copy.spec.ts:221`, `shelter-copy.spec.ts:276,481,488`) — frozen specs, and the backend guard's pattern set does not match a bare `N\d+` (only `\bN\d+ finding\b` / `reviewer [NF]\d+`). Filed as an observation below, not edited.
- **`shelter-marker--partner`** asserted absent (count 0) at `leaflet-service.spec.ts:128` — a legacy tone the spec pins as never rendered. The assertion is the guard; left standing.

## 8. Findings for other lanes (mirrored in CODE-REVIEW-NOTES.md)

1. `frontend/src/app/features/shelter/submit-shelter-page.ts:559` (FE-SUBMIT-SHELTER) — inlines the geolocation options literal instead of reusing `shared/geolocation.ts`; its spec pins the literal. If single-sourcing is wanted, the shared constant would need re-exporting (this lane un-exported it as dead). Option, not a demand.
2. The bare `N\d+` planning-id shape in spec titles (above) — guard-census gap candidate for the guard lane, or a spec-title rewording the parent can assign.

## 9. Unverified / caveats

Nothing in scope is unverified for behaviour: every changed file is covered by the green gate, and the three pinned suites passed unmodified. One tooling caveat worth the parent's awareness: pi-lens's inline write-check parses `pagination.html` with a generic HTML validator that does not know Angular control flow — it flags `@if (pages() > 1)` ("special characters must be escaped: `[` `>`") while the same `@if` syntax in the four other shared templates passes silently. The authoritative checks (the Angular compiler in `ng build`, exit 0, and the 8 runtime `pagination.spec.ts` tests) confirm the template; as a clean resolution the comparison moved into the component's `showChrome()` method, which the checker accepts and which reads as the class-doc rule by name.
