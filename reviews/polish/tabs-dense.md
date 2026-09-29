# TABS-DENSE — the admin tab row as a dense tab bar

Lane: TABS-DENSE (branch `feature/frontend`, no commits — parent commits).
Decision under execution: "make the admin tab row a dense tab bar — smaller
controls, an underline for the active tab, rather than nine full-size 48px
ghost buttons with a filled active state."

## 0. Status — STOPPED at a genuine spec conflict (rule 5); nothing applied

**No source file was changed.** The underline active state is irreconcilable
with a spec-pinned assertion body that this lane may not touch, and rule 5 of
the brief reserves that adjudication for the owner: "if your change alters an
assertion, stop and report instead." The full design is built, composed from
existing tokens only, and verified against every audit and theme in this
report; it is ready to apply in one edit once the owner adjudicates §1.
Gates below ran on the UNMODIFIED tree (baseline confirmation).

## 1. The adjudication packet (read first)

**The pin** — `frontend/src/app/features/admin/admin-page.spec.ts:2240-2256`:

```ts
it('the active tab fills primary without a ghost border or off-contract text (admin-page.scss)', () => {
  const scss = readFileSync(`${process.cwd()}/src/app/features/admin/admin-page.scss`, 'utf8');
  const block = scss.match(/\.admin-tab--active \{[\s\S]*?\n\}/);
  expect(block, 'admin-page.scss must keep the .admin-tab--active rule').not.toBeNull();
  const rule = block![0];
  expect(rule, 'the active tab must hide the ghost border').toMatch(/border-color: transparent/);
  expect(rule, 'the active tab text follows the text-on-primary contract').toMatch(
    /color: var\(--color-bg-surface\)/,
  );
  expect(rule, 'no undefined --color-text-inverse token').not.toMatch(/--color-text-inverse/);
});
```

This pin IS the filled state: it asserts the `.admin-tab--active` rule carries
the text-on-primary-fill contract (`color: var(--color-bg-surface)`) with the
ghost border hidden — i.e. "the active tab fills primary" (the test name).
The underline decision removes the primary fill. The pinned token cannot be
met honestly: as active-tab text on the page surface, `--color-bg-surface` is
illegible in every theme (light: #ffffff on #f4f6f8 = 1.08:1; high-contrast:
#141414 on #0a0a0a = 1.07:1; black-and-yellow: #000000 on #000000 = 1.0:1).
Satisfying the match with a comment mentioning the token is guard-gaming —
the repo's own `withoutCssComments` idiom (design-tokens.spec.ts) exists
because prose must not satisfy a check. Not done.

So, per rule 5, the underline part stops here and goes to the owner. The
class names themselves are safe (I rename nothing — `admin-tab` /
`admin-tab--active` stay exactly as the DOM spec queries them,
admin-page.spec.ts:477, 1179); the conflict is the fill the active-state pin
asserts, which the decision replaces.

**Options for the owner:**

- **(a) Underline, as decided** — apply the scss diff §4.2 and retarget that
  one assertion (proposed replacement §4.3). Verified unaffected: every other
  spec that touches these files (grep over all of `src`, §7) — DOM specs read
  only classes/text/handlers (unchanged), the i18n template guard (zero markup
  change), the architecture spec (parses admin-page.ts + the AdminTab union,
  unchanged), and design-tokens.spec.ts (reads admin-page.scss only for the
  `.admin-table` rules, §4.4).
- **(b) Keep the fill** — apply only the dense-geometry + muted-inactive part
  of §4.2 (the `.admin-tabs` row change + the new `.admin-tab` rule; the
  `.admin-tab--active` rule stays byte-identical, the pin stays green as-is).
- **(c) No change** — leave the tree as found.

I did not pre-emptively ship option (b) either: it is a dense bar with a
FILLED active tab — a state no one decided on — and the parent commits this
tree. An undecided intermediate visual in the commit stream is worse than a
stopped lane with a ready diff; the brief's design is one package (smaller
controls + underline instead of fill), and the package cannot ship green
without the owner's pin retarget.

