# DESIGN-REVIEW — the design skill set widened, the pages audited, the unverified-pin residue removed

Lane: DESIGN-REVIEW (branch `code-review`, no commits — parent commits).
Scope read in full: `features/map`, `features/guidance`, `features/shelter`,
`features/account` (+ admin shell) — templates, styles, view models — plus the
global design surface (`styles.scss`, `core/theme-tokens.ts`, the three i18n
catalogs, shared components: page-shell, list-state, loading-indicator,
pagination, banner, consent-banner). Skills used: the vendored
`web-design-guidelines`, `accessibility`, `angular-developer` + the three new
`addyosmani/web-quality-skills` skills (§1).

## 1. Skill set — widened from `addyosmani/web-quality-skills`

The pack's six skills (found via `npx -y skills add <url> -l`; the already
vendored `accessibility` plus five candidates) were each fetched with
`timeout 300 npx -y skills use "https://github.com/addyosmani/web-quality-skills"
--skill "<name>"` (all exit 0, 2026-09-26) and read in full before the
keep/reject decision.

**Kept (3, now listed in `docs/skills/README.md` — index at 27 skills):**

| Skill | Lines | Why it is on-target |
|---|---|---|
| `performance.md` | 411 | The perf axis the audit lacked: field (RUM/CWV) + lab (trace) measurement before editing, before/after reporting. Drives the §4.5 perf pass. |
| `core-web-vitals.md` | 240 | LCP/INP/CLS per-metric budgets and causes — the CWV axis the task named. |
| `web-quality-audit.md` | 221 | The whole-page audit spine (perf, a11y, SEO, best practices, agentic browsing) used to structure §4. |

**Rejected (2, fetched + read, then deleted from `docs/skills/` per the index
convention that only listed skills are kept on disk):**

| Candidate | Lines | Reason for rejection |
|---|---|---|
| `best-practices.md` | 492 | Its security section is the spine and points at an un-vendored `references/SECURITY.md` (the run's rule: a rule that cannot be satisfied is reported, not worked around). Security is already covered by the vendored `security-review` (methodology) + `springboot-security` (framework-specific); the a11y/perf remainder is a subset of the kept `accessibility` + `web-quality-audit`. |
| `seo.md` | 421 | Off-target for this run: there is no SEO lane in the code-review run. Its design-relevant items (semantic structure, meta, image alt) are already covered by `web-quality-audit` + `accessibility`. |

No invented skills: every listed skill was actually fetched by its recorded
command. Index changes (`docs/skills/README.md`): count 24 → 27, the three rows
(with source/stars/line counts/commands + 2026-09-26 dates), the two rejection
rows in the documented-rejections table, the re-fetching date note, the
auxiliary-files note (`/tmp/skills-use-hZOMuA/performance`,
`/tmp/skills-use-TlYAV9/core-web-vitals`,
`/tmp/skills-use-9tpztJ/web-quality-audit`; `web-quality-audit` also routes to
`scripts/analyze.sh` + `../performance/references/MEASUREMENT.md`, not vendored
— the audit below is source-inspection path only), and the gate line
(27 files, 6 750 skill lines).

## 2. Safe fixes (applied)

Everything below is a spacing/scale/state/consistency correction on the app's
own existing scale — no new tokens, no behaviour, no theme-home change.

1. **The unverified-pin residue in `features/map/map-page.scss`** — the
   board-requested removal (`REMOVE-UNVERIFIED-PIN` → "map/scss lane"; no live
   lane owned it when this lane started, and `features/map` is in this lane's
   brief). Inside `.legend-swatch` (now 161–185):
   - deleted the "The verification TRIANGLE (.shelter-marker--user in
     styles.scss)" comment block — the triangle's pseudo-element drawing was
     deleted from `styles.scss` by commit `2022d6c`;
   - deleted `position: relative` — its only consumer was that triangle's
     absolutely-positioned pseudo-elements; no swatch element has any
     (verified: the legend renders only circle swatches + the anchor diamond,
     neither uses pseudo-elements);
   - deleted the `• triangle` inscription bullet and the "the triangle's edge"
     phrase from the intro;
   - deleted the dead override `&.shelter-marker--user { width: 10px; height:
     10px; }` — **grep proof**: `grep -rn "shelter-marker--user" src` shows the
     class survives only in `styles.scss:865` (the live map-marker rule) and in
     no template (the legend template renders registry/partial/full/reported/
     anchor swatches only — the deleted legend button was the override's only
     consumer). File 702 → 690 lines; the only CSS output change is the
     removal of the dead rule.
