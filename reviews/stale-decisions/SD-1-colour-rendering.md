# SD-1 — colour, treatment and rendering paths

**Lane.** Colour and rendering auditor. Read-only. Working tree at HEAD `7cfed66`
(2026-09-22 09:42) plus the other lane's uncommitted `RegistryCsvParser` edits, which this
report deliberately ignores (confirmed via `git status --short`: the only modified files are
`src/main/java/ee/sheltermap/ingestion/RegistryCsvParser{,Test}.java` — out of scope for this lane).

**Method.** Source sweep of every `.scss`/`.html`/`.ts` under `frontend/src` (hex/rgb literal
sweep, `var(--color-*)` reference counts, badge/marker class census) + git history for the
decision chain + served-state fetches from the running frontend (`:5173`, `ng serve`, live
dev-compile of HEAD) and backend (`:8080`). Fetches are saved under
`reviews/stale-decisions/fetches-sd1/` (`index.html`, `styles.css`, `main.js`, `map.html`,
`chunks/*.js`, `api-shelters.json`).

---

## 0. Served state — what a user actually receives

| Surface | Served from | What the fetch shows |
|---|---|---|
| `:5173/` (`index.html`) | Vite dev server, live-compiled from `frontend/src` | Pre-paint B&Y token map carries **45** of the **46** `theme-tokens.ts` tokens — **`--color-verified` missing** (see F1). Served map byte-identical to `src/index.html` (diffed). |
| `:5173/styles.css` | same | `:root` **and** `[data-theme=high-contrast]` (line 705) both carry `--color-new: #ffd400` **and** `--color-verified: #ffd400` — the unified yellow is one value in both compiled token blocks. `.shelter-marker--new { background: var(--color-new) }` **with the ring hole** `.shelter-marker--new::after { … border-radius: 50%; background: var(--color-bg-surface) }` is compiled in. `.shelter-marker--full` solid fill, `--reported` solid `var(--color-reported)`, `--pick`/`--anchor` teal — all present. |
| `:5173/main.js` + 27 chunks | same | `markerTone` compiled exactly as source: `nonexistentReports > 0 → "reported"` → `verificationTone` shape → `NEW ? "new" : "user"` → `registry`. The map legend template in the served bundle carries **six** swatches (registry, user, partial, full, reported, anchor) — **no NEW swatch** (owner decision, see §1). The 8% `color-mix` map-row badge fills and the B&Y uniform-badge override (`html[data-theme=black-and-yellow] .badge.badge, … .contrib-badge.contrib-badge`) are in the served bundle. |
| `:5173/map` | same | SPA shell — the legend/markers are client-rendered by Leaflet/Angular, so the map *markup* is not in the HTML; the authoritative served artefact for it is the legend template + marker CSS above, both fetched. |
| `:8080/api/shelters?limit=5` | running JVM, **started 2026-09-22 00:07:58** | 200; rows carry `nonexistentReports` but **not** `inaccurateReports`. The process predates commit `7cbe178` (04:55, W2-B) which added that field — `target/classes/.../ShelterDto.class` (09:47) is newer than the process. The committed contract (source + `docs/api/openapi.json`) does carry the field (see F2). Admin endpoints were 401 (login rejected by the stale process); admin served state not independently verifiable. |

---

## 1. Core verification — the pin unification is genuinely one treatment, and the ring is single-sourced

Decision chain (git-verified):

