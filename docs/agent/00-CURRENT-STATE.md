# 00 — Current State

**This file is the single current-state entry point. Read it first.** A lane that needs to
know how the system works *today* starts here and follows the `file:line` anchors into the
code. Do not re-derive behaviour from other documents: the surrounding packs and specs carry
history, and some of them describe states that no longer exist (publish-time hero import,
source-kind chips, the pre-split pin palette). If a document contradicts this file, this file
plus its anchors wins — and the contradiction is a finding to report, not a reason to
re-derive from the older text.

> **Standing rule: this file and the specs describe current state. History lives in dated
> records (`reviews/`, `docs/autopilot/`, dated review outputs) — and a dated record is not
> stale for being old.** An old record describing a past state remains true *of that state*;
> only this file may describe the present.

**Anchor discipline.** Every claim below carries a `file:line` pointer to the code that
implements it (paths relative to the repo root). An unanchored claim is a claim that will
rot: if you cannot find the code behind a sentence you are about to write, do not write the
sentence. If an anchor no longer matches, re-derive from the code and report the drift.

**Layout, in one breath.**

- Backend: `src/main/java/ee/sheltermap/` — Spring Boot. Domain (`domain/`), services
  (`app/`, `guidance/`, `auth/`, `ingestion/`), API (`api/`), persistence (`persistence/`).
- Frontend: `frontend/src/app/` — Angular (standalone, zoneless). `features/` pages,
  `shared/` cross-page pieces, `core/` tokens, i18n, API client.
- Design tokens: `frontend/src/styles.scss` — the `:root` block is the single source of truth
  (`frontend/src/styles.scss:3`), with one `[data-theme='high-contrast']` override block
  (`frontend/src/styles.scss:279`); the black-and-yellow theme is a runtime token map
  (`BLACK_AND_YELLOW_TOKENS`, `frontend/src/app/core/theme-tokens.ts:52`). Spacing rides
  the `--space-*` scale the same
  way: the spacing-literal guard in `frontend/src/app/design-tokens.spec.ts` fails the build
  on any margin/padding/gap value off-scale, with a stated allow-list (zero/auto resets,
  1–2px hairlines, negative offsets, calc/clamp, %/em/ch measures, vendored bytes) and a
  matched-count floor. The role-by-role audit behind it — 44 roles, 13 fixed declarations,
  the documented exceptions — is `reviews/19-spacing-audit.md`.

---

## 1. The trust ladder — what a pin means, and how it renders

The map pin is a two-axis statement — **source** (registry vs community) and the
**submitter's verification depth** — with **reported** overriding both. The tone is resolved
once, from server fields to marker class: `markerTone` at
`frontend/src/app/shared/leaflet-service.ts:50-91` (javadoc + rule, whole method).

| State | Server fields behind it | Shape | Colour token — light / high-contrast / black-and-yellow |
| --- | --- | --- | --- |
| **Unverified** community | `source=USER`, submitter depth absent (`submitterVerification` null) | yellow **triangle** | `--color-shelter-user` — `#ffd400` in all three themes |
| **Partially verified** | depth = exactly one confirmed channel (EMAIL, PHONE or SMART_ID) | yellow **circle** | same `#ffd400` |
| **Fully verified** | depth = two or more channels (`FULL`) | green **circle** | `--color-verified` — `#237a57` / `#7fd49a` / `#7fd49a` |
| **Reported** | an open report of *either* kind; overrides everything | red-orange **circle** | `--color-reported` — `#c2410c` / `#ffa94d` / `#ff6b4d` |
| **Registry** | `source=PAASETEAMET` or `MUNICIPALITY` | blue **circle** | `--color-shelter-registry` — `#1769aa` / `#7db8f0` / `#7ab8ff` |
| **Picked / anchor** | UI-only, no shelter row | teal circle on `/submit`; teal **diamond** on `/map` | `--color-shelter-pick` — `#0f6e6e` / `#4dd0c4` / `#4dd0c4` |

Anchors, row by row:

- Resolution order: reported first (the OR of the two open-report counts
  `nonexistentReports`/`inaccurateReports`,
  `frontend/src/app/shared/leaflet-service.ts:78-79`), then `USER` rows by depth
  (`frontend/src/app/shared/leaflet-service.ts:81-89`), everything else registry
  (`frontend/src/app/shared/leaflet-service.ts:90` — a bare `return`, no symbol). The
  depth→shape mapping is `verificationTone`: absent → community tone, one channel →
  `partial`, two or more → `full` (javadoc + rule,
  `frontend/src/app/shared/shelter-copy.ts:84-101`).
- Marker classes (the `shelter-marker` family in `frontend/src/styles.scss`): the base
  circle `.shelter-marker` (the shared 2px surface edge)
  (`frontend/src/styles.scss:810-814`); the registry fill `.shelter-marker--registry`
  (`frontend/src/styles.scss:816-818`); the unverified triangle `.shelter-marker--user`
  (`frontend/src/styles.scss:820-867`); the full green circle `.shelter-marker--full`
  (`frontend/src/styles.scss:869-881`); the partial yellow circle
  `.shelter-marker--partial` (`frontend/src/styles.scss:883-885`); reported
  `.shelter-marker--reported` (`frontend/src/styles.scss:887-895`); the pick pin
  `.shelter-marker--pick` (`frontend/src/styles.scss:897-905`); the anchor diamond
  `.shelter-marker--anchor` (`frontend/src/styles.scss:907-920`).
- Token values: light theme `frontend/src/styles.scss:91,102,115,171,182,187`; high-contrast
  `frontend/src/styles.scss:388,393,398,430-432`; black-and-yellow
  `frontend/src/app/core/theme-tokens.ts:97,98-99,103,139,140-141,142`. The unverified
  yellow is the *same* `#ffd400` in every theme
  (`frontend/src/styles.scss:182,431`; `frontend/src/app/core/theme-tokens.ts:140-141`).
- **`--color-new` is unified with the verified green — one value per theme** (owner
  decision, enforced in a spec: `frontend/src/app/design-tokens.spec.ts:913`). Light
  `frontend/src/styles.scss:102,115`; high-contrast `frontend/src/styles.scss:393,398`;
  black-and-yellow `frontend/src/app/core/theme-tokens.ts:98-99,103`.
- **Red-orange is reserved for reported**: no other state uses the red family — the pick
  pin's own comment: "red is reserved for" (`frontend/src/styles.scss:898-899`); the
  marker-meaning pin keeps it a distinct family in every theme
  (`frontend/src/app/design-tokens.spec.ts:949`). The pin palette has no grey — the
  unverified tone's comment says "there is no grey in it",
  `frontend/src/app/core/i18n/en.ts:181-184`.
- **The shape distinction carries depth separately from colour** (WCAG 1.4.1 — never
  colour alone): unverified = triangle, partial = circle, full = circle with the verified
  green (the shape-carrying notes, `frontend/src/styles.scss:820-822,873-874`). Separately,
  the browse anchor is a diamond against shelter circles on shape — the code's own words
  are "not a circle — the shape IS the distinction"
  (`frontend/src/styles.scss:915-920`; `setAnchor` at
  `frontend/src/app/shared/leaflet-service.ts:317,327,338`; the pick pin is `setPick` at
  `frontend/src/app/shared/leaflet-service.ts:274,285`).
- The legend swatches reuse these exact marker classes — the section's own note
  (`frontend/src/styles.scss:806-809`) — so map and legend can never drift. Legend copy:
  the `map.legend.` entries at `frontend/src/app/core/i18n/en.ts:177,179-180,185-186,190`.
- Server-side states: the community trust lifecycle is `ReviewStatus` NEW / CONFIRMED /
  REJECTED (`src/main/java/ee/sheltermap/domain/ReviewStatus.java:20-23`); new rows publish
  as NEW, and registry rows are backfilled CONFIRMED (the field default,
  `src/main/java/ee/sheltermap/domain/Shelter.java:74`). The standing where-does-this-row
  come-from question is the derived `Provenance` (never stored, derived on read):
  `src/main/java/ee/sheltermap/domain/Provenance.java:59-80`.