2. **The dead legend key `map.legend.unverified`** — the second
   board-requested removal (`REMOVE-UNVERIFIED-PIN` → catalog files, "cleanup
   for your next pass"; the catalog lane is done, this lane owns the audit).
   Removed the key + its comment block from all four catalog files
   (`core/i18n/messages.ts` −6 lines, `en.ts`/`et.ts`/`ru.ts` −5 each) and
   reworded the stale "triangle at one confirmed channel" comment on
   `partialVerified`/`fullVerified` (messages.ts + en.ts) to the current model
   (one channel = partial, two or more = full). **Grep proof**:
   `grep -rn "legend.unverified" frontend/src` → 0 hits after the edit
   (before: the four data files only — no template, component or spec
   referenced it). Key parity held: 6 `map.legend.*` keys per catalog, one
   shared order (the i18n parity/template-guard/catalog-identity specs are
   dynamic over the key set — no key-count or key-list pin exists).
3. **The one weak in-body hierarchy — `guidance-detail-page.scss` h2.** The
   stored guidance body's `h2` was `font-size: var(--text-lg)` (1rem, UA bold
   700) — 0.05rem above the body text, i.e. no perceptible step, while every
   app section title uses `--text-xl` + `--font-weight-title` (the
   `.section-title` idiom at `shelter-detail-page.scss:178-182`). Now
   `font-size: var(--text-xl); font-weight: var(--font-weight-title);` — both
   tokens pre-existing, no new token, no spec pin on the h2 (the detail spec
   pins only the `img` sub-rule and a nowrap ban). The one obviously weak
   hierarchy the brief allowed; nothing else on the audited surfaces is this
   weak (the rest of the scale is used per the idiom).
4. **The admin media-thumb CLS metadata mismatch — `media-panel.html`.** The
   thumbnail's CSS slot is 48×48 (`media-panel.scss:27-34`), the file's own
   comment says "sizes is the slot's fixed CSS width (48 px)", but the
   attributes were `width="40" height="40"` — the only img in the app whose
   width/height attributes do not match its fixed slot (the 40/56/72-px
   siblings in `guidance-order-list.html`/`guidance-editor.html` are all
   slot-exact). Now `width="48" height="48"`. The spec pins `sizes="48px"`
   only — the attribute values are not pinned.
