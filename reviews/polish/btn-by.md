# BTN-BY — outlined `.btn--primary` in black-and-yellow (owner request)

**Branch:** `feature/frontend` · **No commits made** (parent commits).
**Contract:** "i want to change button in black yellow mode, it should have black background
and yellow border and text, also on hover background should be darker than font, otherwise
text will not be readable."

## 1. What the tree looked like (working-tree check first, per brief)

- `git status` clean on `feature/frontend` (== `origin/feature/frontend`); `main` is 3 merge
  commits ahead with **zero file diff** to `feature/frontend`. **The owner's believed
  pre-edits are not present** — there was nothing uncommitted to build on or revert.
- What IS committed is the state the request targets: B&Y `.btn--primary` is today the
  inverted **FILL** — yellow (`--color-text`) background, black label, light
  `--color-primary-hover` fill on hover. That rule pair (old location
  `accessibility-dialog.component.scss:163,167`) is what this lane replaces.

## 2. Where the B&Y theme lives (correcting the pointer)

The parent's pointer said the `[data-theme='black-and-yellow']` block is in `styles.scss`.
It is not — `styles.scss` contains only the **high-contrast** token block (`styles.scss:279`)
plus a shared `color-scheme: dark` rule for both dark themes (`styles.scss:928-931`).
B&Y is applied as **runtime CSS custom properties on `<html>`**:

- values: `frontend/src/app/core/theme-tokens.ts` — `BLACK_AND_YELLOW_TOKENS` (lines 50-150)
- appliers: `ThemeStore` (post-paint) + `index.html` pre-paint script (kept in lockstep)
- **page-wide B&Y SCSS rules (ViewEncapsulation.None): the theme host
  `frontend/src/app/shared/accessibility-dialog.component.scss`** — this is where the
  existing B&Y `.btn--primary` override lived and where the new one lives.

`grep -rln 'data-theme' frontend/src --include=*.scss` → three files; the other two checked:

| File | B&Y content | `.btn--primary` override? |
|---|---|---|
| `frontend/src/styles.scss` | HC token block only + `color-scheme` | global `.btn--primary` at `styles.scss:665-672` (all themes; **byte-untouched**) |
| `frontend/src/app/features/map/map-page.scss` | `:302` is a **comment** mention only | none |
| `frontend/src/app/shared/accessibility-dialog.component.scss` | the theme layer (links, band, Leaflet chrome, badges, **this button**) | **yes — the one this lane rewrites** (`:175,181` after the edit) |

So a single scoped site governs the button in B&Y; no second local override exists.

## 3. The rule (final state, `accessibility-dialog.component.scss:160-183`)

```scss
[data-theme='black-and-yellow'] .btn--primary {
  background: var(--color-bg-surface);
  border-color: var(--color-text);
  color: var(--color-text);
}

[data-theme='black-and-yellow'] .btn--primary:hover:not(:disabled) {
  background: var(--color-surface-hover);
}
```

Declarations → tokens → literal values (B&Y map, `theme-tokens.ts`):

| Declaration | Token | Resolves to in B&Y |
|---|---|---|
| `background` (base) | `--color-bg-surface` | `#000000` — the theme's black surface token (also the "text on primary" convention token) |
| `border-color` | `--color-text` | `#ffd400` — the theme gold |
| `color` | `--color-text` | `#ffd400` |
| `background` (hover) | `--color-surface-hover` | `#2b2400` — the theme's dark amber surface token (documented "ghost-button hover fill") |

Token decisions vs the owner's draft (`black` / `var(--color-link)`):

- **`black` → `var(--color-bg-surface)`** — literal colours are forbidden by the audit
  (`design-tokens.spec.ts` "no literal colour values" runs a raw line scan over every
  non-global stylesheet; the a11y scss currently contains zero hex, including in comments —
  the new comment was kept hex/rgba-free for that reason). In B&Y the token is `#000000`,
  exactly his `black`; the attribute scoping makes it a no-op elsewhere.
- **`var(--color-link)` → `var(--color-text)`** — see §10, this is the one call the owner
  should see with his own eyes. Rationale: `--color-link` (`#ffe066`) is the prose-LINK
  token, deliberately kept 1.10:1 apart from body text and underlined (WCAG 1.4.1); the
  theme's established **outlined language** — the owner's own ALL-BADGES ruling in the same
  file ("black with a yellow border and yellow text … Text + border: --color-text") and the
  B&Y Leaflet zoom buttons — uses `--color-text` for border + label. Consistency with the
  owner's own ruling; a one-line swap if he prefers the lighter link yellow.