1. `da0aa6b` (community-review-queue M0) introduced `--color-new: #f59f00` — **amber**, distinct from the verified yellow (decision text: `openspec/changes/community-review-queue/design.md` D5, and `proposal.md` "New community (amber)").
2. `022153e` (provenance taxonomy M6) added the five-provenance marker table (partner **gold `#d4a017`**, rejected **red `#c92a2a`**, inactive grey, NEW `#f59f00`/`#ffd43b` dark) — archived: `openspec/changes/archive/2026-09-16-shelter-provenance-taxonomy/design.md` D4.
3. `70ab59b` (Sep 17, "the owner's palette") replaced the marker values: registry `#0b5cad→#1769aa`, **pick `#d32f2f` (red) → `#0f6e6e` (darkened teal accent)** — this is where "red now means reported and nothing else" landed.
4. `c29b471` (W1, the owner-reported two-yellow fix) unified the family: light `--color-new #f59f00→#ffd400`, HC `#ffd43b→#ffd400`, B&Y `#ffb84d→#ffd400`, `--color-badge-new #f9e6b8→#fbf0bf`; added the `--color-new === --color-verified` name-set pin in `design-tokens.spec.ts`.
5. `7cfed66` (W4-D, "just landed") made the NEW pin a **ring** (BACKLOG-PLAN W4-D).

Computed values per path, **default (light) theme**, from served `styles.css` + served bundle:

| Path | Class / token | Computed value |
|---|---|---|
| Map marker, NEW row (no verified depth) | `.shelter-marker--new` (ring) | fill `#ffd400`, hole + 2px edge `#ffffff` |
| Map marker, 2+ verified channels | `.shelter-marker--full` | `#ffd400` solid |
| Map marker, 1 verified channel | `.shelter-marker--partial` | `#ffd400` triangle, edge `#ffffff` |
| Map marker, CONFIRMED, no depth | `.shelter-marker--user` | `#2e7d32` |
| Map marker, registry | `.shelter-marker--registry` | `#1769aa` |
| Map marker, reported | `.shelter-marker--reported` | `#c2410c` (untouched red-orange) |
| Map marker, pick / anchor | `--color-shelter-pick` | `#0f6e6e` (teal; diamond for anchor) |
| Legend swatches | reuse the exact marker classes (map-page.html:13-66; served template) | identical to markers — single-sourced |
| List badge, NEW (map/detail/admin//mine) | `.badge.badge--new` | fill `#fbf0bf`, text `#965a00` (map rows' base/user fills are the spec-pinned 8% mixes — documented page-local override) |
| Detail header / admin / /mine badge, CONFIRMED | `badge--user` | fill `#e8f3ea` (map: 8% mix), text `#2e7d32` |
| Detail static pin | `showShelter` → same `markerTone` | same classes as /map |
| /submit pick pin | `shelter-marker--pick` | `#0f6e6e` |

**HC theme** (served styles.css line 705 block): `--color-new = --color-verified = #ffd400`,
`--color-reported #ffa94d`, pick `#4dd0c4` — one yellow, red-orange distinct. **B&Y runtime
map** (theme-tokens.ts:117,121): `--color-new = --color-verified = #ffd400` — one yellow.
**B&Y pre-paint map** (index.html): `--color-new #ffd400` present, `--color-verified` absent — see F1.

**Ring single-sourcing: verified.** The ring exists in exactly one place —
`styles.scss:856` (`.shelter-marker--new` + `&::after` hole). Markers get it only through
`shelter-marker--${markerTone(...)}` (`leaflet-service.ts:181`, served in `chunk-16.js`).
The legend carries **no** NEW entry — the deliberate owner decision (map-page.html:16-22
comment; BACKLOG-PLAN W4-D: "the legend's deliberate absence of a NEW entry"); the spec test
"the NEW marker is a RING" (`design-tokens.spec.ts`) pins that any future swatch reusing the
class inherits the ring by construction, and that `--full`/`--reported` stay solid. List
surfaces carry the state as badge **text** ("Newly added"), not a second visual — documented
the same way. No second ring, notch or duplicate class exists anywhere in source or in the
served bundle (census of all `shelter-marker--*` classes: registry/user/partial/full/new/
reported/pick/anchor only).

Five-state check: newly-added (yellow ring + `badge--new`), community-checked (green),
verified depth (yellow triangle/circle), reported (red-orange), registry (blue) — each has
exactly one rendering per surface. "Under review" is not a live state (the taxonomy's
UNDER_REVIEW value was folded into `review_status NEW`; zero "under review" strings or
`UNDER_REVIEW` identifiers remain in `frontend/src`).

No hardcoded colour literals exist outside the three token homes (full sweep: every
hex/rgba hit in `frontend/src` is inside `styles.scss` token blocks, `theme-tokens.ts`,
`index.html`, or spec files/comments). No inline `style="…color…"` or SVG colour literals in
any template.

---

## Findings

### F1 — STALE-MED · B&Y pre-paint map defines `--color-new` but not `--color-verified` (one family, not the other)

- **Superseded decision.** The yellow-family unification (`c29b471`, owner decision; pinned in
  `design-tokens.spec.ts` "the unified yellow family is ONE value per theme") made
  `--color-new` and `--color-verified` one value, and the B&Y theme is a **runtime token map
  that must override every `:root` token** — the stated failure mode for a dropped name is
  exactly "a `:root` value leaks through" (theme-tokens.ts:9-14 doc; design-tokens.spec.ts
  name-set test comment: "the navy band surviving in the black-and-yellow theme is exactly
  this failure mode").
- **Artefact.** `frontend/src/index.html:34-75` — the pre-paint B&Y map sets 45 tokens;
  `--color-new: '#ffd400'` (line 52) is immediately followed by `--color-border` (line 53).
  `--color-verified` was never added (git: count 0 in every historical version of index.html).
  Served copy confirmed identical (`fetches-sd1/index.html`, 45 names, no `color-verified`).
- **Counter-check.** Exhaustive: the other B&Y path (`theme-tokens.ts:121`) **does** carry
  `--color-verified: '#ffd400'`, and ThemeStore re-asserts all 46 tokens at app boot — so the
  gap is bounded to the pre-paint window (first paint → bundle). Live `var(--color-verified)`
  consumers exist (styles.scss:783,827) but they resolve to the identical `:root` value
  `#ffd400` in B&Y, so **no visible effect today** — a verified pin paints the right yellow
  either way. The latent risk is real: any future re-split of the family (different
  `--color-verified` value) would flash the light-theme value on B&Y reloads, and
  `prepaint.spec.ts` lockstep only compares `--color-text` (its `BLACK_AND_YELLOW_PIN`), so the
  suite cannot catch the drift — the parity guard that would catch it
  (`design-tokens.spec.ts` name-set test) runs against `theme-tokens.ts`, not `index.html`.
- **Fix.** Add `'--color-verified': '#ffd400'` to the index.html map; strengthen
  `prepaint.spec.ts` lockstep to iterate every `BLACK_AND_YELLOW_TOKENS` key against the
  evaluated inline script's `styleValues` instead of pinning one token.
- **Blast radius / risk.** Two files, one line + one test loop. No visual change (values are
  equal today). Risk ≈ 0; the test change only widens an existing guard.

### F2 — STALE-HIGH (masked today by a stale running backend) · the "reported" pin/badge still runs on the pre-W2-B rule: `nonexistentReports` only, not the OR with `inaccurateReports`

- **Superseded decision.** Original: `shelter-trust-and-reports` D1/D6 (archived
  `openspec/changes/archive/2026-09-16-shelter-trust-and-reports/design.md`) — "orange dot (the
  single 'reported' affordance)" driven by non-existence reports only. Superseded by the owner
  requirement, `docs/autopilot/BACKLOG-PLAN.md:58-64`: "**both report kinds must turn the pin
  red**… an open report of either kind drives the reported state… dismissed stops counting."
  Implemented backend-side in `7cbe178` (W2-B, "both report kinds reported"):
  `src/main/java/ee/sheltermap/api/ShelterDto.java:127-134` adds `inaccurateReports` with the
  contract note "**the pin/badge logic is the OR of the two**"; same field in
  `AdminShelterDto.java:66`; committed `docs/api/openapi.json` (lines 177, 1202) already
  documents it.
- **Artefacts still carrying the old rule (all read-only-verified, no `inaccurateReports` reference anywhere in `frontend/src` — zero grep hits):**
  - `frontend/src/app/shared/leaflet-service.ts:72` — `markerTone`: `if (shelter.nonexistentReports > 0) return 'reported'` — the pin.
  - `frontend/src/app/shared/shelter-copy.ts:298` — `hasReports()` (badge visibility gate) and `:394` `reportedBadgeText(shelter.nonexistentReports)` (the "Reported (n)" count) — map row `map-page.html:317` and detail header `shelter-detail-page.html:42` both feed it `nonexistentReports` only.
  - `frontend/src/app/features/admin/shelters-panel.html:125` — the admin table's Reports column renders `{{ row.nonexistentReports }}`.
  - `frontend/src/app/core/models.ts:400` / `:573` — `ShelterDto` / `AdminShelterDto` omit the field entirely, so even a new backend's payload is silently dropped.
- **Counter-check.** Exhaustive: `grep inaccurateReports frontend/src/` → **no live FE caller**.
  The FE contract spec (`models-contract.spec.ts:135-168`) checks FE-fields ⊆ OpenAPI
  properties only (one direction), so no guard fails. Served state: `fetches-sd1/api-shelters.json`
  (5 rows) carries **no** `inaccurateReports` — but that is because the running JVM
  (started 00:07:58) predates the DTO change (commit 04:55), not because the contract lacks it.
  Hence severity HIGH for the committed source (a shelter with open inaccurate reports and
  zero non-existence reports will look clean on the map + badge + admin column as soon as the
  current backend is restarted), explicitly masked *today* by the stale process.
- **Fix (propose-and-wait — one product decision inside).** Add `inaccurateReports?: number`
  (optional — old-backend safety, the `submitterVerification` idiom) to both FE DTOs; OR the two
  in `markerTone`/`hasReports`; decide which count the badge shows (sum vs. the driving subset
  — the contract note does not settle it). Update `leaflet-service.spec.ts`,
  `shelter-copy.spec.ts`, and the admin column.
- **Blast radius / risk.** `models.ts`, `shelter-copy.ts`, `leaflet-service.ts`,
  `shelters-panel.html`, `map-page.html`, `shelter-detail-page.html` (comment), 3 spec files.
  Touches the public map + detail + admin surfaces; the count semantics in the badge copy are
  an owner call — flag for the merging pass as **propose-and-wait** on the count, fix-now on the OR.

### F3 — STALE-MED · `badge--rejected` has no admin rule: the admin shelters table paints REJECTED rows with the registry tint, `/mine` paints them danger

- **Decision (current, single-sourced).** `shelter-copy.ts:158-172` (`communityBadgeClass`):
  "REJECTED keeps the danger one… Applied on every surface that renders the badge (map row,
  detail header, **admin list**, /mine)." The only rule for the class:
  `contributions-panel.scss:93` (`.contrib-badge.badge--rejected` = `--color-danger-bg` +
  `--color-danger-border` + `--color-danger`).
