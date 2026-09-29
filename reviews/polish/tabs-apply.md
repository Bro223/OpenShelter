# TABS-APPLY — the dense admin tab bar, applied on owner adjudication (option a)

Lane: TABS-APPLY (branch `feature/frontend`, no commits — parent commits).
Executes the owner's adjudication of the TABS-DENSE stop (that report, §1):
**option (a) — underline, as decided**. Everything below is verified in the
APPLIED state, not the proposed state.

## 1. What was applied

Three source files + the notes board. Zero markup, zero behaviour, zero
strings, zero new tokens/colours/values (every value in the diff is in the
TABS-DENSE §5 composition table — re-verified against the tree, §3).

| File | Change |
|---|---|
| `frontend/src/app/features/admin/admin-page.scss:15-50` | §4.2 of the dense report, applied verbatim (net +11 lines, file 39 → 50) |
| `frontend/src/app/features/admin/admin-page.spec.ts:2240-2267` | the single conflicting assertion retargeted per §4.3, with the re-pin reason recorded in the test (net +10 lines) |
| `frontend/src/app/design-tokens.spec.ts:745-761` | the new `--color-primary` × `--color-bg` contrast pair added to the enforced 3:1 UI set, all three themes (net +17 lines) |
| `docs/autopilot/CODE-REVIEW-NOTES.md` | two anchor-shift entries (rule 6) — the notes board is shared; my two lines are the only additions |

`admin-page.html` is byte-identical (git-verified): classes, handlers,
`aria-pressed`, i18n keys, DOM order all untouched. `styles.scss`,
`_admin-shared.scss`, the catalogs, `theme-tokens.ts` untouched. The working
tree also carries sibling lanes' in-flight edits (the i18n catalogs, uncommitted
at lane start) — not mine, not mine to report.

### 1.1 The applied style, `admin-page.scss`

