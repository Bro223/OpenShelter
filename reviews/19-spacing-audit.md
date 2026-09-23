# 19 — Spacing audit by element role

**Audited.** 2026-09-23, `HEAD = 18cfefc`, clean tree at start. Every `margin*` / `padding*` /
`gap` / `row-gap` / `column-gap` declaration in the frontend styles — `frontend/src/styles.scss`
plus all 36 component stylesheets under `frontend/src/app/**` (37 `.scss` files total;
`frontend/src/vendor/**` excluded — vendored bytes, the same exemption the colour guards use) —
413 declarations, each read in its selector + template context and grouped by **role**: the same
*kind* of thing in the same *relationship* (a badge after text, buttons in a row, a form field
after its label, a panel title above its content, a note under a field, an action row under
content, a list row's internal padding, …). The owner's trigger: he edited a margin on one page
(the admin hidden/dismissed badge, `18cfefc`) and separately saw the same element spaced
differently elsewhere.

**Result.** 44 roles enumerated — **9 inconsistent** (13 declarations fixed, listed in
§4) and **35 verified consistent** (no change, §3) — plus the literal/fallback class the
guard polices. **15 deliberate exceptions kept** with their reason stated (§5) — a spacing
system with no deliberate exceptions is one nobody thought about. One guard added: a spacing-literal rule in `frontend/src/app/design-tokens.spec.ts` fails
the build when a spacing literal appears in a stylesheet, with a stated allow-list and a
matched-count floor (§6). Nothing was committed; the parent gates.

**The scale** (`frontend/src/styles.scss:229-241`, read from the token file, not copied):
`--space-2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 32 / 48` px — a 2px grid. The audit
used only these values; no token was invented and the scale itself was not touched.

---

## 1. Method

1. `grep` every spacing declaration across the 37 non-vendor `.scss` files (413 hits), then read
   each hit's selector block **and its template usage** — a value only means something relative
   to what the element sits next to, so role = (element kind) × (adjacency), not file.
2. Grouped by role; for each role collected the set of values in use and every file using each.
3. A role with **one value** across all instances = consistent. A role with **several values** =
   inconsistent, unless the values map to a *reason* (a size hierarchy, a component type, a
   surface rhythm) — then the difference is kept and the reason is written down here and in the
   stylesheet comment.
4. Fixed inconsistencies to the value the role already uses in the majority of its instances (or
   to the same-class/same-card sibling where the role is a pair). Every fix is a one-line value
   change to an existing token — no new tokens, no layout structure touched.

Two measurement notes (numbers below are measured on this tree, not quoted from any report):
the compiled-declarations scan of all 37 files (the same mechanism the guard uses) sees **641**
spacing declarations — more than the 413 raw lines because `_admin-shared.scss` is a partial
`@use`d by each admin panel, so its declarations appear in every consumer's compilation. The
guard's floor is set against the 641, see §6.

---

## 2. Roles found inconsistent — and fixed

Values as `vertical/horizontal` or the single effective gap; "fixed" = the value after this
pass (file:line at this pass's working tree).

| # | Role (kind × adjacency) | Values found (instances) | Files (per value) | Verdict / action |
|---|---|---|---|---|
| 1 | **Panel/card title above its content** (text-xl/2xs title → first content line) | `space-8` (5×), `space-6` (1×), `space-12` (2×) | 8: account `.panel-title`, consent `__title`, a11y `__title`, edit-not-found `__title`, legal `h2`, guidance-body `h2`. 6: verify `.panel-title`. 12: edit-unavailable `__title`, site-texts-block `__heading`, translations `__heading` | **Inconsistent → fixed.** Same class, two values: verify `.panel-title` `space-6`→`space-8` (`account/verify-page.scss:54`). Sibling card idiom, two values: `.edit-unavailable__title` `space-12`→`space-8` (`shelter/submit-shelter-page.scss:106`). The two `space-12` admin headings are **kept** — see exception E2. |
| 2 | **Stacked-panel gap** (panel/card → next panel/card in the same page column) | `space-16` (3×), `space-20` (1×) | 16: verify `.verify-panel`, site-texts `.site-texts-block`, guidance `.admin-editor`. 20: account `.change-panel` | **Inconsistent → fixed.** `.change-panel` `space-20`→`space-16` (`account/account-page.scss:12`) — the one outlier; the other three panels and the account page's own `.profile-error` block all sit at 16. |
| 3 | **Buttons in a row** (action-row gap, 48px targets) | `space-8` (11×), `space-10` (2×), `space-12` (3×) | 8: detail `.report-actions`/`.band-picker`/`.open-status-picker`, contrib `.contrib-row__actions`/`.contrib-actions`, admin queue/cell/reason/actions, `.admin-guidance-move`, guidance-editor `__actions`, map `.map-page__actions`. 10: `.panel-actions` (account + verify). 12: `.site-texts-actions`, consent `__actions`, a11y `__footer` | **Inconsistent → fixed.** `.panel-actions` `space-10`→`space-8` (both pages: `account-page.scss:138`, `verify-page.scss:69`); `.site-texts-actions` `space-12`→`space-8` (`admin/site-texts-panel.scss:112`). Dialog footers **kept** at 12 — exception E1. |
| 4 | **Form field label above its control** | `space-4` (6×), `space-6` (2×) | 4: global `.field label`, guidance `__field-caption` + hero labels, site-texts `__locale`/`__url span`. 6: submit `.location-label` ×2 | **Inconsistent → fixed.** `.location-label` `space-6`→`space-4` (×2: `submit-shelter-page.scss:177,211`). Compact gap-groups (admin-reason 8, anchor-search 6, guidance-language 2) are container-rhythm, not label margins — E5/E6. |
| 5 | **Muted note under a field** (helper line, block flow) | `space-6` (7×), `space-4` (1×) | 6: `.field-note` (register, reset, account, verify), submit `.location-note`/`.location-attribution`/`.location-hint`. 4: guidance-editor `.field-note` — whose own comment says "the same copy shape as the auth pages" | **Inconsistent → fixed.** guidance-editor `.field-note` `space-4`→`space-6` (`admin/guidance-editor.scss:51`). The global `.field-error` stays at 4 — E7. |
| 6 | **Key/value row internal padding** (label|value rows separated by a hairline, `padding X 0`) | `space-12 0` (2×), `space-8 0` (1×) | 12: account `.contact-row`, site-texts `.site-texts-row`. 8: account `.identity-row` — inside the very panel whose contact rows are 12 | **Inconsistent → fixed.** `.identity-row` `space-8 0`→`space-12 0` (`account/account-page.scss:46`). (The admin **table** cell padding `8/12` is a different role — table cells, single source `_admin-shared.scss`.) |
| 7 | **Status pill padding** (non-interactive chips: verified chip, CTA chip, level chip) | `space-6 space-12` (2×), `space-4 space-10` (1×) | 6/12: account `.contact-chip--cta`, verify `.level-chip`. 4/10: account `.contact-chip--verified` — in the same row as its `--cta` sibling | **Inconsistent → fixed.** `.contact-chip--verified` `space-4 space-10`→`space-6 space-12` (`account/account-page.scss:103`). Interactive **filter chips** (global `.chip` `6/10` + 48px target) are a control role — §3. |
| 8 | **48px touch-target control padding** (secondary input/select with the 48px minimum) | `space-6 space-10` (1×), `0 space-4` (1×) | 6/10: map `.anchor-search__input` (min-height `space-48`). 0/4: admin `.admin-guidance-language select` (min-height 48) — cramped against the same idiom | **Inconsistent → fixed.** the select `0 space-4`→`space-6 space-10` (`admin/guidance-panel.scss:40`). The pagination's `6/8` size select has **no** 48px target — a smaller toolbar role, kept (E8). |
| 9 | **Action row's top gap** (action/link row under its content) | effective `space-8` (11×), effective `space-12` (1×) | 8: contrib actions ×2, guidance-editor actions, translations `__add`, submit-success `__links`, edit-not-found `__links`, hero picker/upload/import, confirm-strip, pulse-empty, recent-reports. 12: admin `.admin-queue-row__actions` = parent gap 8 **+** own `margin-top: space-4` | **Inconsistent → fixed (double-count removed).** The extra `margin-top: var(--space-4)` deleted (`admin/_admin-shared.scss:97-103`) — the queue row is a `gap: space-8` flex column, so the gap owns the separation; the margin stacked on top of it to 12px. Same element, same row, now the same 8px. |
| 10 | **Spacing literals in margin/padding/gap** (guard target) | `0.5rem` inside `var(--space-4, 0.5rem)` ×2; `-1px` ×1 | 0.5rem: `admin/guidance-editor.scss:34`, `admin/guidance-order-list.scss:14`. −1px: a11y visually-hidden legend | **Inconsistent → fixed.** Both fallbacks stripped to `var(--space-4)` — the fallback was *wrong* as well as dead: the token is 4px, the fallback 8px. `margin: -1px` **kept** — allow-list exception E9. |

**Total: 13 declaration changes across 8 files** (the full list with file:line is §4).

---

## 3. Roles verified consistent (no change)

One value across every instance measured. "×" = number of instances read.

| Role | Value | Files (instances) |
|---|---|---|
| Badge inline in a text flow (margin, house style since `18cfefc`) | `space-4` | admin `.badge` margin-right, `.badge--hidden` margin-left (the owner's fix), `.admin-hint` margin-left (×3) |
| Dialog family — title / body / options / footer gap / padding / overlay padding | `8 / 16 / 16 / 12 / 24 / 16` | consent + a11y dialogs agree pair-for-pair (×2 each) |
| Page-level section gap (top-level page column) | `space-20` | shelter-detail, submit-page, guidance-list, guidance-detail (×4) |
| Detail header block (title row + meta lines) | `space-8` | shelter-detail `__header`, guidance-detail `__header` (×2) |
| Main form input/textarea padding | `space-8 space-12` | global `.field input`/`textarea`, site-texts inputs ×2, submit location inputs ×2, admin search field (×6) |
| Sub-line directly under a title (name→address, title→slug) | `space-2` | map `.shelter-row`, admin `.admin-cell__name-body`, `.admin-guidance-title__text` (×3) |
| Radio/checkbox + label gap | `space-8` | detail `.report-option`, submit `.checkbox-field`, guidance `__check-label` (×3) |
| Filter-chip row gap (interactive chips, 48px targets) | `space-6` | admin `.admin-chips`, map `.filter-trust` (×2) |
| Filter chip (the control) padding | `space-6 space-10` | global `.chip`, single source (all chip instances) |
| Badge pill padding | `space-2 space-4` | global `.badge` / `.contrib-badge`, single source (all badge instances) |
| Field-error under a control (the global form idiom) | `space-4` | global `.field-error` — every form uses the class, one source |
| Admin table cell padding | `space-8 space-12` | `_admin-shared.scss` `th,td` — single source for all admin tables |
| Banner (severity) padding + gap to content | `space-10 space-14` / `mb space-16` | global `.banner` — single source, all banners |
| Banner-like page notice above content (`.profile-error`, `.admin-search` outside a toolbar) | `space-16` | account, admin surface (×2 + toolbar zero documented) |
| Pagination: row gap / top gap / size-select padding | `space-12 / space-24 / space-6 space-8` | `pagination.scss` — single source, all paged lists |
| Out-of-range list state stack gap | `space-12` | `list-state.scss` |
| "Auth links" under the form (centred) | `space-18` | login (×2), register, reset (×4) |
| Standalone card page top gap (single-card pages) | `space-32` | register, reset, legal (privacy + terms) (×4) |
| Multi-panel page top gap | `space-16` | account, verify (×2) |
| Card padding hierarchy: modal / large panel / card / compact card / inline note | `24 / 18-20 / 16 / 12( /16) / 8-12` | consent+a11y 24; change+verify panel 18/20; site-texts-block, admin-editor, media-upload 16; queue-row, guidance-post, success/edit cards, location-field, contrib-info, fallback 12; community-warning, private-note, proof-note, confirm-strip 8/12 — a monotone size hierarchy, §5 E3 |
| Prose rhythm inside a document (p → p) | legal `space-8` (section `space-24`) / article `space-12` (h2 `20 above / 8 below`) | legal pages ×2 (one contract, stated in the css); map `__how` + guidance-detail body — each document internally consistent, §5 E10 |
| Map layout / sidebar / CTA stack (page-local chrome) | layout `space-20` / sidebar `space-12` / actions `space-8` | map-page — single file, internally uniform |
| Legend row gap / legend entry padding / swatch→label gap | `space-4 / space-4 space-6 / space-6` | map legend — single source, one instance each |
| Address-search result list (list gap / result padding) | map: `space-4` / `space-8 space-10`; submit: `space-6` (li+li) / `space-8 space-12` | map `.anchor-search__results` (two-line `text-sm` items, inner gap `space-2`); submit `.address-results` (one-line `text-md` badge rows) | Same element on two surfaces — **kept per E15** (compact 48px sidebar search group vs full-width form input), not flattened; one line per side if the owner wants one value |
| Fact-list (definition rows) gaps | row `space-10` / value `space-4 space-8` / list `space-8` | shelter-detail `.fact-list` — single instance |
| Meta-item gap inside a row (public surfaces) | `space-6` | contrib `__meta`, legend-item, level-chip (×3) |
| Meta-item gap inside a row (admin surfaces) | `space-8` | admin queue `__info`/`__meta`, translations `__row` (×3) — the admin surface is uniform at 8 where the public side is uniform at 6; the split is by surface, documented E6 |
| Shell chrome (header gap/padding, nav link, footer notice/meta, menu panel, burger) | `12/24 + 12/20`; nav `4/6`; footer `6/20/16` + meta `6/32` + `16/20/0`; panel `12` + `8/20/16`; row seams `space-4` | page-shell — single file, internally uniform (the narrow-width tap padding `16/12` is the documented 44px+ footnote target) |
| Report gauge: figure gap / ends padding / caption gap | `space-12 / space-4 space-8 0 / space-4` | report-gauge — single source, all gauges |
| Zeroing / centring idioms (`margin: 0`, `padding: 0`, `margin: 0 auto`, `margin-left: auto`, `margin-inline: auto`) | `0` / `auto` | universal — the reset idiom, guard allow-list |
| Admin page inset / tab row (page chrome for the wide-cap route) | `.admin` padding `space-8 space-16`; tabs gap `space-8` + `pb space-8` + `mb space-16` | admin-page — single source for the /admin shell |
| Guidance card grid gap / card gap / card padding | `space-16 / space-12 / space-12` | guidance-list — single source |
| List-row gap by row weight | dense inline `space-6` (address-results li+li), card rows `space-8` (shelter-row, recent-reports, translations list), card list `space-12` (admin-queue, pulse-gauges), card grid `space-16`, page section `space-20` | a monotone weight hierarchy, §5 E4 |
| Level-chip row gap (status chips) | `space-10` | verify `.level-chips` — the status-chip row role vs the filter-chip row (6), E6 |
| `.field` bottom margin (the field's own space) | `space-16` | declared once globally; every `.field` on every page (×~20) — the container-gap mechanism below adds the local rhythm, §5 E11 |

---

## 4. The fix list (file:line, working tree at this pass)

13 declarations, 8 files. Old → new:

| # | File:line | Declaration | Old → New | Role |
|---|---|---|---|---|
| 1 | `frontend/src/app/features/account/verify-page.scss:54` | `.panel-title` margin | `space-6` → `space-8` | title above content |
| 2 | `frontend/src/app/features/shelter/submit-shelter-page.scss:106` | `.edit-unavailable__title` margin | `space-12` → `space-8` | title above content |
| 3 | `frontend/src/app/features/account/account-page.scss:12` | `.change-panel` margin-bottom | `space-20` → `space-16` | stacked-panel gap |
| 4 | `frontend/src/app/features/account/account-page.scss:138` | `.panel-actions` gap | `space-10` → `space-8` | button row |
| 5 | `frontend/src/app/features/account/verify-page.scss:69` | `.panel-actions` gap | `space-10` → `space-8` | button row |
| 6 | `frontend/src/app/features/admin/site-texts-panel.scss:112` | `.site-texts-actions` gap | `space-12` → `space-8` | button row |
| 7 | `frontend/src/app/features/shelter/submit-shelter-page.scss:177,211` | `.location-label` margin-bottom ×2 | `space-6` → `space-4` | label above control |
| 8 | `frontend/src/app/features/admin/guidance-editor.scss:51` | `.field-note` margin | `space-4` → `space-6` | note under field |
| 9 | `frontend/src/app/features/account/account-page.scss:46` | `.identity-row` padding | `space-8 0` → `space-12 0` | key/value row |
| 10 | `frontend/src/app/features/account/account-page.scss:103` | `.contact-chip--verified` padding | `space-4 space-10` → `space-6 space-12` | status pill |
| 11 | `frontend/src/app/features/admin/guidance-panel.scss:40` | language `select` padding | `0 space-4` → `space-6 space-10` | 48px control |
| 12 | `frontend/src/app/features/admin/_admin-shared.scss:97-103` | `.admin-queue-row__actions` margin-top | `space-4` → (removed; parent gap owns it) | action-row top gap |
| 13 | `frontend/src/app/features/admin/guidance-editor.scss:34` + `guidance-order-list.scss:14` | `var(--space-4, 0.5rem)` ×2 | → `var(--space-4)` | literal fallback (also wrong: 8px ≠ 4px) |

Each fix's stylesheet now carries a one-line comment naming the role and its siblings, so the
next editor sees the contract, not just the value.

---

## 5. Deliberate exceptions kept (do not flatten)

These are where the same *word* covers two *roles*. Each is kept because the difference is the
point — flattening one would either break a documented layout or erase a size step.

- **E1 — Dialog footers keep `space-12`.** The consent and a11y dialog action rows are
  `space-between` footers with a footnote on one side and 48px buttons on the other — a
  different component from an in-card action row (8px). The two dialogs agree with each other.
- **E2 — Admin list headings keep `space-12`** (site-texts-block `__heading`, translations
  `__heading`). They sit above **bordered row lists** whose rows are `space-12`-padded — the
  heading gap matches the row rhythm it introduces. Public panel titles sit above plain text and
  use `space-8` (E-role 1). Same word "heading", two adjacencies.
- **E3 — Card padding is a size hierarchy, not a single value:** modal `24` > large panel
  `18/20` > card `16` > compact card `12(/16)` > inline note `8/12`. Monotone, one step per
  size class; a card's padding should grow with the card it frames.
- **E4 — Row gap follows row weight:** dense inline results `6` < card rows `8` < card lists
  `12` < card grid `16` < page sections `20`. Heavier rows need more air; the scale carries all
  five steps.
- **E5 — Compact gap-groups own their rhythm instead of per-element margins:**
  `.admin-reason` (label+textarea+error+actions, gap 8), `.map-page__anchor-search`
  (label+row+attribution+error+results, gap 6), `.guidance-detail__header` (gap 8),
  `.report-form` (gap 10), `.submit-form` (gap 4) — the container's gap is the single spacing
  source and the children carry no vertical margins of their own. This is the "consistent by
  other means" the owner asked for: same group, one number, no double counting (fix #12 removed
  the one place that had double-counted).
- **E6 — Surface rhythm:** meta-item gaps are `space-6` on public surfaces and `space-8` on the
  admin surface (each side uniform across all of its rows); status-chip rows `10` vs filter-chip
  rows `6` (status chips have no 48px target and read looser); the `.guidance-language`
  label+select group is `gap: space-2` because the label and the control read as ONE unit above
  a 420px-wide table, not as a field pair.
- **E7 — `.field-error` stays `space-4`, notes sit `space-6`.** The error is the correction that
  points at the control (tight); the helper note is independent context (looser). The map's
  search error and the admin reason error ride their group's gap (E5) — same visible separation,
  owned by the group.
- **E8 — The pagination size-select keeps `space-6 space-8`:** a compact toolbar select *without*
  the 48px minimum — a smaller control role than the 48px touch-target inputs (`6/10`). Giving
  it the 48px idiom would make the paging row as tall as a form row.
- **E9 — `margin: -1px`** (the a11y dialog's visually-hidden fieldset legend) and
  `margin-top: calc(var(--space-8) * -1)` (the selected shelter row's join to its detail link)
  are negative offsets — the guard's stated allow-list, not drift.
- **E10 — Prose rhythm is per-document:** the legal pages are a dense static document
  (p `8`, section `24`); the guidance article and the map's "how" block are readable articles
  (p `12`, heading `20 above / 8 below`). Each document is internally consistent; the two
  densities are different document types, not drift.
- **E11 — The `.field` owns its `space-16` bottom margin; gap containers add local rhythm on
  top** (effective 20 in `.submit-form`, 24 in the guidance editor, 26 in `.report-form`,
  16 in the block-flow auth/account/verify forms). The *element* is spaced identically
  everywhere — its own declaration is one global line; the *container* is a different element
  with its own rhythm (E5). The owner's "same element, same spacing" holds for the element; the
  container arithmetic is uniform per container type and commented at each site.
- **E12 — Standalone card pages sit `space-32` below the header; multi-panel pages sit
  `space-16`.** A single card needs the extra top gap to sit optically centred; a long
  panel page starts higher. (Login is fully centred by its flex host and has no top margin.)
- **E13 — Row density:** the map sidebar's `.shelter-row` (a dense 344px list, many rows) is
  `space-10 space-12` padded; standard bordered cards (admin queue row, guidance card) are
  `space-12`. Dense list vs standard card — the same hierarchy logic as E4 at the padding level.
- **E14 — The a11y option rows** (`.a11y-option`: radio + label + description, `gap 12`,
  `padding 12/16`, `mb 10`, 2px selected-state border) are multi-line option cards, not the
  single-line radio rows of the report form (gap 8, 48px minimum). Bigger target, bigger air.
- **E15 — The address-search result list is per-surface.** The map's sidebar anchor search is
  the compact member of the 48px search-group family (E5): two-line `text-sm` items, list gap
  `space-4`, result padding `space-8 space-10`. The submit page's location search is a
  full-width form input: one-line `text-md` badge rows, list gap `space-6` (li+li), result
  padding `space-8 space-12`. Same element kind (an autocomplete suggestion row), two contexts —
  the same compact/full distinction E8 applies to controls. Kept, stated, not flattened.

---

## 6. The guard — `frontend/src/app/design-tokens.spec.ts`

New describe block at the file's end (`design tokens — spacing literals`, line 1918 at this
pass's working tree — appended, so the existing doc anchors into this file at lines 64-66,
73-88, 813-817, 871, 907 do not move). It extends the design-token spec's existing scan
machinery: the same `compiledDeclarations` walker the Wave 15 border guard uses, the same
`collectScss` file walk (vendor-excluded), the same leaflet head-filter for the `@use`d
vendored stylesheet inside styles.scss.

**Rule.** Every compiled declaration whose property is in the margin/padding/gap family
(shorthands + all physical and logical/RTL longhands, 23 properties) is tokenised
(paren-depth-aware) and every token must be on the allow-list. A violation fails the build
naming the file, the selector, the declaration and the offending token.

**The allow-list, stated** (deliberately narrow — "a guard with no allow-list will be disabled
within a week; one that flags legitimate hairlines gets ignored"):

1. `0` (any unit) and `auto` — the UA-reset and the centring idioms (`margin: 0 0 var(--space-8)`,
   `margin: 0 auto`, `margin-left: auto`).
2. `1px` / `2px` — the documented line-weight family; in spacing properties it is the hairline
   offset (the visually-hidden `margin: -1px`).
3. Negative values — offsets that pull an element onto its neighbour (`-1px`, negative joins).
4. Values wrapped in `calc()` / `clamp()` — derived geometry (the `calc(var(--space-8) * -1)`
   row join, the burger cross distance) where the math, not a scale step, is the point.
5. `%` / `em` / `ch` — relative measures where a relative measure is the correct unit.
6. `src/vendor/**` — vendored third-party bytes, excluded by `collectScss` (the same exemption
   the colour guards carry); inside styles.scss the `@use`d Leaflet rules are excluded by the
   `.leaflet-` head filter.

**Not allowed** (and therefore red): any other px number — `16px` is the value this guard
exists for; rem/pt/… measures; and `var()` **fallbacks** — the `:root` block always ships the
tokens, so a fallback never fires, and a fallback that differs from the token's value is a wrong
value (the two `var(--space-4, 0.5rem)` spellings were exactly that: 8px fallback on a 4px
token). A `var(--non-space-token)` in a spacing property is red too.

**Matched-count floor: 500.** Measured on this tree: **641** spacing declarations checked
(413 raw lines + 228 from the `_admin-shared` partial inside each of its `@use`ing panels'
compilations — a restructure of the partials must re-measure and re-declare the floor on
purpose). A walker that matched nothing — broken parse, renamed props, a reformat that hollowed
the stylesheets — fails the floor instead of "passing" for the wrong reason. The same
matched-count-floor discipline every other guard in this repo carries.

**Red proof (run at this pass, throwaway file deleted afterwards).** Added
`src/app/spacing-literal-red-proof.scss` containing `margin-bottom: 16px` and ran the spec:

```
× no spacing literal in any app stylesheet (margin/padding/gap ride the --space-* scale)
AssertionError: a spacing literal off the --space-* scale
+ "app/spacing-literal-red-proof.scss :: .spacing-red-proof { margin-bottom: 16px }
   — 16px — a px value off the --space-* scale"
```

The failure names the file and the value. The file was deleted; the spec is green again
(147 tests in the file, 146 before this pass — nothing deleted or weakened).

---

## 7. What this pass did not touch

- `frontend/src/styles.scss` (the token block, global element styles) — already fully
  tokenised; unchanged, so the model document's anchors into it do not move.
- Theme colour tokens, the high-contrast and black-and-yellow blocks, the backend, vendored
  files, and all existing tests (the suite only grows by the one new guard).
- Line weights, radii, layout dimensions (map heights, sidebar width, `max-width` caps) —
  the existing documented literal exceptions of the token audit, out of spacing scope.
- The `.field-note` class-name collision (submit uses it *above* a field at `space-8`, the
  other four pages *below* at `space-6`): the values are each correct for their role, but the
  name should be split (`field-hint` vs `field-note`) in a follow-up — flagged, not renamed
  here, because renaming a class touches templates beyond this pass's scope.