- **Artefact.** `frontend/src/app/features/admin/shelters-panel.html:106` renders
  `<span class="badge" [ngClass]="communityBadgeClass(row)">` — for a rejected USER row
  (REJECT sets `review_status=REJECTED` **and** `status=INACTIVE`,
  `AdminModerationService.java:454-479`; INACTIVE rows are in the default admin list — the
  template itself dims them via `admin-row--hidden`) the class resolves to `badge--rejected`,
  which has **no** rule in `_admin-shared.scss` (census: only `--hidden/--inaccurate/
  --published/--draft`) nor in `styles.scss` — so it falls through to the base
  `.badge` fill (`--color-badge-registry #e2edf7` + blue `--color-shelter-registry` text).
  The moderator reads "Rejected" in a pill that is visually identical to "Päästeamet
  registry". The B&Y theme masks it (uniform badge ruling), light + HC show it.
- **Counter-check.** `git log -S "badge--rejected"` over the admin directory + `styles.scss`:
  no rule ever existed there — this is a never-written rule for the second surface, not a
  deleted one. No other admin-scoped `badge--rejected` rule exists anywhere (full grep:
  contributions-panel.scss:93 only). Live caller: `shelters-panel.html:106` (unconfirmed rows
  in that table are NEW, not REJECTED, but the shelters tab lists them all).