5. **The current-state doc — `docs/agent/00-CURRENT-STATE.md` §1 "The trust
   ladder".** Three owed rewordings (each flagged on the board) plus the
   anchor shifts from fix 2:
   - table row "Unverified community … yellow **triangle**" → "Community (no
     depth) … plain yellow **circle**" (the triangle was removed by
     `2022d6c` — REMOVE-UNVERIFIED-PIN's report §109 owed this rewording to
     the anchor pass);
   - "the unverified triangle `.shelter-marker--user`" → "the default
     community circle … (the plain-circle rule + the owner-decision record)";
   - "The unverified yellow" → "The community yellow";
   - the "no grey" anchor re-pointed `en.ts:181-184` → `styles.scss:831-832`
     (the i18n comment the old anchor cited was deleted by fix 2; the marker's
     decision record carries the same phrase);
   - the WCAG bullet "the shape distinction carries depth … unverified =
     triangle" → "Depth is carried by hue, in words", citing the decision
     record `styles.scss:843-845` ("every remaining pair that shares a shape
     shares a hue too — partial vs full was already yellow vs green circles,
     never shape alone"); the anchor-diamond half of the bullet is unchanged;
   - the legend-filter section: "five tone entries (registry, user, …)" →
     "four tone entries (registry, partial, full, reported)", "the sixth
     legend entry" → "the fifth", + one clause stating the default tone has no
     entry (visible by default, never filterable);
   - the "derived on every read" bullet reworded per ERASURE-DEPTH-FIX's
     board entry (§8 of its report): live-author derivation + the V35
     orphan-snapshot semantics (verified: `V35__shelter_submitter_verification_snapshot.sql`
     is in the tree);
   - **anchor re-derivations from fix 2** (line shifts in the three catalogs):
     legend-copy citation `en.ts:177,179-180,185-186,190` →
     `en.ts:177,180-182,186`; the MACHINE DRAFT legend blocks
     `ru.ts:195-203` → `ru.ts:196-198`, `et.ts:189-197` → `et.ts:190-192`
     (each file lost 5 lines at the deleted key; the remaining MACHINE DRAFT
     block in each is the legend affordance line). Every re-derived citation
     was verified at the new lines (tokens present). `map-page.ts` /
     `styles.scss` / `legend-view.ts` citations are untouched — no file this
     lane edited is cited there beyond the above, and `styles.scss`
     line-alignment from `2022d6c` is preserved (I did not edit it).

**Not a fix (verified non-findings):** the `placeholder="DELETE"` on the
account delete arming input is functional (the component compares the literal
`'DELETE'` at `account-page.ts`); all admin panels carry full
loading/error/empty/out-of-range state coverage; all interactive controls on
the audited surfaces have hover + the global `:focus-visible` ring (the
documented `*:focus { outline: none }` + chrome-ring deviation is pinned and
owner-approved — recorded, not re-litigated); the guidance hero's missing
width/height attributes are the documented natural-size-unknown trade-off
(the list cards are aspect-boxed).

## 3. The audit — what the pages do well (so the fixes above are the residual)

Against the Vercel Web Interface Guidelines (re-fetched current list) + the
three new skills' checklists:

- **States:** every surface has loading / error / empty / out-of-range states
  (map list, guidance list + detail, submit, account panels, verify,
  contributions, all nine admin panels — `admin-state` + `list-state`
  verified panel by panel). Submit-disabled-during-load is the app-wide pinned
  convention (board, UX-A11Y-FIXES territory).
- **Spacing:** the 2px-grid scale holds everywhere on the audited surfaces
  (design-tokens spec polices it; FINISH-FE's unification is intact — the
  anchor-search results gap vs submit is the resolved one).
- **Theming:** the three theme homes (`styles.scss` :root, the high-contrast
  block, `BLACK_AND_YELLOW_TOKENS`) are name-set-identical (the parity spec
  pins it dynamically); this lane introduced no tokens, so lockstep is
  untouched by construction.
- **Images:** every img carries width/height + `sizes` matching its fixed slot
  (except the documented detail-hero trade-off) — CLS-bounded by construction;
  admin thumbs lazy-load, guidance list heroes are aspect-boxed.
- **Typography:** h1 1.6rem → section 1.1rem/650 → body 0.95rem with the
  muted-secondary idiom throughout; tabular numerals where digits update.

## 4. Findings — ordered by importance (proposals, NOT applied)

Look-changing or value-changing; each needs the owner's call.

1. **`how.sources` still describes the removed triangle** —
   `core/i18n/en.ts:85`: "…an unverified submitter shows a yellow triangle, a
   partially verified submitter a yellow circle…" (the ru/et twins carry the
   same claim). The triangle no longer exists; the current model is: default
   community marker (no depth) / yellow circle (one channel) / green circle
   (two or more). User-facing copy in three languages — native-review packet,
   not a lane edit. Already reported by REMOVE-UNVERIFIED-PIN; this lane
   re-verifies it stands.