- `:15-21` row comment (dense-bar rationale: repeated in-view navigation, the
  deliberate 48px exception bounded by WCAG 2.5.8's 24px floor, the underline
  as the app's active-nav idiom)
- `:22-28` `.admin-tabs` — the row minus `padding-bottom: var(--space-8)`;
  `gap: var(--space-8)` / `margin-bottom: var(--space-16)` / the 1px
  `--color-border-subtle` divider unchanged
- `:30-42` NEW `.admin-tab` — `min-height: var(--space-32)` (32px target),
  `padding: 0 var(--space-12)` (spaced sides, no vertical padding),
  `border-color: transparent` (borderless), `color: var(--color-muted)`
  (muted inactive), `font-size: var(--text-sm)` (the type-step drop)
- `:44-50` `.admin-tab--active` — the fill and its hover sub-rule REMOVED;
  `color: var(--color-text)` + `text-decoration: underline` +
  `text-decoration-color: var(--color-primary)` +
  `text-decoration-thickness: var(--space-2)` (2px) +
  `text-underline-offset: var(--space-4)` (4px)

Mechanism re-verified in the APPLIED tree: the component-scoped rules compile
to `.admin-tab[_ngcontent-…]` etc. (specificity (0,2,0)), beating the global
`.btn`/`.btn--ghost` (0,1,0) for min-height/padding/border-color/colour/
font-size — verified in the compiled admin chunk of the post-change build
(`chunk-W4uH_jEC.js`: all three rules present with exactly the designed
declarations, no `background` anywhere in the tab rules). The ghost hover
(`.btn--ghost:hover:not(:disabled)` → `--color-surface-hover`,
`styles.scss:678-681`) is untouched and still matches every tab, so the hover
treatment is the current one by construction.

## 2. The retargeted assertion (before / after, reason recorded)

**Before** — `admin-page.spec.ts:2240-2256` (the pin that stopped TABS-DENSE):

```ts
it('the active tab fills primary without a ghost border or off-contract text (admin-page.scss)', () => {
  const scss = readFileSync(`${process.cwd()}/src/app/features/admin/admin-page.scss`, 'utf8');
  const block = scss.match(/\.admin-tab--active \{[\s\S]*?\n\}/);
  expect(block, 'admin-page.scss must keep the .admin-tab--active rule').not.toBeNull();
  const rule = block![0];
  // The tab is a ghost button: without this the ghost border rims the
  // primary fill.
  expect(rule, 'the active tab must hide the ghost border').toMatch(/border-color: transparent/);
  // Text on primary is --color-bg-surface (the token contract for text
  // on the primary fill). An undefined var() — the split's
  // --color-text-inverse — silently falls back to the inherited text
  // colour and breaks the light theme's contrast.
  expect(rule, 'the active tab text follows the text-on-primary contract').toMatch(
    /color: var\(--color-bg-surface\)/,
  );
  expect(rule, 'no undefined --color-text-inverse token').not.toMatch(/--color-text-inverse/);
});
```

**After** — `admin-page.spec.ts:2240-2267` (the §4.3 replacement, with the
re-pin reason recorded in the test as the brief requires):

```ts
it('the active tab is the underline idiom without a fill or off-contract text (admin-page.scss)', () => {
  // RE-PINNED (owner decision: the dense tab bar — the active tab is the
  // 2px accent underline, not the primary fill). The fill contract this
  // test used to pin (text-on-primary --color-bg-surface) belongs to the
  // retired filled-tab design: as active-tab text on the page surface the
  // token is illegible in every theme (light #ffffff on #f4f6f8 = 1.08:1,
  // high-contrast #141414 on #0a0a0a = 1.07:1, black-and-yellow
  // #000000 on #000000 = 1.0:1), so the underline state cannot keep it.
  // Deliberate re-pin, not a loosening: the rule-existence assertion and
  // the --color-text-inverse negative check survive, and the underline's
  // pair (--color-primary on --color-bg) is enforced at 3:1 in
  // design-tokens.spec.ts.
  const scss = readFileSync(`${process.cwd()}/src/app/features/admin/admin-page.scss`, 'utf8');
  const block = scss.match(/\.admin-tab--active \{[\s\S]*?\n\}/);
  expect(block, 'admin-page.scss must keep the .admin-tab--active rule').not.toBeNull();
  const rule = block![0];
  expect(rule, 'the active tab paints no fill (the dense idiom is underline, not primary fill)').not
    .toMatch(/background/);
  expect(rule, 'the active tab text is the page text token').toMatch(/color: var\(--color-text\)/);
  expect(rule, 'the underline is the 2px accent — the app active-nav idiom').toMatch(
    /text-decoration: underline/,
  );
  expect(rule).toMatch(/text-decoration-color: var\(--color-primary\)/);
  expect(rule).toMatch(/text-decoration-thickness: var\(--space-2\)/);
  expect(rule).toMatch(/text-underline-offset: var\(--space-4\)/);
  expect(rule, 'no undefined --color-text-inverse token').not.toMatch(/--color-text-inverse/);
});
```

Kept from the old pin: the rule-existence assertion and the
`--color-text-inverse` negative check. Dropped: the two fill-contract
assertions (`border-color: transparent` inside the active rule,
`color: var(--color-bg-surface)`) — they assert the removed visual. The
`border-color: transparent` declaration itself was NOT dropped from the
stylesheet — it moved to the new `.admin-tab` rule (borderless at rest).
The three illegibility figures in the recorded reason were recomputed by
this lane with the spec's own WCAG math on the shipped token literals
(§3) — not copied.

## 3. The contrast pair added to the design-token guard

`design-tokens.spec.ts:745-761` — inside `CONTRAST_CHECKS`, after the
existing 3:1 UI set, following the same `flatMap` pattern the file already
uses for theme-fanned pairs (the `TEXT_PAIRS` shape), so it is checked in
ALL THREE themes (the existing 3:1 block fans only light + high-contrast;
this pair is used on the page surface in every theme, so the B&Y value is
enforced too):

```ts
...(
  [['--color-primary', '--color-bg']] as [string, string][]
).flatMap(([fg, bg]) =>
  (['light', 'high-contrast', 'black-and-yellow'] as const).map((theme) => ({
    theme, fg, bg, min: 3,
  })),
```

**Evidence it is genuinely enforced, not computed:** the guard's main test
("every contrast-checked text pair meets 4.5:1 and border pairs 3:1, in
every theme") iterates `CONTRAST_CHECKS`, resolves each token from the
theme's own literal block (`:root`, the high-contrast block, the
`theme-tokens.ts` runtime map) and fails the suite on any ratio below
`min` — so a token edit that drops `--color-primary`×`--color-bg` under 3:1
in ANY theme fails the build. It is not an exemption (the exemptions list
is for sub-threshold pairs — this one clears 3:1 with headroom in all
three), it is not in a comment, and the non-vacuous floor
(`CONTRAST_CHECKS.length >= 80`) only grows.

**Measured values (this lane, the spec's own relative-luminance/contrast
math on the shipped literals — independently recomputed, all matching the
dense report §7):**

| Pair | Light | High-contrast | Black-and-yellow |
|---|---|---|---|
| **`--color-primary` on `--color-bg` (NEW, 3:1)** | 5.33:1 | 9.41:1 | 10.23:1 |
| active text `--color-text` on `--color-bg` (4.5:1) | 14.74:1 | 19.80:1 | 14.67:1 |
| inactive `--color-muted` on `--color-bg` (4.5:1) | 5.64:1 | 12.71:1 | 10.47:1 |
| inactive `--color-muted` on hover `--color-surface-hover` (4.5:1) | 4.74:1 | 9.71:1 | 7.73:1 |
| active `--color-text` on hover (4.5:1) | 12.40:1 | 15.13:1 | 10.83:1 |
| OLD pin, `--color-bg-surface` on `--color-bg` — the retired contract | 1.08:1 | 1.07:1 | 1.00:1 |

Literals used: light `#1769aa`/`#f4f6f8`/`#17232d`/`#536473`/`#dbe4eb`
(styles.scss:41/29/27/28/32); high-contrast `#7db8f0`/`#0a0a0a`/`#ffffff`/
`#cfcfcf`/`#262626` (styles.scss:365/357/355/356/360); black-and-yellow
`#ff9f1c`/`#000000`/`#ffd400`/`#d4b53a`/`#2b2400` (theme-tokens.ts:64/56/
54/55/60). The muted×hover and muted×bg pairs were ALREADY enforced in
`TEXT_PAIRS` — this lane adds only the one new pair.

## 4. Nothing else in the specs moved

`git diff --stat` for the lane: `design-tokens.spec.ts +17/−0`,
`admin-page.scss +25/−14`, `admin-page.spec.ts +20/−10`. Inspected the full
diff:

- `admin-page.spec.ts` — the +20/−10 is entirely inside the ONE
  retargeted `it` (§2). No other assertion touched, no test added or
  removed (count: 1590 → 1590, below).
- `design-tokens.spec.ts` — a single +17-line insertion in
  `CONTRAST_CHECKS`; no existing pair, threshold, exemption or assertion
  changed.
- `admin-page.scss` — only the §1.1 hunk; the `.admin-table`/`.admin-reason`
  rules the token spec reads (design-tokens.spec.ts:1608-1635) are
  untouched and shifted only (below).
- Every other spec that touches these files was re-checked against the
  applied tree (grep over `src`): the DOM specs read only classes and text
  the markup keeps (`admin-page.spec.ts:477` `button.admin-tab`, `:1179`
  `.admin-tab--active` + textContent — both green in the run), the i18n
  template guard (zero markup change), the architecture spec (parses
  admin-page.ts + the AdminTab union — untouched), the guidance-editor
  scss pins (`.admin-table-wrap` — untouched), the 48px `.btn` pin (reads
  styles.scss — untouched, still matches), the single-side accent-border
  guard (the diff introduces no single-side border declaration; verified
  green in the run), the spacing-literal guard (`0`, `var(--space-8/12/
  16)` — all allow-listed; verified green), the colour-literal/font-size
  guards (no hex/rgba/`font-size: \d` in the diff; verified green). The
  green suite is the evidence; the diff inspection confirms no other
  assertion moved.

## 5. Accessibility re-verification (in the applied state)

- **Native buttons preserved**: `admin-page.html` byte-identical — nine
  native `<button type="button">` (grep count 9), no `tabindex` anywhere in
  the file (grep 0). Tab walks all nine in DOM order = visual order
  (unconfirmed → shelters → reports → alerts → users → guidance → media →
  settings → audit, `switchTab` order verified in the applied tree);
  Enter/Space activate through native button semantics.
- **`aria-pressed` survives**: all nine `[attr.aria-pressed]` bindings
  present in the applied markup (grep count 9) — the active state is
  programmatically perceivable regardless of the visual treatment.
- **Global focus-visible ring untouched**: `styles.scss` has zero diff;
  `button:focus-visible { outline: 2px solid var(--color-primary);
  outline-offset: 2px }` (styles.scss:455-461) is unchanged — and the ring
  now shares its pair with the underline (`--color-primary` on
  `--color-bg`, 5.33/9.41/10.23:1, newly enforced at 3:1, §3). The pinned
  UA-ring suppression is likewise untouched.
- **Active state is not conveyed by hue alone, all three themes**: the
  non-colour cues are (1) the SHAPE of the 2px underline (present only on
  the active tab), (2) the value step — active `--color-text` vs inactive
  `--color-muted` is a 2.3–5.9:1 brightness gap in every theme (light
  #17232d vs #536473; HC #ffffff vs #cfcfcf; B&Y #ffd400 vs #d4b53a — in
  B&Y both are the same yellow family, so hue carries NOTHING there and the
  line + value step + `aria-pressed` carry the whole state, matching the
  theme's one-voice philosophy), and (3) the programmatic `aria-pressed`.
  WCAG 1.4.1 satisfied in the applied state; 1.4.11 (underline 3:1) now
  enforced; 2.4.7 (focus) untouched; 2.5.8 (targets) met — 32px tall,
  widths measured 63.8–137.8px in the browser (§6), all ≥ 24px in both
  dimensions.
- **No ARIA added** (the TABS-DENSE §8 rejection stands: these are
  pressed-state toggles, not a tablist; `role="group"` + `aria-pressed` is
  the accurate, pinned idiom).

## 6. Measured heights (REAL browser this time — chromium headless)

TABS-DENSE had no browser and computed from the declarations; this lane
rendered the exact markup + global `.btn`/`.btn--ghost` + the applied rules
with the light-theme literals in headless Chromium
(`/tmp/tabs-apply-measure/{before,after}.html`, `--dump-dom` + inline
measurements — fixtures left in /tmp for the parent's inspection):

| Measure (border-box, rendered) | Before | After |
|---|---|---|
| Tab target (all nine) | **48px** | **32px** |
| Tab row (incl. 1px divider) | **57px** | **33px** |
| Content below the row (top edge) | y = 81px | y = 57px — **shifts up 24px** |
| Tab widths (nine) | 77.1 – 158.9px | **63.8 – 137.8px** (all ≥ 24px, WCAG 2.5.8) |

The rendered values match the dense report's declaration-derived math
exactly (both states are min-height-bound, so the box arithmetic was exact
— confirmed by measurement, not just computed).

## 7. GATE (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0 — 1590/1590, 66
  files** — **count unchanged vs the 1590 baseline** (the retarget is a
  1-for-1 `it` replacement; the guard addition is inside an existing `it`).
  Log `/tmp/tabs-apply-test.log`, exit `/tmp/tabs-apply-test.exit` (run on
  the applied tree, 02:05).
- `npx ng build` → **exit 0**. Pre-change baseline build
  `/tmp/tabs-apply-build-before.{log,exit}` (exit 0, run on the tree as
  found), post-change `/tmp/tabs-apply-build-after.{log,exit}` (exit 0).
  Both on this tree (sibling i18n edits were in the working tree for both,
  so the delta is attributable to this lane's diff).
- **Bundle delta: +93 B, all in the admin lazy chunk** (436,902 B →
  436,995 B, `chunk-DFFMcDAr.js` → `chunk-W4uH_jEC.js`; the whole-dist delta
  is the same +93 B, so nothing else moved). Within the dense report's
  predicted +0.1–0.25 kB. No budget warning names `admin-page.scss`
  (grep 0 hits in the build log); the eight budget warnings are pre-existing
  in other lanes' files (shelter-detail-page 5.46 kB, map-page 7.77 kB,
  shelters-panel 4.38, submit-shelter-page 4.38, users-panel 4.09,
  alerts-panel 4.09, guidance-panel 4.73, guidance-editor 4.26).

## 8. Anchor shifts (rule 6 — recorded in CODE-REVIEW-NOTES.md, NOT edited in the doc)

- `design-tokens.spec.ts` +17 lines at :745-761 shifts three
  `00-CURRENT-STATE.md` citations that DocumentationFactsTest guards:
  `:866-876` → **883-893** (doc :329), `:924` → **941** (doc :94),
  `:960` → **977** (doc :100). Content verified at the new lines. The
  `:64-66,73-88` citation (doc :322) is before the insertion — unchanged.
  **Expect DocumentationFactsTest to flag exactly these three anchors until
  the final anchor pass re-derives** (the backend test is not in this lane's
  gate; the frontend gate is).
- `admin-page.scss` +11 lines shifts the historical (closed) citations in
  `docs/autopilot/findings/frontend-inventory.md`: `:53-56` → 64-67,
  `:183-185` → 194-196, `:189` → 200, `:210-211` → 221-222, `:272` → 283.
  Those findings docs are NOT guarded by DocumentationFactsTest (it covers
  README.md, frontend/README.md, docs/agent/*.md — verified); recorded for
  completeness. `00-CURRENT-STATE.md` cites neither `admin-page.scss` nor
  `admin-page.spec.ts`, so only the design-tokens citations are guard-relevant.

## 9. Unverified

- **Rendered appearance beyond box geometry** — the Chromium fixture
  measured the real box heights/widths, but the underline's visual
  position/thickness in the ACTUAL app (real fonts, real catalog strings,
  all three themes' chrome) is a manual/E2E step; this lane asserts the
  mechanism + compiled output, not pixels.
- **ET/RU scripts under the underline** — the decoration follows the text in
  every script (no per-script geometry in the design); not visually checked.
- **The three anchor re-derivations** — recorded, not applied (the doc is
  owned by the docs lane; the anchor pass re-derives).
- **The sibling lanes' concurrent i18n edits** were in the working tree when
  my gates ran; the suite is green WITH them present, but their own lane
  owns their correctness.