- **Fix.** Add `&.badge--rejected { background: var(--color-danger-bg); border: 1px solid
  var(--color-danger-border); color: var(--color-danger); }` to the `.badge` block in
  `_admin-shared.scss` (mirrors the /mine rule; the danger pair is already
  contrast-pinned in `design-tokens.spec.ts`).
- **Blast radius / risk.** One file, ~4 lines; only admin-visible; no token or name-set impact.
  Risk ≈ 0.

### F4 — STALE-LOW · dead token `--color-accent` (a decision that was removed; the selected-state colour now lives in `--color-shelter-pick`)

- **Decision.** Selected/active state = teal accent (owner's palette, `70ab59b`: pick pin
  red → teal). When `--color-shelter-pick` became the pin's own token, `--color-accent` lost
  its consumer; `:root`'s own comment now routes the decision: `--color-shelter-pick: #0f6e6e;
  /* selected-point pin = the accent … */` (styles.scss:173).
- **Artefact.** Declared in four homes, referenced in zero: `styles.scss:52` (`#0f6e6e`),
  `styles.scss:348` (HC, `#4dd0c4`), `theme-tokens.ts:85`, `index.html:42` — and **0 `var()`
  references** in the entire `frontend/src` tree (machine count; the full zero-reference token
  list is `--color-accent` + `--bp-narrow`, the latter a documented exception).
- **Counter-check.** Exhaustive `var(--color-accent)` sweep: none. It is **not** in the
  design-tokens name-set sample list either, but the HC/B&Y name-set **equality** tests force
  it to stay declared in all three blocks as long as it exists in `:root` — so it can't be
  removed from one theme without the others.
- **Fix.** Delete from all four homes in one change (the name-set tests make that mandatory).
- **Blast radius / risk.** Four files, four lines, zero visual effect. Slightly awkward for
  batched merging (two lanes could touch theme-tokens.ts/index.html) — map to one fix owner.

### F5 — STALE-LOW · comments still narrating the superseded treatments (three clusters)

No visible effect (prose only), but each one is a superseded decision still being read by the
next engineer — the same class as the owner-reported pin bug, minus the pixels.

1. **"NEW is amber" survived the unification** (decision: W1 unification, `c29b471`; the
   unified yellow is one value with `--color-verified` and the NEW pin is a ring):
   - `frontend/src/app/core/models.ts:23` — "NEW rows are public IMMEDIATELY (amber "just added" treatment…)"
   - `frontend/src/app/core/models.ts:407` — "(amber/green marker + "Newly added" / "Community-checked" badge)"
   - `frontend/src/app/features/map/map-page.ts:139` — "registry blue, community NEW amber, community CONFIRMED green"
   - `frontend/src/app/features/shelter/shelter-detail-page.html:17` — "NEW = "Newly added" amber, CONFIRMED = "Community-checked" green"
   - `frontend/src/app/features/account/contributions-panel.scss:76` — "the /mine pill — NEW amber, REJECTED danger, CONFIRMED green"
   - `frontend/src/app/features/account/contributions-panel.ts:123` — "The trust badge tone: NEW amber, REJECTED danger, CONFIRMED green"
   (Counter-check: the W1 commit updated the *same* wording in `map-page.html` and the
   styles.scss comments but missed these six — they are the residue, not a separate decision.)
2. **The old red pick pin in the spec's own comment** (decision: owner's palette `70ab59b`,
   pick red `#d32f2f` → teal; HC brightened): `frontend/src/app/design-tokens.spec.ts:448-452`
   — "— `--color-shelter-pick` is the one "unchanged (map context)" token of the theme. It is
   **#ff8a80** (brightened as a safe superset)…" — the token is `#0f6e6e` light / `#4dd0c4` HC
   today (served styles.css confirms). The comment describes the retired value and the retired
   "unchanged" status (the genuinely unchanged HC token is `--color-map-placeholder`).