2. **`.anchor-line__clear` is ~19px tall** (`map-page.scss:387-395`: 12px font
   + `padding: 0 var(--space-4)`, no min-height) — below WCAG 2.5.8's 24px
   target and far below the app's own 48px control rule. It is an inline pill
   in a sentence (the guideline's text-link exception is arguable). Fix if
   wanted: `min-height: var(--space-24)` + `display: inline-flex` centering.
3. **The admin tab row is 9 full-size ghost buttons** (`admin-page.html` tab
   bar, `_admin-shared.scss` `.admin-tab` 48px min-height, active = primary
   fill) — a heavy control for tab switching; a dense tab idiom (smaller
   controls, underline-active) would fit the minimalism. Look change.
4. **`.panel-title` (account-page.scss:26-29) lacks the title weight** — UA
   700 vs the app's `--font-weight-title` 650 idiom used by every other
   section title. One token, near-imperceptible; flagged for completeness.

**Reported-not-owned:** `styles.scss:873-875` — the partial/full marker
comment says "Shape + hue carry the depth — never colour alone (WCAG 1.4.1)",
which `2022d6c` made inaccurate (depth is now hue-only; the same file's
decision record at 843-845 says the opposite). A line-count-preserving
rewording is owed (the file is byte-anchored at 920 lines and belongs to the
done REMOVE-UNVERIFIED-PIN lane — filed on the board, not edited here).
Also standing on the board, referenced not re-raised: the hardcoded
"Capacity:" at `shelter-detail-page.html:182` (SIMPLIFY-CATALOGS), the
guidance hero `sizes="400px"` over-declaration (SIMPLIFY-GUIDANCE-FE /
UX-A11Y-FIXES, geometry-pinned), the submit-button-while-loading convention
(SIMPLIFY-SHELTER-FE), the verify-page verified+return panel lacking an h2
(adding one needs a new i18n key — owner).

## 5. Performance / CWV pass (the new skills applied)

Source-inspection only (the skills' live-baseline paths need a running app +
Lighthouse; not available to this lane — recorded as such per the run rule):

- No safe perf changes found or made. Catalogs are lazy chunks, guidance
  heroes use `fetchpriority="high"` + measured `sizes`, list heroes lazy-load
  inside aspect-boxed slots, admin thumbs lazy-load, the map's tile network is
  third-party (OSM) and the vendor dir is pinned — nothing on the audited
  surfaces is within this lane's safe-fix budget to change.
- The only CLS exposure is the documented detail-hero natural-size trade-off
  (no attributes; `max-height` bounded) — owner-documented, left as found.

## 6. GATE (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0 — 1582/1582, 65
  files** (baseline exact; no test deleted or weakened — the i18n parity,
  template-guard and catalog-identity suites pass with the key removed, the
  map legend suites pass with the scss residue out). Log:
  `/tmp/design-review-test.log`, exit: `/tmp/design-review-test.exit`.
- `npx ng build` → **exit 0** (pre-existing SCSS budget warnings only, all in
  other lanes' files). Log: `/tmp/design-review-build.log`, exit:
  `/tmp/design-review-build.exit`.
- `DocumentationFactsTest` (the backend guard over the doc anchors I
  re-derived) — focused run under the Maven lock:
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp test -Dtest=DocumentationFactsTest` →
  **exit 0 — Tests run: 21, Failures: 0, Errors: 0** (every re-derived
  citation, including the `styles.scss:831-832` / `:843-845` clause tokens and
  the new `en.ts:177,180-182,186` legend lines, verified by the guard itself).
  Log: `/tmp/design-review-docfacts.{log,exit}`.

## 7. Unverified

- `DocumentationFactsTest` is in the Maven suite (not this lane's FE gate); the
  re-derived citations were verified by hand at the new lines (each clause's
  tokens present). The authoritative run is on the board/parent's gate.
- The h2 bump and the thumb attributes are visual/attribute-level: jsdom
  asserts neither; they are verified by the gate + LSP-clean + the surrounding
  spec pins (no pin touched).
- The skill fetches were exit-0 and read in full; star counts (2 841) are
  2026-09-26 values, recorded as such in the index.

## 8. Files for the parent's commit

- `docs/skills/README.md` (index 24→27, rows, rejections, notes)
- `docs/skills/performance.md`, `docs/skills/core-web-vitals.md`,
  `docs/skills/web-quality-audit.md` (new, verbatim fetches)
- `frontend/src/app/features/map/map-page.scss`
- `frontend/src/app/core/i18n/{messages,en,et,ru}.ts`
- `frontend/src/app/features/guidance/guidance-detail-page.scss`
- `frontend/src/app/features/admin/media-panel.html`
- `docs/agent/00-CURRENT-STATE.md`
- this report + the notes-board entry.
(Not mine: the pre-existing prettier line-join in
`frontend/src/app/design-tokens.spec.ts` sitting in the working tree before
this lane started — flagged for the parent's commit, untouched here.)
