# DESIGN-SAFE — the three safe token/comment fixes, verified against the current tree

Lane: DESIGN-SAFE (branch `feature/frontend`, no commits — parent commits).
Read first: `reviews/code-review/design-review.md` §3/§4 + the
"reported-not-owned" paragraph, `frontend/src/app/design-tokens.spec.ts` (incl.
the contrast guards), `docs/autopilot/CODE-REVIEW-RUN.md`. Skills:
`web-design-guidelines`, `accessibility`, `angular-developer`, `clean-code`.

Two of the four items landed as edits; two verified as already resolved on the
current tree (the design review pre-dates the commits that fixed them). Nothing
touched that §3 says the pages do well.

## 1. `.anchor-line__clear` touch target — FIXED at the 24px floor

`frontend/src/app/features/map/map-page.scss` (rule now at :387-405).

**Measurement before:** `font-size: var(--text-2xs)` (0.75rem = 12px) + the
body `line-height: 1.5` (`styles.scss:450`) + `padding: 0 var(--space-4)` (no
vertical padding) + 1px top/bottom border, global
`* { box-sizing: border-box }` (`styles.scss:436-438`) → rendered target
**12 × 1.5 + 2 = 20px** (the review's ~19px, same figure). Below WCAG 2.5.8's
24px (AA) floor and below the app's 48px `.btn` rule.

**Decision and justification (24px, not the text-link exception):** the
WCAG 2.5.8 "link in text" exception is arguable *against* us here, on two
grounds: (a) the element is a `<button>` (map-page.html:248), not a link — the
exception is scoped to links in running text; (b) the control carries a fill
background and a 1px border — a distinguishing visual characteristic other
than colour — so it is not an unadorned inline link the exception describes.
The 24px floor therefore applies. I did **not** apply the app's 48px rule: it
is the standalone-control rule, and a 48px pill inside a 13.6px status line
would read as a button, not a sentence — which is why the review flagged the
look. The comment in the rule records that trade-off.

**The fix (3 declarations, all existing tokens/idiom):**
```scss
display: inline-flex;
align-items: center;
min-height: var(--space-24);
```
the app's `.btn` idiom (`styles.scss:641-649`: inline-flex both-axis centring +
min-height) at the pre-existing `--space-24` token (`styles.scss:239`).
`justify-content: center` deliberately omitted — the pill is
shrink-to-fit width, so it would be a no-op (clean-code: no dead
declarations).

**Measurement after:** `min-height: var(--space-24)` border-box → rendered
target **exactly 24px**, theme-invariant (geometry does not change per theme).
WCAG 2.5.8 ✓. File 690 → 696 lines.

**Theme check (the change alters no colour — every pair below is recomputed
from the token literals and was already enforced by the contrast guards in the
green gate):**