3. **"fresh-CLOSED is reported-tone (red-orange)" vs the rendered amber** (decision:
   `shelter-trust-and-reports` D6 — "**amber** "Reported closed""; the class `badge--closed`
   has been the warning/amber pair since its birth in `4461516`, unchanged since):
   - `frontend/src/app/shared/shelter-copy.ts:274` — "CLOSED row carries the reported-tone badge (**red-orange, the untouched --color-reported**)"
   - `frontend/src/app/features/map/map-page.html:306` — "the fresh-CLOSED reported-tone badge"
   (Counter-check: the rendered treatment is amber — `styles.scss` `.badge.badge--closed` =
   `--color-warning-bg/border/text`, and `shelter-detail-page.html:35` in the same file group
   says "amber" — the rendering matches the original decision; the red-orange prose is the
   stale part. The "red-orange "Reported"" for `nonexistentReports > 0` in the same comments
   is correct and left alone.)

- **Fix.** Comment rewrites only; no behaviour, no token, no spec assertion changes.
- **Blast radius / risk.** Six + two + two files of prose; zero runtime impact. Cheap; do
  together with F4's files where they overlap.

### F6 — STALE-LOW (cross-lens, owned by SD-3/SD-2) · decision text in docs/specs that still reads as current

Collected here because the decision chain was reconstructed through them; each is a doc
artefact, not a rendering path — hand to the merge pass:

- **Active change spec still says amber:** `openspec/changes/community-review-queue/specs/map-browse/spec.md:8-9,25`
  ("amber (new token)… Marker tone for community rows: amber when review_status NEW… render
  amber and green") and `openspec/changes/community-review-queue/proposal.md:41,54`. The change
  is still unarchived, so its spec text reads as the current decision although W1 superseded it
  in code. Where the decision now lives: `design-tokens.spec.ts` (unification + ring pins).
- **Context docs:** `context-and-tasks/agent/02-CONTEXT-DOMAIN.md:28` ("NEW = … amber "Newly
  added" treatment") and `context-and-tasks/agent/07-STEPS.md:503` ("community `NEW` rows
  render amber").
- **QA checklist quote drift:** `qa/accessibility-checklist.md:71` quotes the spec test as
  "…in **both** themes" — the actual test name (and reality) is "in **every** theme" (three
  themes since the accessibility-dialog change).
- **Dead legend key (SD-2's):** `map.legend.new` exists in `en.ts:186`, `et.ts:189`, `ru.ts:201`,
  `messages.ts:198` and is served to users in the EN catalog chunk (`fetches-sd1/chunks/chunk-11.js`)
  but no template references it — the key survived the legend's deliberate removal of the NEW
  entry. Confirms the legend absence was an owner decision with a leftover key, not a lost swatch.

---

## 2. False positives rejected (counter-check found a live reference or an intentional decision)

1. **Retired hexes `#f59f00` / `#ffd43b` / `#ffb84d` / `#d4a017` / `#ffe066` (partner gold) / `#c92a2a` / `#ff8787` / `#6b7280` / `#9aa5b1` / `#d32f2f` / `#ff8a80` / `#168c8c`** — full sweep of `frontend/src`: the retired marker/badge values are absent from all shipped code (the only hits: `#ffe066` as the intentional B&Y link token, `#168c8c`/`#0b5cad` in comments, `#ff8a80` in the stale spec comment of F5.2). The old five-provenance table survives only in the **archived** design doc (`…/2026-09-16-shelter-provenance-taxonomy/design.md` D4) — an archive is a historical record, not a live artefact; the main spec (`openspec/specs/shelter-provenance-taxonomy/spec.md:69-76`) was already rewritten to "stays on the trust palette".
2. **The legend's missing NEW swatch** — not a lost rendering path: the owner decision is documented in three places (map-page.html:16-22, BACKLOG-PLAN W4-D, the ring spec test) and the marker class remains the single source a future swatch would reuse.
3. **Map-row badges use computed 8% `color-mix` fills while detail/admin use token fills** — not a second stale treatment: documented page-local override (map-page.scss:448-470) with the percentage re-parsed and contrast-pinned per theme by `design-tokens.spec.ts` `MIXED_PAIRS` + the "no color-mix background escapes the mixed-pair audit" guard. Live and intentional.
4. **`badge--user` green pill on the admin users table for "REGISTERED" accounts** (`users-panel.html:55`) — a semantic reuse, but the shared `.badge` vocabulary explicitly includes "the account kind badge" (styles.scss badge comment) and the rule is live. Documented, not stale.
5. **`--bp-narrow` with zero `var()` references** — documented exception: "@media queries cannot consume var(); @media rules use the literal 900px with a reference comment — keep this token and those rules in sync" (styles.scss:232-236), and the `@media` sweep in the token spec enforces the 900px literal.
6. **Two reds coexisting (`--color-danger #b33a3a` vs `--color-reported #c2410c`)** — not a duplicate of the "red reserved for reported" decision: the reservation refers to the marker/pin language (the old **red pick pin** `#d32f2f` is gone; `:root` comment styles.scss:173). Page-level error red and the safety-orange reported family are a documented split ("red has ONE voice" note for danger/error; reported reuses the CTA *hue family* as its own token, shelter-trust-and-reports D6).
7. **`ThemeStore.toggle()` / `.highContrast` with no template callers** — the doc says "kept for the existing consumers and specs"; counter-check found live **spec** consumers (`theme-store.spec.ts:83,171-207`). Not dead — borderline API debt at most; excluded per the evidence bar.
8. **B&Y uniform-badge ruling (all badges black + yellow border + yellow text)** — implemented, spec-pinned (`design-tokens.spec.ts` "keeps the black-and-yellow uniform badge override") and present in the served bundle. The "tint vs border" badge decision is honoured in the theme layer; no survivor.
9. **Navy as a data colour** — `--color-brand #12304a` consumers are the wordmark, page titles, chrome band and the report-gauge needle (a neutral ink, not a data hue). No marker, legend or table colour uses navy as a data encoding (registry is civic blue `#1769aa`); no decision record forbids the needle ink, and no retired navy-data value survives in code.
10. **The running backend not serving `inaccurateReports`** — environmental (process started before the DTO commit), not a code artefact; reported inside F2 as the masking condition, not as its own finding.
11. **"Newly added X ago — not yet verified" line vs the ring** — the detail header's NEW signal is text (last-verified-meta M8), explicitly the companion of the marker shape; not a second colour treatment.
12. **`--color-cta #bf360c` vs `--color-reported #c2410c` (two oranges)** — the CTA is the single crisis affordance (map-crisis-actions D1, "must not become a general accent", one consumer: `.map-cta`), the reported token is the state's own language; the unification commit deliberately left both untouched ("reported red-orange untouched", BACKLOG-PLAN W4-D "Must not").

---

## 3. Merge-pass handoff

- **Fix-now (behaviour-visible, once the new backend is served):** F2 (OR rule in
  `markerTone`/`hasReports`/badge count + FE DTO fields; badge-count semantics = owner call).
- **Fix-now (internal-visible):** F3 (one 4-line rule in `_admin-shared.scss`).
- **Doc-only:** F1's test hardening can ship with F1's one-line index.html fix; F5 + F6 are
  prose/comment rewrites (F6 mostly SD-3/SD-2-owned).
- **Propose-and-wait:** F2's "which count does the badge show"; F4's token removal (touches the
  same two theme files as F1 — batch them under one owner to avoid two lanes in one file).
- **File-set ownership map** (no two findings touch a file for different fixes):
  - `index.html` + `prepaint.spec.ts` → F1 (+ F4's one line in index.html).
  - `_admin-shared.scss` → F3 only.
  - `models.ts` / `shelter-copy.ts` / `leaflet-service.ts` / panel templates + 3 specs → F2.
  - `design-tokens.spec.ts` comment → F5.2; `styles.scss`/`theme-tokens.ts` deletions → F4.
  - Prose-only files → F5.1/F5.3/F6 (SD-3 for the spec/doc files).
