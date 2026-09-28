# UX-IMPLEMENT — implementation of the NEXT-UX-PROPOSAL (recommended set, owner-carved)

Lane: UX-IMPLEMENT (branch `polish`, no commits — the parent commits).
Inputs: `reviews/code-review/next-ux-proposal.md` (the proposal), `reviews/code-review/design-review.md`
(the compliance audit — not re-done), `docs/agent/00-CURRENT-STATE.md` (the design-token contract),
`docs/autopilot/CODE-REVIEW-RUN.md` (the run rules).

Selection rule applied: the recommended three, plus items that are clearly an improvement, safely
reversible in one commit, and need no new colour, no new token, and no taste judgement the owner has
not made. Anything needing the owner's eye — a new palette value, a reordered page, a removed feature,
new copy — is reported below with the exact question, not implemented.

---

## 1. What the proposal recommended (§4 "If only three things get done")

1. **P1 — the crisis answer on /map** (F1): render the around-you success line as a legible,
   actionable result card; give it a "View details" next step; mark the first row of the
   distance-sorted list with a "Nearest" badge.
2. **P2 (parts a+b) — the shelter detail page** (F2): promote the navigate actions (Google Maps /
   Apple Maps / Distance from you) from unpadded text links to buttons; move the "Info" section
   (last-reported status + capacity) above the contribution flow.
3. **P3a — the pinned badge on the guidance index cards** (F3).
4. **Honourable mention: P5** — the unconfirmed-queue count on the admin tab.

## 2. What I implemented

### P1.1 + P1.2 — the crisis answer is a legible, actionable state (map)