| pair (the pill's actual surfaces) | light | high-contrast | black-and-yellow |
|---|---|---|---|
| text `--color-text` on pill fill `--color-bg-surface` (4.5:1 floor) | 15.97:1 | 18.42:1 | 14.67:1 |
| border `--color-border` vs `--color-bg-surface` (3:1 UI floor) | 1.34:1 | 3.21:1 | 4.58:1 |
| border `--color-border` vs `--color-bg` (3:1 UI floor) | 1.23:1 | 3.45:1 | 4.58:1 |

The light-theme border pairs are the documented sub-threshold exemption
family (`CONTRAST_EXEMPTIONS` in design-tokens.spec.ts: borders are not text;
the control is identified by its fill + its 15.97:1 label). Both dark themes
clear 3:1.

**Sentence check:** the rendered line is
`Searched address: <label> [Clear]` (`map.searched`/`map.clear`, en.ts:200-201).
`inline-flex` keeps the pill in the inline flow; the line box grows from
20.4px (the 13.6px text line at 1.5) to 24px (the pill) — ~4px, one line
taller at most, and the pill stays a trailing affordance inside the sentence,
not a standalone control. The `.anchor-line` sits in normal flow in the
sidebar list (no fixed-height ancestor). The map-page spec pins only DOM
presence + click behaviour of `.anchor-line__clear` (map-page.spec.ts:1199,
:1272) — both untouched and green in the gate.

## 2. `.panel-title` weight — FIXED with the app token

`frontend/src/app/features/account/account-page.scss:26-30`.

**Before:** no `font-weight` declaration → UA `<h2>` bold = **700**.
**After:** `font-weight: var(--font-weight-title)` = **650** — the exact
`.section-title` idiom used by every other section title
(`shelter-detail-page.scss:178-182`: `font-size: var(--text-xl);
font-weight: var(--font-weight-title);`). One declaration, pre-existing token
(`styles.scss:214`), file 151 → 152 lines.

**Contrast:** unchanged by construction — weight carries no colour, and the
WCAG contrast math is colour-only. All eight `.panel-title` usages are `<h2>`s
on the `--color-bg-surface` panel fill inheriting `--color-text`:
**15.97:1 / 18.42:1 / 14.67:1** across the three themes (≥ 4.5:1, already in
the enforced `TEXT_PAIRS`).

**Layout:** block-level titles in flowing panels (no fixed-height
container); 650 renders the same or narrower glyph widths than 700, so it
cannot add a wrapped line. No spec pins `.panel-title` (grep over
`*.spec.ts`: 0 hits); the design-token guard's `font-weight:\s*\d` literal
ban now passes via the token — included in the green 1590 run. The weight
token is declared once in `:root` (theme-invariant), so the value is the
same in Default, High contrast and Black-and-yellow.

## 3. The `styles.scss` comment contradiction — ALREADY RESOLVED, no edit

**Line count: 931 before → 931 after** (no edit made; verified with `wc -l`
afterwards — no anchor can shift).

The review quoted `:873-875` as "Shape + hue carry the depth — never colour
alone (WCAG 1.4.1)". Evidence chain on the current tree:

1. That wording was introduced with the partial/full split (`8c3caef`) and was
   made inaccurate by the triangle removal `2022d6c` (2026-09-25) — verified:
   at `2022d6c`, `styles.scss:874` reads "carry the depth — never colour alone
   (WCAG 1.4.1; the anchor diamond below uses the same rationale)".
2. **`017d4d5` (2026-09-27) already reworded the comment in-tree** (an
   ancestor of both `feature/frontend` and `code-review`): the comment now
   reads "Hue carries the depth — the legend's labels and the row badge say it
   in words, so the pin is never colour-alone (WCAG 1.4.1)"
   (`styles.scss:873-875`).
3. The design review's skill fetches are dated 2026-09-26 — i.e. the review
   ran before `017d4d5` and `bf119ac` landed — so its "reported-not-owned"
   entry described a tree state that no longer exists.

The current wording was re-verified against the code and the decision record:
"Hue carries the depth" ✓ (partial = community yellow circle, full = verified
green circle — `styles.scss:879-886`), "the legend's labels and the row badge
say it in words" ✓, "never colour-alone (WCAG 1.4.1)" ✓ (the depth
information is word-redundant), "every shape carries the SAME 2px edge token"
✓ (the `.shelter-marker` base rule). It agrees with the decision record at
`styles.scss:842-845` ("every remaining pair that shares a shape shares a hue
too … never shape alone"). No reword is owed; `git diff` shows zero
`styles.scss` changes in this lane.

## 4. The English `how.sources` triangle claim — VERIFIED REMOVED; ET + RU still carry it

**Verdict: the earlier lane was right; the design review's item 1 is stale.**
On the current tree, `core/i18n/en.ts:84-85` reads:

> "…Community locations are added by users: a partially verified submitter
> shows a yellow circle, and a fully verified submitter a green circle. A
> location with an open report shows a red marker…"

No triangle. `grep -c triangle` over `en.ts` **and** `messages.ts` = **0**
(hits also checked on the `code-review` branch: 0 there too). The removal
landed in `bf119ac` (2026-09-28, "correct the false copy"), an ancestor of
both branches — after the design review's 2026-09-26 run. The English matches
the current model (no-depth plain circle / yellow circle one channel / green
circle two or more) and needs no correction. **No catalog file was touched —
zero i18n changes in this lane.**

**Languages that still carry the triangle description** (both are
`// MACHINE DRAFT — awaiting native review` values — the owner's native-
review packet, deliberately untouched per the brief):

| language | file:line | the triangle clause |
|---|---|---|
| Estonian | `et.ts:94` | "kinnitamata kasutajal on kollane kolmnurk" (an unverified user has a yellow triangle) |
| Russian | `ru.ts:99` | "у неподтверждённого пользователя — жёлтый треугольник" |

These two are the only remaining triangle mentions in the catalogs (one per
file, both the `how.sources` value).

## GATE (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0 — 1590/1590 passed,
  66 files** (baseline exact; the design-token, spacing-literal, contrast and
  i18n suites all green over the two scss edits). Log:
  `/tmp/design-safe-test.log`, exit: `/tmp/design-safe-test.exit`.
- `npx ng build` → **exit 0**. Log: `/tmp/design-safe-build.log`, exit:
  `/tmp/design-safe-build.exit`. (Pre-existing SCSS budget warnings only,
  none introduced by this diff — see the unverified section.)
- `DocumentationFactsTest` not re-run (backend suite, not owed by an
  FE-only diff) — and no doc anchor can have shifted: no file cited by
  `docs/agent/*.md` is in this diff (grep-verified: the only line citations
  of the two edited scss files are in the unguarded
  `docs/autopilot/findings/frontend-inventory.md` and the notes board).

## Bundle delta

Immaterial, measured on the same tree (build at HEAD vs build with the diff —
both exit 0):

| | HEAD (no diff) | with the diff | delta |
|---|---|---|---|
| `dist/` total | 1,507,000 B | 1,507,111 B | **+111 B** |
| `map-page.scss` budget line | 7.70 kB (3.70 over) | 7.77 kB (3.77 over) | +70 B (the clear-button block) |
| `account-page` lazy chunk | 38.77 kB | 38.81 kB | +40 B (the weight declaration) |
| Initial total | 607.66 kB / 156.72 kB | 607.73 kB / 156.78 kB | +0.07 kB |

No new import, chunk or route; no new budget warning — `map-page.scss` was
already over its 4 kB anyComponentStyle budget before this lane (7.70 kB, the
design-review lane's recorded value), the rest of the warning set is
pre-existing in other lanes' files.

## Unverified / caveats

- **Real-browser visual check not performed** (no running app in this lane —
  the repo's established pattern is mechanism + token-math verification,
  which is what the theme table above is). The 24px pill's rendered look and
  the 650-weight rendering are asserted from the token values, the LSP-clean
  compiled CSS and the green gate, not from pixels.
- **`docs/autopilot/findings/frontend-inventory.md:239`** cites
  `map-page.scss:576` for the breakpoint — stale **before** this lane (line
  576 is `.shelter-row__badges {`; the `@media` block was at :646 and moved
  to :652 with my +6 lines). Not guarded by `DocumentationFactsTest` (which
  guards `README.md`, `frontend/README.md`, `docs/agent/*.md`); filed in the
  notes board for the anchor pass.
- The 20px→24px figure is computed from the token literals
  (0.75rem × 1.5 + 2px border) — a pixel measurement in a live browser was
  not taken (same caveat as above).
- `--font-weight-title: 650` maps to the nearest available face in the
  system font stack (same as every other section title already shipped at
  650) — no new font risk relative to the rest of the app.

## Files for the parent's commit

- `frontend/src/app/features/map/map-page.scss` (+6: the clear-button target
  fix + its constraint comment)
- `frontend/src/app/features/account/account-page.scss` (+1: the title-weight
  token)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (one board line: the stale
  inventory citation)
- this report.

No other file changed: `git diff --stat` = 2 files, 7 insertions(+), 0
deletions(-) plus the report and the board line.