- The submitter-verification depth is **derived on every read** from the author's current
  active claims — a row added while its submitter had one channel upgrades itself the moment
  the second channel is confirmed; nothing is stored on the shelter
  (`src/main/java/ee/sheltermap/api/SubmitterVerification.java:10-13,26-33`).
- There is deliberately **no recency term** in the pin: NEW vs CONFIRMED rows without a
  reported depth share the community tone; the comment above that return —
  "the badge says NEW, not the pin" (`frontend/src/app/shared/leaflet-service.ts:86-88`).

## 2. The verification rule — three distinct confirmers

A USER row in review state NEW is promoted NEW→CONFIRMED automatically when it reaches
**three distinct community confirmers** — the only automatic promotion path
(`autoConfirmIfEligible`, `src/main/java/ee/sheltermap/app/ShelterReportService.java:348-358`;
the threshold check `distinctConfirmers(shelter) >= ShelterReport.AUTO_CONFIRM_THRESHOLD` at `:351`):

- Threshold = 3: `AUTO_CONFIRM_THRESHOLD`
  (`src/main/java/ee/sheltermap/domain/ShelterReport.java:30`).
- A confirmer is a **distinct verified user** who either filed an open (non-dismissed)
  `OPEN_CONFIRMED` report or whose current live open/closed tap is OPEN — each distinct user
  counts once, report and tap alike (`distinctConfirmers`,
  `src/main/java/ee/sheltermap/app/ShelterReportService.java:360-385`; the OPEN tap runs the
  same tally, `autoConfirmIfEligible`, at `:264-266`).
- **The submitter's own reports and taps are always excluded** — a self-confirm is never a
  verification, not even as the third
  (`src/main/java/ee/sheltermap/domain/ShelterReport.java:26-28`; the removal is an inline
  filter at `src/main/java/ee/sheltermap/app/ShelterReportService.java:380-383`). Guests and
  unverified registered users cannot file reports or taps at all — the
  `requireVerified` gate (403) at `src/main/java/ee/sheltermap/app/ShelterReportService.java:161,213,250-252`.

**How it differs from the auto-hide tally** (do not conflate the two):

| | Auto-confirm (this rule) | Auto-hide |
| --- | --- | --- |
| Inputs | open `OPEN_CONFIRMED` reports **+** current OPEN taps | open `NON_EXISTENT` reports only |
| Counting | distinct **people**, unweighted | sum of the reporters' **trust weights**; a dampened duplicate reporter contributes 0 |
| Submitter | excluded | n/a |
| Dismissed reports | excluded by the query | excluded by the query |
| Threshold | **3** (`ShelterReport.java:30`) | **5** (`ShelterReport.java:41`) |
| Effect | NEW → CONFIRMED | ACTIVE → INACTIVE (`ShelterReportService.java:309-314`) |

The hide tally is the weighted sum over distinct `NON_EXISTENT` reporters
(`hideTally`, `src/main/java/ee/sheltermap/app/ShelterReportService.java:269-280`), and
both tallies read their inputs from the same dismissed-excluded store query
(`reportersByShelterAndType`,
`src/main/java/ee/sheltermap/persistence/SpringDataShelterReportRepository.java:16-22`).

## 3. The reported rule — either kind drives it; dismissed counts for nothing

- **Either report kind drives the reported state.** The pin turns red-orange when
  `nonexistentReports > 0` **OR** `inaccurateReports > 0` — an OR, not a sum
  (`frontend/src/app/shared/leaflet-service.ts:78-79`; the DTO contract spells it out:
  "EITHER report kind turns the pin red when open",
  `src/main/java/ee/sheltermap/api/ShelterDto.java:127-134`; the `nonexistentReports`/
  `inaccurateReports` fields at `:126,134`). At the
  provenance level, an INACTIVE row with either open count at the auto-hide threshold derives
  `REPORTED_INACTIVE` (`src/main/java/ee/sheltermap/domain/Provenance.java:65-69`).