- **Hover: `--color-surface-hover`, NOT `--color-primary-hover`** (the trap). In B&Y
  `--color-primary-hover` is `#ffb347` — a LIGHT fill. Yellow label on it measures
  **1.24:1** — exactly the unreadable hover the request exists to avoid. `#2b2400` is the
  theme's own dark hover surface (label + border on it 10.83:1).

State coverage beyond base/hover (all inherited, no new rules — measured, below):

- `:focus-visible` — the **global** ring (`styles.scss:463-470`, `2px solid var(--color-primary)`,
  offset 2px, drawn OUTSIDE the border on the page background). In B&Y the ring is
  `#ff9f1c`: **10.23:1** on the black page/band, **8.97:1** even on the 92%-black map-legend
  overlay. No B&Y ring rule needed or added.
- `:active` — no `.btn` variant anywhere in the app declares `:active` (checked: base,
  `--primary`, `--ghost`, `--danger`); press keeps the hover fill. App-wide convention;
  adding a press step is an owner decision, not a fix.
- `:disabled` — inherits `.btn:disabled { opacity: 0.55 }` (`styles.scss:657-660`).
  Effective label + border = 55% `#ffd400` over black = `#8c7500` → **4.66:1** (text floor
  4.5 and UI floor 3 both cleared) — still reads as disabled AND stays readable.

## 4. Measured contrast in B&Y (WCAG 2.1 math, the spec's own luminance function)