- `frontend/src/app/features/map/map-page.html:216-245` — the success line is now a
  `.nearest-card`: the `<p role="status">` (the spec-pinned role, `map-page.spec.ts:979`) keeps its
  text with the shelter name in a `nearest-line__name` span, and a `btn btn--ghost btn--block`
  "View details" button sits below it. The button label reuses the existing key `map.viewDetails`
  (`en.ts:210`) and its `aria-label` reuses `map.viewDetailsFor` (the row link's own pattern,
  `map-page.html:389`). It calls the existing public `selectShelter(n)` (`map-page.ts:349`) —
  select + fly, the row grows its own "View details →" link, and the line's own supersede rule
  clears the card on the tap. The button never leaves /map itself: the row's link stays the only
  navigation (the spec's "details is a separate step" contract, `map-page.spec.ts:577-620`).
  No new copy, no new keys, no new tokens.
- `frontend/src/app/features/map/map-page.scss:412-421` — `.nearest-card`: the row's own surface
  vocabulary (1px `--color-border`, `--radius-lg`, `--color-bg-surface`), column layout on the
  action-row gap (`--space-8`) with `--space-12` padding.
- `frontend/src/app/features/map/map-page.scss:446-452` — the success line modifier:
  `--text-base` with the name at `--font-weight-semibold` — the exact pair the list row names use.

**Visual reasoning:** after the page's only crisis CTA, the answer was typeset at 13.6px/400 — the
same voice as the geolocation consent note — smaller than the 14.4px filter chips, and offered no
next step. The proposal's F1 measurement holds: the answer to the crisis question was quieter than
the chrome around it. Now the answer reads as a result card (the row's own card language, so it is
visually "of the list"), the name sits at the row-name step, and the next step is a full 48px
control. The empty, error and warning variants are untouched (they keep the plain one-line voice —
a note, not a result).

### P2a — the detail page: navigate = buttons (part a of the recommended P2)

- `frontend/src/app/features/shelter/shelter-detail-page.html:89,97,111` — the two deep links and
  the "Distance from you" button take the global `btn btn--ghost`. `href`/`target`/`rel`/
  `aria-label` and the pending/CTA label swap are unchanged; the `shelter-detail__distance` class
  stays (the spec queries it, `shelter-detail-page.spec.ts:694-708`).
- `frontend/src/app/features/shelter/shelter-detail-page.scss:82-93` — the navigate row is now an
  action row (`--space-8` gap + wrap, the page's picker-row idiom: `band-picker`, `report-actions`);
  the link-style rules (13.6px, no padding, underline-on-hover, the `padding: 0` resets) are
  deleted — the `.btn` base supplies the 48px target, hover, focus and disabled states.

**Visual reasoning:** leaving the app into the phone's navigation is the *successful completion*
of the journey, not a demotion of it — and it was the one crisis-critical control under the 24px
WCAG 2.5.8 floor (≈20.4px at 13.6px/1.5) and ≈57% of the app's own 48px control rule
(spec-pinned on `.btn`). Ghost, not primary: the page already spends its primary on the verify-gate
links — one primary per view is the discipline the CTA-orange token enforces on the map. This is
the only implemented change that also closes a measured miss (~20.4px → 48px).

### P6a — the selected row takes the legend's own selected idiom (beyond the three; the "plus" clause)

- `frontend/src/app/features/map/map-page.scss:526-536` — `&.shelter-row--selected` gains
  `background: var(--color-bg-subtle)` beside the existing `--color-primary` border.

**Visual reasoning:** the selected treatment was a 1px border-colour change on a white card — the
quietest selection the page carried — while the legend on the same page already renders its selected
entry as border **plus** the muted fill (`.legend-item--selected`, `map-page.scss:141-144`). The row
now uses the idiom the app already owns; no new value, no new token. P6b (where the details
affordance lives — the materialisation question) is **not** implemented: the proposal explicitly
leaves the variant to the owner, and it touches the spec's selectivity pins (`map-page.spec.ts:585,
615, 645`).

## 3. What I deliberately did not implement — the exact questions for the owner

These parts of the recommended set (and the named extras) stop at an owner decision:

1. **P1.3 — the "Nearest" badge on the first distance-sorted row (part of the recommended P1).**
   Needs a new i18n key × 3 locales — new user-visible copy, which my brief forbids me to author
   (and RU/ET are MACHINE DRAFT territory by the current-state doc's unsettled section).
   **Question:** approve a new key, proposed `map.nearest.badge` — EN **"Nearest"** (final);
   ET and RU need native review (machine-draft candidates, flagged: ET "Lähim", RU "Ближайший")?
   Or drop the badge and let the result card + the silent distance sort carry it?
2. **P2b — move the "Info" section above the contribution flow (part of the recommended P2).**
   A reordered page needs the owner's eye. **Question:** move the Info section (last-reported
   status + capacity, timestamps and empty states intact) from the bottom of the detail page to
   directly below the header block, above "Location"? Template-only, no new keys; the visitor meets
   the two answers before the map, the contributor's three report sections move down unchanged.
3. **P3a — the pinned badge on the guidance cards (recommended #3).** Two blockers, both owner's:
   (a) it needs a new 3-locale key — **Question:** a new public key, proposed `guidance.pinned`
   (EN **"Pinned"**, ET/RU native review) — or reuse the admin values of
   `admin.guidance.col.pinned` (EN "Pinned" / ET "Kinnitatud" / RU "Закреплён") on the public
   surface? (b) `guidance-list-page.spec.ts:457-464` pins the card's direct children to exactly
   `['guidance-post__hero', 'guidance-post__title', 'guidance-post__date']` — a badge as a card
   child changes that pinned assertion (re-pin it), or the badge sits inside the title (which
   changes the heading's accessible name). Which placement, and which key?
4. **P5 — the unconfirmed count on the tab (the named honourable mention).** Conflicts with a
   byte-pinned spec: `admin-page.spec.ts:1152-1153` asserts the active tab's text is exactly
   `'Unconfirmed'`. **Question:** re-pin that assertion to tolerate a count (e.g.
   `toMatch(/^Unconfirmed/)`) and render `unconfirmedRows().length` on the Unconfirmed tab (free
   client-side data, no copy), or keep the tab text exact?
5. **P4 — the fallback address search in the crisis corridor.** Two competing options (disclosure-on-
   failure vs reordering below the chips); choosing between them is the owner's call. Not implemented.
6. **P2c — collapse the three report gate prompts for non-contributors.** Part (c) of P2, which the
   proposal itself queued ("part (c) can follow"); an M-cost view-model branch plus a
   consolidation call. Not implemented.
7. **P3b — the guidance card excerpt.** L-cost: backend summary field + admin editor field + 3-locale
   content for existing posts. Explicitly the one backend-scoping decision the owner should make.
8. **P7 — reorder the /submit location fieldset ("Use my location" first).** A reordered page →
   owner's eye. Not implemented.
9. **P8 — demote the header "Create account" to ghost.** The proposal's own words: "an explicit
   owner call" (the registration-conversion counter-case is real). Not implemented.
10. **Not a proposal item, reported for completeness:** the design-review's standing finding
    §4.2 — `.anchor-line__clear` at ≈19px (`map-page.scss`, the Clear pill in the anchor line)
    under the 24px floor, with its prescribed 2-line fix (`min-height: var(--space-24)` +
    `display: inline-flex` centering). The compliance lane classified it as "fix if wanted" —
    owner's call; not compliance work for this lane to re-do.

## 4. Evidence: the three contrast themes and the token guard stayed green

- **The token guard is green in every run.** `design-tokens.spec.ts` is part of the 1582 passing
  tests in both the baseline and final full runs. It re-runs the contrast math on all three theme
  homes (the `:root` block, the `[data-theme='high-contrast']` block, `BLACK_AND_YELLOW_TOKENS`),
  the theme name-set parity rule, and the spacing-literal guard.
- **No new value of any kind.** The diff of my four files contains zero hex/px/rem literals —
  every declaration is a `var(--token)` reference (verified by grep). No token added, renamed or
  re-valued; no theme home touched.
- **No new text/fill pair was introduced — only pairs the app already enforces elsewhere:**
  - Result card + success line: `--color-text` and `--color-muted` on `--color-bg-surface` — the
    shelter row's own pair, enforced for the rows in all three themes (light 15.97:1 / 6.11:1;
    high-contrast 18.4:1 / 10.6:1; black-and-yellow 14.67:1 / 10.47:1 — the token comments'
    measured ratios). Card edge `--color-border` is the theme's card-boundary token (in
    black-and-yellow #8a7400 at 4.58:1 on #000, the theme's stated card-edge pair).
  - Selected-row fill `--color-bg-subtle`: light #eaf0f4 (text ≥ 14.74:1, muted 5.31:1 — both
    documented on the token), high-contrast #1f1f1f (text 16.5:1 per the HC block's measured
    table), black-and-yellow #000 = page background (text 14.67:1) — where the fill is invisible
    the `--color-primary` border carries the cue, **exactly as the already-shipped
    `.legend-item--selected` behaves in the same themes**. Nothing that reads in Default is
    unreadable elsewhere: the pairs are the row's own in every theme.
  - Ghost buttons (both placements): the enabled-state ghost pairs are spec-enforced in all three
    themes (the "token trio" note on `.anchor-search__button`, `map-page.scss`); black-and-yellow
    hover fill #2b2400 carries the yellow label at 10.8:1 per the theme map's comment.
- **The contrast themes were reasoned per-theme above because jsdom renders none of them** — the
  guard's arithmetic plus the "only enforced pairs" property is the evidence the run's discipline
  provides (the same standard the design-review lane recorded for its own fixes).

## 5. Gate (detached, exit files)

- `cd frontend && npx ng test --watch=false`:
  - **Baseline (before my edits, start of session): exit 1 — 1 failed / 1582 passed (1583 total,
    65 files).** The single failure is PRE-EXISTING and not mine: see §6 (the owner's prettier pass
    on `admin-page.ts` broke the zero-slack line ceiling).
  - **Final (after my edits): exit 1 — 1 failed / 1582 passed (1583 total, 65 files)** — the SAME
    single pre-existing failure, zero failures attributable to my files. **Test count unchanged:
    1583 (baseline exact); no test deleted, added or re-pinned.**
  - Logs: `/tmp/ux-baseline-test.log` (exit `/tmp/ux-baseline-test.exit`),
    `/tmp/ux-final-test.log` (exit `/tmp/ux-final-test.exit`).
- `npx ng build`: **exit 0** (`/tmp/ux-gate-build.log`, exit `/tmp/ux-gate-build.exit`). Warnings
  only, all the standing SCSS 4 kB component budget class (map-page.scss 8.10 kB — it was already
  over budget before this lane; the design-review recorded the same warning set).
- **Bundle-size delta (A/B, same tree ± my four files):** dist total 1,505,122 → 1,505,360 bytes
  = **+238 bytes (+0.02%)** — not material.

## 6. Stop-and-report: a pinned contract is red in the tree, not because of this lane

`architecture.spec.ts` "admin-page.ts stays at or under its measured line ceiling" is red:
**admin-page.ts is 903 lines, the ceiling is 901.** Cause: a pre-existing working-tree change
(`admin-page.ts`, mtime 18:49 — before this session; I did not make it) that re-wraps the
`patchUser` one-liner (`admin-page.ts:773-776`) across three lines — a prettier pass. The committed
901-line version is prettier-DIRTY at the repo's printWidth 100 (verified with `prettier --check`
on both versions), so the re-wrap is the canonical form and reverting it is not the fix. The
ceiling 901 was set at zero slack by SPLIT-ADMIN-PAGE (its own board line), and the guard's own
message names the remedy: "raise the ceiling deliberately in this same commit with the reason".
**For the parent:** the commit that carries the `admin-page.ts` re-wrap must also raise
`ADMIN_PAGE_MAX_LINES` 901 → 903 in `architecture.spec.ts` with the reason (owner prettier pass),
or re-format the line to fit — owner's call. Filed one line in `docs/autopilot/CODE-REVIEW-NOTES.md`.

Also in the tree, not mine, untouched: the FRONT-NAMES owner-authorised comment rewording in
`admin-page.spec.ts` + `guidance-editor.spec.ts` (applied by the parent at 20:25:08 during this
session), and the parent's in-flight FE comment-extractor guard files
(`fe-guard-fixtures/`, `FrontendCommentExtractor*`, `SourceVocabularyTest.java`,
`PiiCryptoFramingTest.java`).

## 7. Unverified

- **Rendered pixels in a browser, in any theme.** jsdom renders none of the three themes; the
  evidence is the spec-enforced token math + the "only enforced pairs" property (§4). The layout of
  the result card at 344px sidebar width (line wrapping at 15.2px, button below) is reasoned, not
  looked at — the design-review lane recorded the same constraint.
- **The card's tap payoff on a scrolled list.** Tapping "View details" selects the top
  distance-sorted row; if the list had been scrolled far down, the materialised row link could sit
  off-view (`selectShelter` does not scroll — same as any row tap; `scrollRowIntoView` runs only on
  the marker-click/search-selection paths). Existing behaviour, not introduced by this lane — noted
  as a candidate follow-up for the owner.
- **RU/ET string lengths inside the new card** — no new copy exists, but the rendered card with the
  longer locales' existing strings was not visually checked (the line wraps; the card is
  content-height, no fixed box).

## 8. Files for the parent's commit (this lane)

- `frontend/src/app/features/map/map-page.html`
- `frontend/src/app/features/map/map-page.scss`
- `frontend/src/app/features/shelter/shelter-detail-page.html`
- `frontend/src/app/features/shelter/shelter-detail-page.scss`
- `reviews/polish/ux-implement.md` (this report)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (one appended line, §6)