- **Dismissed reports are excluded from both the counts and the list.** "Open" means
  not-dismissed, and a dismissal is the admin's invalid verdict — the report stops
  influencing anything:
  - **Counts** (what the pins and DTOs read): the batched per-(shelter, type) count
    `countByTypeForShelterIds` carries `r.dismissedAt is null`
    (`src/main/java/ee/sheltermap/persistence/SpringDataShelterReportRepository.java:24-29`).
    The same predicate guards the tallies (`reportersByShelterAndType`, `:16-22`) and the
    "last verified" stamp (`:31-39`).
  - **List** (the admin report queue): the default queue renders everything with dismissed
    rows dimmed (dismissal records the resolution, it never deletes the report); the
    moderator's "hide dismissed" scope (`excludeDismissed=true`,
    `src/main/java/ee/sheltermap/api/AdminController.java:397`) drops the dismissed rows in
    the domain (`openReportPage`,
    `src/main/java/ee/sheltermap/api/AdminModerationService.java:414-438`) — and its
    X-Total-Count *is* the sum of the per-shelter open counts the pins read
    (`listShelterReports` with `excludeDismissed`,
    `src/main/java/ee/sheltermap/api/AdminModerationService.java:311-326`).
  - So: the count/tally filter lives in the store queries (`dismissedAt is null`); the list
    filter lives in the queue's open-scope reads (`openReportPage`/`openReportCount` at
    `src/main/java/ee/sheltermap/api/AdminModerationService.java:414,448`).

## 4. Paging and filtering — the view IS the URL

- **URL-only state, no localStorage.** The selection/view lives in query params: the map
  legend's `tones` param — "URL-only (no localStorage), display-only", in
  `LegendFilterView`'s own words (`frontend/src/app/features/map/legend-view.ts:54-68`); the
  admin page carries the same idiom ("the view IS the URL",
  `frontend/src/app/features/admin/admin-page.ts:368`). Public surfaces use page-level
  routes, admin tab panels use tab-namespaced query params
  (`frontend/src/app/shared/list-state.ts:16-20`).
- **Clamp/normalize discipline.** A hand-typed illegal value is sanitized to the nearest
  legal value — never an error — and the URL is normalized in place, so the control and the
  URL can never quietly disagree (`syncFromParams` with `replaceUrl`,
  `frontend/src/app/features/map/legend-view.ts:120-156`; `normalizeListParams`,
  `frontend/src/app/features/admin/admin-page.ts:419-509`).
- **Per-list namespaced parameters.** Each admin paged list owns its own `{list}Page` /
  `{list}Size` pair — `guidancePage/guidanceSize`, `shelterPage/shelterSize`,
  `reportPage/reportSize`, `userPage/userSize`, `mediaPage/mediaSize`, `auditPage/auditSize`
  (`frontend/src/app/features/admin/admin-page.ts:453-468`).
- **Frontend paging policy** (one place, so it cannot drift): sizes 10..100 in steps of 10,
  default 20, 1-based pages, the server does the slicing
  (`frontend/src/app/shared/paging.ts:1-16`); the four `PAGE_SIZE_` constants at
  `:19,23,26,30`; `parsePage`/`parseSize` at `:39-56`;
  `lastPage` (≥ 1, "Page 1 of 1" never says "of 0") at `:58-62`; `clampPage` at `:64-69`.
- **Backend paging vocabulary** (one 400 exception, one message, one cap, per the `Pagination`
  rule): `limit` optional — absent means no paging, present must be 1..200 else 400;
  `offset` optional — absent means the first page, negative is a 400; an offset past the end
  is an empty page, never an error (`Pagination` at
  `src/main/java/ee/sheltermap/api/Pagination.java:20-30`, `MAX_PAGE_SIZE` at `:33`,
  `requireLimit` at `:44-58`, `requireOffset` at `:60-74`, `slice` at `:91-110`).
- **`X-Total-Count`** is the filtered length WITHOUT paging, always present on the paged
  reads (`Paged`, `src/main/java/ee/sheltermap/api/Pagination.java:112-123`), exposed
  cross-origin by name — never a wildcard (`setExposedHeaders`,
  `src/main/java/ee/sheltermap/config/SecurityConfig.java:183-188`) — and read on the
  frontend with an honest degrade: a missing/blank/negative header falls back to the
  fetched page's own length (`parseTotal`, `frontend/src/app/shared/paging.ts:71-78`).