| State | Pair (fg on bg) | Literal values | Measured | Floor | Verdict |
|---|---|---|---|---|---|
| Base — label | `--color-text` on `--color-bg-surface` | `#ffd400` on `#000000` | **14.67:1** | 4.5 text | PASS |
| Base — border vs fill | `--color-text` on `--color-bg-surface` | `#ffd400` on `#000000` | **14.67:1** | 3 UI | PASS |
| Base — border vs page | `--color-text` on `--color-bg` | `#ffd400` on `#000000` | **14.67:1** | 3 UI | PASS |
| Hover — label | `--color-text` on `--color-surface-hover` | `#ffd400` on `#2b2400` | **10.83:1** | 4.5 text | PASS (dark fill — the owner's requirement) |
| Hover — border vs fill | `--color-text` on `--color-surface-hover` | `#ffd400` on `#2b2400` | **10.83:1** | 3 UI | PASS |
| Hover — border vs page | `--color-text` on `--color-bg` | `#ffd400` on `#000000` | **14.67:1** | 3 UI | PASS |
| Active — label | (inherits hover fill) | `#ffd400` on `#2b2400` | **10.83:1** | 4.5 text | PASS |
| Focus ring vs page | `--color-primary` on `--color-bg` | `#ff9f1c` on `#000000` | **10.23:1** | 3 UI | PASS (ring drawn outside the border) |
| Focus ring vs legend overlay* | `--color-primary` on `~#141414` | `#ff9f1c` on 92%-black over white | **8.97:1** | 3 UI | PASS (*non-token blend, manual) |
| Disabled — label | effective `#8c7500` on `#000000` | 55% opacity blend | **4.66:1** | 4.5 text | PASS |
| Disabled — border | effective `#8c7500` on `#000000` | 55% opacity blend | **4.66:1** | 3 UI | PASS |
| **Trap proof** — what the draft's hover would have been | `--color-text` on `--color-primary-hover` | `#ffd400` on `#ffb347` | **1.24:1** | — | FAILS — rejected |
| Reference — hover FILL vs page | `--color-surface-hover` on `--color-bg` | `#2b2400` on `#000000` | 1.36:1 | n/a | fill is not the boundary; the 14.67:1 border + 10.83:1 label carry identification (same documented rationale as the exempted B&Y ghost-band fills — the same token on the same value) |

## 5. Diff proof: the other two themes are untouched

- `git diff --stat` → exactly **3 files**: the theme-layer scss, the spec (new test only),
  and this board. **`frontend/src/styles.scss`: `git diff` empty — byte-identical, 931 lines.**
  The light `:root` block (`styles.scss:91+`) and the entire HC theme block (`styles.scss:279-437`)
  are inside that file → both themes' tokens, the global `.btn--primary` (`:665-672`), the
  global focus ring, and `.btn:disabled` are all byte-unchanged.
- `core/theme-tokens.ts` (the only B&Y token home) — **not in the diff**; no token value moved.
- The new SCSS is 100% inside `[data-theme='black-and-yellow']` selectors — in light/HC the
  attribute never matches, so compiled output for those themes is identical.
- The new spec test asserts only `black-and-yellow|…` enforced-set members and B&Y token
  math; no light/HC assertion added.

## 6. The enforced guard (not a comment)

Every pair the outlined treatment rests on is a member of the **enforced** `CONTRAST_CHECKS`
set (the spec's `CONTRAST_CHECKS` at `design-tokens.spec.ts:715+`), and the coverage is now
pinned so it cannot silently fall out — new test
`design-tokens.spec.ts:1904` ("the theme layer outlines the black-and-yellow .btn--primary"),
in the file's existing pattern (sibling to the accent-substitution pin at `:1410` and the
anchor-search pin at `:1855`):

| Enforced tuple asserted by the pin | Where it lives in `CONTRAST_CHECKS` | Floor | B&Y measured |
|---|---|---|---|
| `black-and-yellow|--color-text|--color-bg-surface|4.5` | `TEXT_PAIRS` (all 3 themes) | 4.5 | 14.67 |
| `black-and-yellow|--color-text|--color-bg|4.5` | `TEXT_PAIRS` (all 3 themes) | 4.5 | 14.67 |
| `black-and-yellow|--color-text|--color-surface-hover|4.5` | `TEXT_PAIRS` (all 3 themes) | 4.5 | 10.83 |
| `black-and-yellow|--color-primary|--color-bg|3` | non-text 3:1 group (all 3 themes; the admin-tab-underline pair — its comment already names the focus ring) | 3 | 10.23 |

So: **no new `CONTRAST_CHECKS` entry was required** — the yellow-on-black pairs are already
fanned across the themes in the enforced set at floors stricter than the 3:1 UI boundary.
The pin (i) asserts the theme-layer rule's declarations by raw text (hex-free, matching the
badge/Leaflet pins' mechanism style), (ii) asserts all four tuples still sit in the enforced
set, and (iii) re-measures the four ratios on the runtime token literals. A future edit that
drops a pair from the list, or retunes a B&Y token below a floor, **fails the build**.
Evidence: test count 1590 → **1591** (the pin is the +1), exit 0.
No exemption was added (the hover-fill-vs-page 1.36:1 row is the fill, not a boundary —
see §4 reference row; the same token/value already runs un-exempted for B&Y body ghost
buttons on the page).

## 7. `.btn--primary` surfaces checked in B&Y (31 usage sites, 14 files)

B&Y is an all-black theme: `--color-bg`, `--color-bg-surface`, `--color-bg-subtle` and
`--color-chrome-bg` are all `#000000`. Every surface the button can sit on is black or
92%-black:

| Surface (files) | B&Y background it sits on | Verdict |
|---|---|---|
| Submit flow — `submit-shelter-page.html:272` (submit, `btn--block`), `shelter-detail-page.html:219,267,331,353` (report/confirm actions), `guidance-detail-page.html:5` + `shelter-detail-page.html:5` (back links) | page `--color-bg` `#000` / cards `--color-bg-surface` `#000` | outlined reads: yellow border + label 14.67:1 on black |
| Primary CTAs — `page-shell.html:101` (Register, **inside the `<header>` chrome band**), `register-page.html:5` (login link) | header band `--color-chrome-bg` = **`#000000`** in B&Y (black band, yellow text — `theme-tokens.ts` chrome block) | **no yellow-band case exists**: the band in B&Y is black, so border 14.67:1 + label 14.67:1 on it; the "yellow border on yellow" disappearance cannot occur (light/HC bands are navy, and this rule is B&Y-scoped) |
| Auth — `login-page.html:58`, `register-page.html:124`, `reset-page.html:38,143` (all `btn--block` submits) | page `#000` | PASS |
| Account — `account-page.html:93,207,237,319,349`, `contributions-panel.html:175`, `verify-page.html:50,74,96,98,110` | page/cards `#000` | PASS |
| Admin — `guidance-editor.html:364`, `guidance-panel.html:48`, `shelters-panel.html:349,396`, `site-texts-panel.html:70` | page `#000` | PASS |
| Shared — `consent-banner.component.html:16` (card = `--color-bg-surface` `#000`), `list-state.html:8` (pagination) | `#000` | PASS |
| Map page | **no `.btn--primary` on /map** (the map CTAs are `.map-cta`, a separate class; `anchor-search__button` is its own pinned rule) | n/a |

`page-shell.scss:102`'s band scoping targets only `.shell-header .btn--ghost` — the band's
primary CTA keeps the global + theme-layer rules (verified by grep: no component-scoped
`.btn--primary` SCSS exists anywhere, so the theme layer's (0,3,0)/(0,4,0) outranks the
global (0,1,0)/(0,3,0) regardless of `<style>` injection order).

## 8. Line / anchor shifts (recorded on the board, `docs/autopilot/CODE-REVIEW-NOTES.md` BTN-BY)

- `styles.scss` — **0 shift** (byte-identical, 931 lines) → every 00-CURRENT-STATE.md anchor
  (`:3`, `:279`, `:810-920`, …) valid.
- `design-tokens.spec.ts` — +60 at `:1904-1963` → file 2110→2170; first-describe close
  1919→1979; **spacing-literals describe header 1961→2021**; end 2110→2170. **No doc-cited
  anchor moved** (max cited line :977 < insertion point) — verified, and
  `DocumentationFactsTest` 21/21 green on the final tree proves it.
- `accessibility-dialog.component.scss` — 291→305; the button rules 163/167→**175/181**.
  No line citations of this file exist anywhere in `docs/` (grep) — informational only.
- `docs/agent/00-CURRENT-STATE.md` — **not edited** (rule 6: one lane owns it; the doc
  documents the theme system in general, not this button — "btn--primary"/"invert" do not
  appear in any guard-read doc, so no documented behaviour was touched).

## 9. Gates (detached, exit files) + bundle delta

| Gate | Result |
|---|---|
| `cd frontend && npx ng test --watch=false` | **exit 0 — 1591 passed (1591), 66 files** (baseline 1590/66; the +1 is the new pin test) — `/tmp/btn-by-test.{log,exit}` |
| `cd frontend && npx ng build` | **exit 0** — pre-existing SCSS budget warnings only (admin/map panels, recorded by prior lanes) — `/tmp/btn-by-build.{log,exit}` |
| bundle delta (build at stashed HEAD vs build with change) | main chunk 229.62 → 229.69 kB raw (**+0.07 kB** — the ViewEncapsulation.None a11y stylesheet inlined into main); **Initial total 607.76 → 607.83 kB raw, transfer size unchanged at 156.71 kB**; lazy chunks untouched — `/tmp/btn-by-build-base.log` |
| `flock /tmp/openshelter-mvn.lock mvn -B -ntp -Dtest=DocumentationFactsTest test` | **exit 0 — Tests run: 21, Failures: 0, Errors: 0, Skipped: 0** — `/tmp/btn-by-docfacts2.{log,exit}` (run un-quieted; the `-q` first run exited 0 with an empty log, so the count run was re-taken) |

## 10. Unverified + the decision for the owner's own eyes

**For the owner's eyes (the one judgement call):** the draft said
`border-color: var(--color-link); color: var(--color-link)`. I set **`--color-text`**
(`#ffd400`) for both instead of `--color-link` (`#ffe066`): the link token is the prose-link
voice (underlined, kept 1.10:1 off body text), while the theme's outlined-control language —
the owner's own ALL-BADGES ruling and the B&Y Leaflet controls, same file — uses
`--color-text`. Look at the button next to a link and a badge in B&Y and tell me if you want
the lighter link yellow; it is a two-token swap, fully guarded either way.

Also worth an eye: **`:active` has no press step** (press = hover fill, app-wide convention;
no `.btn` variant declares `:active`). If you want the press to snap back to pure black, it
is one 3-line rule — say the word.

**Unverified (honest list):**
- Rendered pixels: the math is the spec's own WCAG function on the exact shipped tokens, but
  no headless-Chromium screenshot of the button in B&Y was taken this lane (prior polish
  lanes measured in real Chromium when geometry mattered; here only colour ratios, which are
  token-exact).
- Disabled effective colour (`#8c7500`, 4.66:1) is an opacity-blend computation — correct per
  CSS alpha compositing, but the browser's actual paint at 55% over black was not screenshotted.
- Focus ring on the map legend overlay (8.97:1) is a manual blend of the 92%-black overlay
  over white — no `.btn--primary` actually renders there (no usage on /map), so this is a
  headroom figure, not a live surface.
- ET/RU scripts inside the outlined button — label contrast is script-independent (same
  colours), untested as rendering only.

**Files for the parent's commit:** `frontend/src/app/shared/accessibility-dialog.component.scss`,
`frontend/src/app/design-tokens.spec.ts`, `docs/autopilot/CODE-REVIEW-NOTES.md` (board line),
`reviews/polish/btn-by.md` (this file).