## 2. Scope read

- `reviews/code-review/design-review.md` §4 finding 3 (this task's proposal) +
  §3 (what the pages do well — states/spacing/theming all pinned by the
  design-tokens suite, which this design must not disturb).
- `frontend/src/app/features/admin/admin-page.html` (the tab row, :16-98),
  `_admin-shared.scss` (`.admin-tab` absent there — the tab styles live only in
  admin-page.scss; the shared partial's "48px min-height" note at :10 governs
  ACTION targets, which stay 48px), `admin-page.scss` (:15-39),
  `frontend/src/styles.scss` (tokens + the global `.btn`/`.btn--ghost` at
  :636-683, the `:focus-visible` ring at :455-461),
  `frontend/src/app/design-tokens.spec.ts` (in full — the colour/font/spacing/
  single-side-accent audits, the 48px `.btn` pin, the contrast + parity
  guards), `frontend/src/app/features/admin/admin-page.spec.ts` (the tab-bar
  assertions), `frontend/src/app/core/theme-tokens.ts` (the B&Y runtime map),
  `frontend/src/app/shared/page-shell.scss` (the existing active-nav idiom,
  :56-77, and the documented sub-48px precedents), `frontend/src/app/core/
  i18n/{en,et,ru,messages}.ts` (the tab keys).
- Skills: `web-design-guidelines` (fetched the live Vercel rule set from the
  URL inside the skill file before reviewing), `accessibility` (WCAG 2.2,
  2.5.8 / 1.4.11 / 1.4.1 / 2.4.7 / 4.1.2), `angular-developer` (encapsulation,
  ARIA Tabs reference consulted and deliberately NOT followed — §8).
- Rules: `docs/autopilot/CODE-REVIEW-RUN.md` (behaviour-preserving, gates
  detached with exit files, one writer per file, report both directions).

## 3. Before (the state as found)

**Markup** — `frontend/src/app/features/admin/admin-page.html:16-98`: a
`role="group"` row (label `admin.tabs.aria`) of nine `<button
type="button" class="btn btn--ghost admin-tab">` with
`[class.admin-tab--active]`, `[attr.aria-pressed]` and
`(click)="switchTab('…')"` per tab, in the order unconfirmed → shelters →
reports → alerts → users → guidance → media → settings → audit. No
`tabindex` anywhere in the file (grep: 0 hits).

**Styles** — `frontend/src/app/features/admin/admin-page.scss`:

```scss
/* :15-16  The tab row: a scrollable row of chips … The active tab is the primary fill. */
.admin-tabs {            /* :17-24 */
  display: flex;
  gap: var(--space-8);
  overflow-x: auto;
  padding-bottom: var(--space-8);
  margin-bottom: var(--space-16);
  border-bottom: 1px solid var(--color-border-subtle);
}

.admin-tab--active {     /* :26-39 */
  background: var(--color-primary);
  border-color: transparent;
  color: var(--color-bg-surface);
  &:hover:not(:disabled) {
    background: var(--color-primary-hover);
    color: var(--color-bg-surface);
  }
}
```

composed over the global `.btn` (`styles.scss:636-663`: `display: inline-flex`
centred, `min-height: var(--space-48)`, `border: 1px solid transparent`,
`padding: var(--space-8) var(--space-16)`, `font-size: var(--text-base)`,
`font-weight: var(--font-weight-medium)`) and `.btn--ghost`
(`styles.scss:674-683`: transparent background, `border-color:
var(--color-border)`, `color: var(--color-text)`, hover
`background: var(--color-surface-hover)`). Result: nine 48px bordered ghost
buttons, the active one filled primary.

## 4. After (PROPOSED — not applied, pending the §1 adjudication)

### 4.1 Markup

**No change.** The seam between the decision and the template is the class:
the classes are the spec's query contract (admin-page.spec.ts:477, 1179), the
handlers/URL state/i18n keys are behaviour (rule 4), and the active-state
semantics already ride on `aria-pressed` + the class. Zero template lines
move — which also keeps the i18n template guard and every DOM assertion
structurally green.

### 4.2 The scss diff (admin-page.scss:15-39 → replace)

```diff
-/* The tab row: a scrollable row of chips (mobile: the tabs scroll, the
-   page doesn't wrap). The active tab is the primary fill. */
+/* The tab row: a scrollable row of DENSE tabs (mobile: the tabs scroll,
+   the page doesn't wrap). Repeated in-view navigation, not an action row —
+   the deliberate exception to the 48px .btn rule (report §9): 32px targets
+   (above WCAG 2.5.8's 24px floor), borderless muted text at rest, the
+   active tab in the page text colour with the 2px accent underline — the
+   app's active-nav idiom (page-shell.scss .shell-nav a.active) on the
+   page-surface accent token. */
 .admin-tabs {
   display: flex;
   gap: var(--space-8);
   overflow-x: auto;
-  padding-bottom: var(--space-8);
   margin-bottom: var(--space-16);
   border-bottom: 1px solid var(--color-border-subtle);
 }

+/* The dense tab: the .btn base keeps the inline-flex centring and the 1px
+   (now transparent) border, so the box model only loses the ghost border's
+   paint. This rule overrides the 48px target, the ghost border, the text
+   colour and the type step for this one control group; the global .btn
+   keeps its 48px rule for every action target (design-tokens.spec.ts
+   "48px touch targets" pin — untouched). */
+.admin-tab {
+  min-height: var(--space-32);
+  padding: 0 var(--space-12);
+  border-color: transparent;
+  color: var(--color-muted);
+  font-size: var(--text-sm);
+}
+
 .admin-tab--active {
-  background: var(--color-primary);
-  /* The tab is a ghost button: without this the ghost border rims the
-     primary fill (pre-extraction behaviour, lost in the stylesheet split).
-     Text on primary is --color-bg-surface (the token contract for text on
-     the primary fill). */
-  border-color: transparent;
-  color: var(--color-bg-surface);
-
-  &:hover:not(:disabled) {
-    background: var(--color-primary-hover);
-    color: var(--color-bg-surface);
-  }
+  color: var(--color-text);
+  text-decoration: underline;
+  text-decoration-color: var(--color-primary);
+  text-decoration-thickness: var(--space-2);
+  text-underline-offset: var(--space-4);
 }
```

Notes on the composition (proof of mechanism, not just tokens):

- **The underline is the app's existing active-nav idiom** — `page-shell.
  scss:65-75` paints the shell nav's active link exactly this way
  (`text-decoration: underline` + `text-decoration-color: var(--color-
  chrome-active)` + `text-decoration-thickness: 2px` + `text-underline-
  offset: 4px`), commented "one thin line, no fill, no pill". This design
  reuses that mechanism on the page surface, where the accent is
  `--color-primary` (the token contract for page-surface accent/focus —
  `styles.scss` :140-142 "Focus rings use --color-primary everywhere").
  The shell nav uses the literal `2px`/`4px`; this diff uses the SAME values
  through the scale tokens (`--space-2` = 2px, `--space-4` = 4px), so no
  literal is introduced at all.
- **`.btn` sets `text-decoration: none`** (`styles.scss:657`); the
  component-scoped `.admin-tab--active` (Emulated encapsulation →
  `.admin-tab--active[_ngcontent-x]`, specificity (0,2,0)) beats it — the
  same way the current rule already beats `.btn--ghost`'s background.
- **The ghost hover survives untouched**: `.btn--ghost:hover:not(:disabled)`
  (`styles.scss:678-681`, `background: var(--color-surface-hover)`) still
  matches every tab — no hover rule is added or removed, so the hover
  treatment is the current one by construction.
- **Why `text-decoration` and not a border/pseudo-element underline**: the
  design-tokens spec forbids a single-side ACCENT border in any compiled
  stylesheet (`singleSideAccentOffense` — a `border-bottom: 2px solid
  var(--color-primary)` is caught twice: width > 1px AND non-neutral
  colour), and a `::after` bar would add a new mechanism (positioning + the
  row's `overflow-x: auto` clip region) where the app already ships the
  indicator. See §10.

### 4.3 The assertion retarget (PROPOSAL for the owner — not applied; the
spec stays byte-identical in this lane)

The single `it(...)` at admin-page.spec.ts:2240-2256 would become:

```ts
it('the active tab is the underline idiom without a fill or off-contract text (admin-page.scss)', () => {
  const scss = readFileSync(`${process.cwd()}/src/app/features/admin/admin-page.scss`, 'utf8');
  const block = scss.match(/\.admin-tab--active \{[\s\S]*?\n\}/);
  expect(block, 'admin-page.scss must keep the .admin-tab--active rule').not.toBeNull();
  const rule = block![0];
  expect(rule, 'the active tab paints no fill (the dense idiom is underline, not primary fill)').not.toMatch(/background/);
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

(Kept: the rule-existence assertion and the `--color-text-inverse` negative
check. Dropped: the two fill-contract assertions — they assert the removed
visual.)

### 4.4 Gate-audit walkthrough of the proposed CSS (why the suite stays green apart from §1)

- **Colour-literal audit** (design-tokens.spec.ts): no hex/rgba anywhere in
  the diff — only `var(--color-*)` + `transparent`.
- **Font audit**: `font-size: var(--text-sm)` (the scan flags
  `font-size:\s*\d`); no font-weight literal.
- **Spacing-literal audit**: every margin/padding/gap value is `0`,
  `var(--space-8)` or `var(--space-12)`/`var(--space-16)` — all allow-listed
  (`0` is the UA-reset idiom; the rest ride the scale).
- **Single-side accent-border guard** (compiled scan): the diff introduces no
  `border`/`outline` single-side declaration at all. `border-color:
  transparent` is a -color property on a neutral set (the guard's
  `NEUTRAL_DIVIDER_COLORS` includes `transparent`). The row's
  `border-bottom: 1px solid var(--color-border-subtle)` is pre-existing,
  ≤ 1px, neutral — allowed.
- **@media audit**: no media query added.
- **48px `.btn` pin** (design-tokens.spec.ts "48px touch targets: .btn
  carries the min-height"): reads styles.scss, which is untouched — the 48px
  rule stays global; only this one control group overrides it locally.
- **Budgets**: admin-page.scss is 1,528 B today vs the 4 kB component budget;
  the applied diff nets ≈ +0.1-0.25 kB (≈ +180 B new `.admin-tab` rule −
  ≈ 90 B shrunken active rule) → ≈ 1.7 kB, under budget. (The four budget
  warnings in today's build log — users-panel 4.09 kB, unconfirmed-panel
  4.09 kB, guidance-panel 4.73 kB, shelter-detail-page 5.46 kB — are
  pre-existing, in other lanes' files, not in this diff.)

## 5. Token composition — proof that no new value exists in the design

Every value the proposed CSS uses, and where it already lives:

| Value in the diff | Token / form | Defined | Already used by |
|---|---|---|---|
| tab target height | `var(--space-32)` = 32px | styles.scss:240 | page-shell footer meta gap (page-shell.scss, `gap: var(--space-32)`) |
| tab side padding | `var(--space-12)` = 12px | styles.scss:234 | `.admin` page padding, `.field` inputs, `.admin-queue-row` |
| vertical padding | `0` | (allow-listed reset idiom) | spacing audit's own allow-list ("0 (any unit)") |
| inactive tab text | `var(--color-muted)` | styles.scss:28 (+HC :356, B&Y theme-tokens.ts) | `.admin-state`, `.admin-muted`, placeholders — all three themes |
| active tab text | `var(--color-text)` | styles.scss:27 | every heading/label on the surface |
| underline colour | `var(--color-primary)` | styles.scss:41 | links, focus rings, `.chip` hover border, `.chip--active` fill |
| underline thickness | `var(--space-2)` = 2px | styles.scss:229 | the line-weight family (2px border in `.shelter-marker`, the burger bars) |
| underline offset | `var(--space-4)` = 4px | styles.scss:230 | `.admin-hint` margin, `.shell-nav a` padding (literal 4px twin) |
| row gap | `var(--space-8)` = 8px | styles.scss:232 | unchanged from the current `.admin-tabs` |
| row bottom margin | `var(--space-16)` = 16px | styles.scss:236 | unchanged from the current `.admin-tabs` |
| row divider | `1px solid var(--color-border-subtle)` | styles.scss:122 | unchanged from the current `.admin-tabs` (1px = documented line-weight family) |
| tab border | `border-color: transparent` | (keyword, in the guard's neutral set) | the current `.admin-tab--active` already uses it |

Values REMOVED (no replacement invented): `--color-primary` as background
fill, `--color-primary-hover` as the active hover fill, the row's
`padding-bottom: var(--space-8)`, and the inherited `.btn` 48px/16px/
`--text-base` geometry (overridden, not re-added anywhere).

No new token, no new hex, no new scale step, no new font size or weight.
The one question that could have forced a new value — the underline
thickness — resolves to the existing 2px line-weight family (the shell nav
already ships exactly 2px for the same idiom).

## 6. Heights (computed from the declarations — both states are
min-height-bound, so the box math is exact)

jsdom cannot measure layout (the repo's established pattern —
design-tokens.spec.ts: "jsdom cannot do real layout, so the acceptance is the
mechanism itself"); these are the deterministic values the declarations
produce:

| Element | Before | After (proposed) |
|---|---|---|
| Tab target (border-box) | **48px** (min-height binds: content 0.95rem×1.5 = 22.8 + 2×8px padding + 2×1px border = 40.8 < 48) | **32px** (min-height binds: content 0.85rem×1.5 = 20.4 + 0 padding + 2×1px border = 22.4 < 32) |
| Tab row (content + padding-bottom + divider) | **57px** (48 + 8 + 1) | **33px** (32 + 0 + 1) |
| Content below the row | — | shifts up **24px** |

**WCAG 2.5.8 (AA, target size ≥ 24×24 CSS px): no interactive element drops
below 24px.** The tab is 32px tall (8px headroom over the floor) and
content-driven wide (shortest label "Users" ≈ 5ch ≈ 38px + 24px padding + 2px
border ≈ 64px); all nine clear the floor in both dimensions, so even the
24px-circle-overlap exception is not needed. 32px was chosen over the 24px
floor because 24 leaves only 1.8px of slack around the 20.4px line box —
the floor is a floor, not a target; `--space-24` remains a one-token swap if
the owner wants it tighter.

## 7. The three-theme check (contrast computed with the spec's own WCAG math
on the shipped token literals)

| Pair (theme) | Light | High-contrast | Black-and-yellow |
|---|---|---|---|
| **Active underline** `--color-primary` on `--color-bg` — UI indicator floor 3:1 (WCAG 1.4.11) | 5.33:1 | 9.41:1 | **10.23:1** |
| Inactive tab text `--color-muted` on `--color-bg` — text 4.5:1 | 5.64:1 | 12.71:1 | 10.47:1 |
| Inactive tab text on its hover fill `--color-surface-hover` — 4.5:1 | 4.74:1 | 9.71:1 | 7.73:1 |
| Active tab text `--color-text` on `--color-bg` — 4.5:1 | 14.74:1 | 19.80:1 | 14.67:1 |
| Active tab text on its hover fill — 4.5:1 | 12.40:1 | 15.13:1 | 10.83:1 |
| Focus ring `--color-primary` on `--color-bg` — 3:1 (2.4.7) | 5.33:1 | 9.41:1 | 10.23:1 |

Every pair passes. The muted×hover and muted×bg pairs are already spec-
enforced at 4.5:1 in all three themes (TEXT_PAIRS); the primary×bg pair is
NOT in the enforced list today (it is a new pair this design would use) —
computed above, and worth adding to the 3:1 UI set in design-tokens.spec.ts
if (a) is approved (shared spec file — an owner call, §12).

**Black-and-yellow, examined specifically** (the case the brief singled out —
"an accent underline may lose contrast against the chrome"):

- In B&Y the "chrome" IS pure black on both surfaces: `--color-bg: #000000`
  (the page surface the tab row sits on) and `--color-chrome-bg: #000000`
  (the band) — so the underline's backing is #000 either way.
- The accent is `--color-primary = #ff9f1c` — the theme's own CTA/primary
  family (theme-tokens.ts: "'--color-primary': '#ff9f1c' /* CTA/primary fill
  family + focus ring */"). On #000 it measures **10.23:1 — the strongest
  of the three themes** (light 5.33, HC 9.41). The accent underline does
  not lose contrast against the B&Y chrome; it is the theme's loudest
  structural colour (the same orange the crisis CTA carries at 5.6:1 white-
  text floor).
- The B&Y nuance the owner should see: the inactive (muted #d4b53a, 10.47:1)
  and active (text #ffd400, 14.67:1) tabs are the same yellow family — in
  this theme hue cannot separate states (the theme's own design: "hue cannot
  distinguish … from ordinary text, so the non-colour cue carries it").
  Exactly what the underline idiom provides: the ACTIVE state in B&Y is
  carried by the shape (the 2px line) + the value step (14.67 vs 10.47) +
  the programmatic `aria-pressed`, never by hue alone — consistent with the
  theme's one-voice philosophy (WCAG 1.4.1 satisfied).
- B&Y hover: muted on #2b2400 = 7.73:1, text on #2b2400 = 10.83:1 (the
  theme's comment claims 10.8:1 for text — matches).
- B&Y focus ring: #ff9f1c on #000 = 10.23:1 (the ring is the primary
  family in this theme — the theme-tokens comment says so).

## 8. Keyboard and accessible name (verified against the unmodified markup,
which the design keeps)

- **Reachable, sensible order**: nine native `<button type="button">` in DOM
  order = visual order (unconfirmed → shelters → reports → alerts → users →
  guidance → media → settings → audit; admin-page.html:17-98). No
  `tabindex` in the file (grep: 0) — Tab walks all nine in that order;
  Enter/Space activate through native button semantics (accessibility skill:
  native `<button>` gives keyboard + AT semantics for free; no manual
  handlers added or needed).
- **Current focus-visible treatment preserved**: the global
  `button:focus-visible { outline: 2px solid var(--color-primary);
  outline-offset: 2px }` (styles.scss:455-461) is untouched by the design —
  the ring is theme-driven (`--color-primary`: 5.33/9.41/10.23:1 on the
  page surface, §7). The pinned owner-approved UA-ring suppression
  (`*:focus { outline: none }`, styles.scss:466+, pinned by
  design-tokens.spec.ts) is likewise untouched — the token ring wins by
  specificity, exactly as today.
- **Accessible names unchanged**: each tab's name is its rendered label —
  the i18n keys `admin.tabs.unconfirmed|shelters|reports|alerts|users|audit`,
  `admin.guidance.tab`, `admin.media.tab`, `admin.settings.tab` (no new key,
  no changed string, no translation value — rule 4) — plus the live count on
  Unconfirmed. The group's name is `admin.tabs.aria`: "Admin sections"
  (en.ts:619) / "Haldus jaotised" (et.ts:627) / "Разделы
  администрирования" (ru.ts:639) — present in all three catalogs, unchanged.
- **The active tab is NOT conveyed only visually**: every button binds
  `[attr.aria-pressed]` (admin-page.html:21, 30, 39, 48, 57, 66, 75, 84, 93)
  — the pressed state is programmatically perceivable in the current markup,
  so the brief's "consider whether aria-selected/aria-current is warranted"
  resolves as: the state is already machine-readable; the underline is the
  non-colour VISUAL cue on top of it.
- **ARIA considered and rejected** (no ARIA added):
  - `role="tablist"`/`role="tab"` + `aria-selected` — would misdescribe the
    markup. These are buttons that toggle inline panel COMPONENTS (the
    deliberate, spec-recorded decision at admin-page.html:11-16: "a plain
    group of pressed-state toggles, NOT a role='tablist' widget"), and a
    conforming tablist additionally requires roving tabindex, arrow-key
    navigation and tab↔panel association — none of which exist or belong
    here. Adding the role without the behaviour is precisely the
    misdescription the brief warns about (web guidelines: "Use semantic HTML
    before ARIA"; accessibility skill: "When ARIA is needed, use the correct
    roles and states" — it is not needed; the Angular Aria Tabs reference
    was consulted and is for a different control).
  - `aria-current="page"` — marks the current location in a set of
    navigational locations (links to pages). These are state toggles inside
    one view, not locations — a misuse.
  - Net: the existing `role="group"` + per-button `aria-pressed` idiom (the
    same one the language switcher uses) stays — accurate, pinned, unchanged.

## 9. Why breaking the 48px rule is the right exception here

The 48px rule is the app's ACTION-control rule: the global `.btn`
min-height (styles.scss:649, pinned by design-tokens.spec.ts "48px touch
targets: .btn carries the min-height") and the admin surface's own note
(_admin-shared.scss:10: "All action targets use the global .btn (48px
min-height)"). It exists for actions — submit, confirm, reject, delete —
where a mis-tap costs the user something.

The tab row is a **repeated navigation choice inside one view**: nine
states of the same page, toggled repeatedly while the user's work happens in
the queue below. Its failure mode at 48px-with-fill is not reachability but
visual weight — nine primary-weight filled buttons read as nine primary CTAs
(the finding: "a heavy control for tab switching"). Shrinking the target and
moving the active state to an underline removes the weight without touching
reachability.

The governing standard is WCAG 2.5.8 (AA): ≥ 24×24 CSS px. The dense target
is 32px (≥ 24, §6) — the exception is bounded by a published floor, not
invented. And the app already documents this exact class of exception:

- the shell nav links (page-shell.scss:56-63): content-sized nav targets
  (`padding: var(--space-4) var(--space-6)`, no min-height) — repeated
  navigation, below 48px;
- the footer legal links (page-shell.scss, narrow block): ">=44px hit area
  via vertical padding … One step under the 48px --space-48 button/row
  convention on purpose — this is a legal footnote, not an action row" —
  the documented precedent, with the same rationale this design claims:
  repeated navigation, not an action row.

The 48px rule remains intact everywhere it was meant to bite: every admin
action control (confirm/reject/paging/delete buttons, the chips at
_admin-shared.scss:44-47 `min-height: var(--space-48)`, the guidance
language select pinned at 48px by admin-page.spec.ts:2228) is untouched.

## 10. What was rejected, and why

1. **`border-bottom: 2px solid var(--color-primary)` (the naive underline)**
   — fails the design-tokens guard "no single-side ACCENT border in any
   stylesheet" (compiled scan): width > 1px on one side AND a non-neutral
   colour. Even `1px solid var(--color-primary)` fails (non-neutral single
   side). This guard exists because the owner removed the accent-bar
   vocabulary; the underline must not re-enter through a border.
2. **A `::after` full-width bar** — passes the border guard (it is a
   background, not a border), but adds a NEW mechanism (positioning +
   interaction with the row's `overflow-x: auto` clip region, which clips to
   the padding box) when the app already ships the active-nav underline
   idiom it composes instead (§4.2). Kept as the fallback if the owner wants
   a full-width bar under the tab box rather than the label: it would also
   require the row's `padding-bottom` rework, and is strictly more CSS.
3. **A new token** (e.g. `--color-tab-underline`, a `--space-36` step) —
   violates rule 1; every needed value already exists (§5).
4. **Dense geometry + muted inactive, KEEPING the fill (option b, shipped
   now)** — not the decided design; shipping an undecided intermediate state
   for the parent to commit was the less disciplined choice vs the brief's
   "stop and report". Its diff is ready (§4.2 minus the active-rule hunk) if
   the owner picks (b).
5. **Satisfying the stale pin with a comment** containing
   `color: var(--color-bg-surface)` — guard-gaming; the repo's
   `withoutCssComments` idiom exists because prose must not satisfy checks.
6. **Renaming `.admin-tab--active` or the group idiom** — the spec asserts on
   both (admin-page.spec.ts:1179, 2242; the aria-pressed pattern is the
   app's established pressed-toggle group) — rule 5 territory.
7. **`min-height: var(--space-24)` (the bare floor)** — legal (2.5.8) but
   1.8px of content slack; 32px is the next scale step and the better
   target. Reported as a choice, not a constraint.
8. **`role="tablist"`/`aria-selected`/`aria-current`** — §8: would misdescribe
   the markup.
9. **Any behaviour change** (handlers, `switchTab`, URL `tab` param, lazy-
   load order, the Unconfirmed count) — rule 4; none made.

## 11. GATE (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0 — 1590/1590, 66
  files** — baseline exact, no count change. Run 1 (lane start, the tree as
  found): `/tmp/tabs-dense-test.log` + `.exit`. Run 2 (the tree as left —
  re-run after sibling lanes' files were committed mid-lane, so the attestation
  covers the exact tree this report ships with): `/tmp/tabs-dense-test2.log`
  + `.exit`, 1590/1590, 66 files.
- `npx ng build` → **exit 0** (run 1, pre-commit tree — this lane changed no
  source file, so the build surface is identical; pre-existing SCSS budget
  warnings only — the four other-lanes' files listed in §4.4, none in this
  lane's diff, which is empty). Log `/tmp/tabs-dense-build.log`, exit
  `/tmp/tabs-dense-build.exit`.
- **Bundle delta: 0 B** (no source change applied). If (a) is applied:
  ≈ +0.1-0.25 kB in the admin lazy chunk (§4.4).

Had the underline been shipped without the owner's pin retarget, this gate
would have been exit 1 with exactly one failure (the §1 assertion) — which
is why the lane stopped instead of shipping red.

## 12. Unverified

- **Rendered pixels** — the underline's visual position/thickness and the
  bar's overall density were not rendered (no browser available to this
  lane; jsdom measures no layout). Mechanism + tokens + contrast are
  verified; the appearance is a manual/E2E step.
- **Heights** — computed from the declarations (both states are
  min-height-bound, so the box arithmetic is exact), not browser-measured.
- **`--color-primary` × `--color-bg` at 3:1** is a NEW pair this design
  would use; it is not in the enforced contrast list (computed 5.33/9.41/
  10.23, §7). Adding it to the 3:1 UI set in design-tokens.spec.ts is the
  honest follow-up to (a) — a shared spec file, an owner call.
- **ET/RU scripts under the text-decoration underline** — the decoration
  follows the text in every script (no per-script geometry in the design),
  but it was not visually checked.
- **The §1 conflict analysis** is by inspection of the spec source (the
  regex capture + the three assertions), not by running a red suite — the
  lane stopped before applying anything, so no red run exists.

## 13. Files for the parent's commit

- `reviews/polish/tabs-dense.md` (this report)
- one line in `docs/autopilot/CODE-REVIEW-NOTES.md` (the §1 adjudication
  request)

**Zero source files** — the tree is byte-identical at lane start for every
path except the two notes files. The apply-on-adjudication payload is §4.2
(scss diff) + §4.3 (assertion retarget), one edit + one spec change.