- **The map's legend IS the filter** (wave 7), and **the source chips are gone** (wave 8):
  the five tone entries (`registry, user, partial, full, reported`) are toggle buttons
  (in the template, `frontend/src/app/features/map/map-page.html:16-17`); the selection is
  the URL's `tones` param, display-only — the loaded list is filtered client-side and the
  markers re-render, never a refetch (`LEGEND_TONES`,
  `frontend/src/app/features/map/legend-view.ts:4-11`; the view `LegendFilterView` at
  `:54-68`). The sixth legend entry (the anchor diamond) is a reference point, deliberately
  not a filter (`LEGEND_TONES` javadoc, `:8-11`). The old source-kind chips (All /
  Registry / User) were removed as the duplicate of the legend filter, and the `?source=`
  refetch went with them — "The list always fetches ALL sources"
  (`frontend/src/app/features/map/map-page.ts:94-95`). The two remaining chips compose with
  the legend: "Open" is client-side (the backend has no open/closed param), "Has capacity"
  is server-side `?hasCapacity=` (`frontend/src/app/features/map/map-page.ts:321-329`).

## 5. The guidance hero — imported when the post is SAVED

- **The import runs at save time — create and update, draft or published alike** (Wave 9
  moved it from publish to save), downloading, validating and storing the image under a
  generated name (`src/main/java/ee/sheltermap/guidance/HeroImageImportService.java:23-26`);
  the save-side decision is `resolveHeroOnSave`
  (`src/main/java/ee/sheltermap/guidance/GuidanceService.java:802-827`); the trigger moved by
  migration `src/main/resources/db/migration/V33__guidance_hero_import_on_save.sql:4-5`.
- **A failed import never blocks the save.** The import runs in its own transaction
  (`REQUIRES_NEW` paragraph, `src/main/java/ee/sheltermap/guidance/HeroImageImportService.java:28-35`):
  a failure rolls back only the asset row and propagates to the save, which
  **stores the post anyway** and surfaces the error against the hero field — the catch's own
  words, "A failed import NEVER blocks the save"
  (`src/main/java/ee/sheltermap/guidance/GuidanceService.java:839-850`).
- **Hero state after a failure:** the hero falls back to the request's library reference, or
  — none given — to what the post already had; a fresh post is simply hero-less (which renders
  fine). The import URL is kept on the post as a retryable pending import — the next save
  retries it. A hero is always a validated stored asset or nothing: the import URL is never a
  rendering source, on any page, in any state (the fallback assignment,
  `src/main/java/ee/sheltermap/guidance/GuidanceService.java:845-849`;
  `src/main/resources/db/migration/V33__guidance_hero_import_on_save.sql:13-20`).
- **Idempotent re-save:** if the post's current hero is exactly this URL's own import (the
  asset's origin is recorded as `source_url`), a same-URL save does not re-fetch or
  duplicate (`isHeroImportedFrom`,
  `src/main/java/ee/sheltermap/guidance/GuidanceService.java:853-860`; the no-re-fetch
  branch, the `isHeroImportedFrom` guard, at `:826-834`).

## 6. Data provenance — the registry import

- **Axis-order is detected from the values, not the column names.** The publisher's field
  names do not describe the contents: the live CSV's `lest_x` carries northing-scale values
  and `lest_y` easting-scale values — trusting the names places every row outside the country
  (measured: 0 of 303 rows inside the Estonia bbox). In L-EST97 over Estonia eastings sit in
  300 000–800 000 m and northings in 6 000 000–7 000 000 m; the bands are ~4× apart and never
  overlap, so a row whose two values fall in different bands is unambiguous
  (`src/main/java/ee/sheltermap/ingestion/Lest97AxisOrder.java:7-23,33-37,54-62`).
- **Unplaceable rows are rejected loudly, never guessed.** A row is unresolvable when both
  values fall in the same band (two eastings or two northings cannot form a point) or a value
  falls outside both bands — "a guessed pin on a public-safety map is worse than a counted
  rejection" (`src/main/java/ee/sheltermap/ingestion/Lest97AxisOrder.java:25-28`). Each such
  row is logged individually and the run logs a loud aggregate with the first ids; the import
  counts the rejections as skipped and **retains (never delists) the stored rows**
  (`src/main/java/ee/sheltermap/ingestion/CsvRegistryClient.java:138-146,202-209`). Rows that
  die in the parser are logged too — the log is the only record of that loss
  (`src/main/java/ee/sheltermap/ingestion/CsvRegistryClient.java:120-126`).
- **The Estonia bounds guard:** a placed point outside the Estonia bbox (lat 57.5–59.7, lng
  21.5–28.2 — a sanity check, not a hard geopolitical border) is rejected at the boundary
  that produced it, with the parser's own guard kept as the backstop for every source
  (`src/main/java/ee/sheltermap/domain/GeoPoint.java:7-10,22-24`;
  `src/main/java/ee/sheltermap/ingestion/CsvRegistryClient.java:196-199,219-225`).

## 7. Recurring hazards — know these before you edit or run

1. **The dev server needs a hard refresh to show frontend changes.** `ng serve` rebuilds on
   save, but a loaded page keeps the bundle it already has in memory (no service worker) —
   until a hard refresh (F5), your change is invisible and a working fix looks like it did
   nothing. The dev server is `npm start`
   (`frontend/package.json:6`); the `/account` route-vs-API direct-load behaviour is
   documented in `frontend/proxy.conf.js:7-16`. (Root cause is browser/dev-server behaviour;
   recorded in the dated session notes of 2026-09-22 — no single line of code implements it.)
2. **A single long test run must be detached or it will be cut off.** Full suites
   (`mvn -q test`, `npx ng test --watch=false`) run long enough for a foreground session to
   lose them; the standing gate practice is to run them detached and read the exit files
   (dated record: `reviews/17-docs-coordination.md:46`, e.g.
   `flock /tmp/openshelter-mvn.lock mvn -q test` → exit file read).
3. **The design-token spec parses `styles.scss` one line at a time.** A wrapped declaration
   reads as a *missing token* — keep every token declaration on one line and keep comments
   **above** the declaration, never appended to the line
   (`frontend/src/styles.scss:33-36`; the line-by-line loops are
   `frontend/src/app/design-tokens.spec.ts:64-66,73-88`).
4. **This repository has a history of guards that passed while their behaviour was gone.**
   Documented examples: a constraint-parity test that "has ALWAYS reflected an empty
   constraint set and passes vacuously — it never guarded the `api` request bounds it was
   written for" (`docs/autopilot/findings/LEDGER.md:265`), and the literal-token audit
   being blind to computed `color-mix()` fills — the spec's own words:
   "the token pairs above pass while the mix can still fail"
   (`frontend/src/app/design-tokens.spec.ts:855-865`). Lesson: a green guard
   proves the guard ran, not that the behaviour exists — verify the path the guard was
   written for, then trust the guard.

## Unsettled — flagged, not decided

- The RU and ET legend/map copy are **MACHINE DRAFTs in the source, awaiting native
  speaker review** — do not treat them as final (the `MACHINE DRAFT` legend blocks,
  `frontend/src/app/core/i18n/ru.ts:195-203`; the Estonian `MACHINE DRAFT` legend blocks
  at `frontend/src/app/core/i18n/et.ts:189-197`).
- The backend suite's status on **JDK 27** was flagged that one must not "treat the suite
  as green for CI until this is decided" in the 2026-09-21 review
  (`reviews/run1-2026-09-21/12-summary.md:183`); that decision's
  outcome is not re-verified in this file — check before relying on a red/green suite run on
  JDK 27.

---

**Maintaining this file.** One change at a time, with the anchor updated in the same edit.
If a claim loses its code, delete the claim or move it to *Unsettled* — an unanchored
sentence is the rot this file exists to prevent.
