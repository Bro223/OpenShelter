# SD-3 — documentation, specs, and the served contract

**Lane.** Docs/specs/served-contract auditor. Read-only except this report. Working tree
at HEAD `3f0cbe7` (2026-09-22 11:31, clean). Cross-references SD-1 (colour/rendering) and
SD-2 (catalogs/copy) instead of duplicating them.

**Method.** (1) Read the SD-3 brief (`docs/autopilot/STALE-DECISION-AUDIT.md`) + SD-1/SD-2
reports. (2) Per-archived-change sweep: extracted each archived change's headline decisions
(29 archived + 6 active) and cross-checked the corresponding main spec under
`openspec/specs/` against current code. (3) Per-main-spec audit of all 19 specs for
assertions about removed endpoints, status codes, fields, consent/legal flows,
source-vocabulary values and trust rules. (4) Counter-checked every handed-over candidate
(see §3). (5) Fetched the running backend's OpenAPI (`:8080/v3/api-docs`, dev opt-in via
`SPRINGDOC_ENABLED`) and diffed it structurally against `docs/api/openapi.json` (64 operations each); compared the
committed snapshot against current controllers/DTOs; compared the README API table against
code. (6) Fetched served frontend routes (`:5173`) + served public API surfaces and checked
the served bundle against current source.

**Process state (evidenced, not assumed).**

| Process | PID / started | Consequence |
|---|---|---|
| backend (`mvn spring-boot:run`) | 1276626, **2026-09-22 00:07:58** | Started today, but **before** `7cbe178` (04:55, W2-B) and `2a3fe47`/`60e7cb9` (11:31). Serves the `target/classes` of that moment — a pre-W2-B contract. |
| frontend (`ng serve --port 5173`) | 38006, 2026-09-21 20:28 | Dev server recompiles on file change — the **served bundle is current source** (verified: bundle carries "Newly added" ×2, "Community-checked" ×2, zero "Proposed "). |

The brief's premise "the backend was restarted today" holds only in the sense that the JVM
was started at 00:07 today — it does **not** reflect today's 04:55 and 11:31 commits.

---

## 1. Findings

Severities: **HIGH** = a main-spec or active-change requirement that the current code
violates (the spec *cannot* be satisfied as written, or a legal claim misstates behaviour);
**MED** = decision text in docs/README that still reads as current; **LOW** = comment-level
residue.

### T1 — STALE-HIGH · `community-self-moderation` main spec pins the single-confirmation promotion "exactly as shipped"

- **Superseded decision.** `community-self-moderation` (archived) + `community-review-queue`
  D2: one `OPEN_CONFIRMED` report by a non-submitter promotes NEW→CONFIRMED. Superseded by
  `2a3fe47` (11:31, "three distinct confirmers verify a community row"):
  `src/main/java/ee/sheltermap/domain/ShelterReport.java:30` — `AUTO_CONFIRM_THRESHOLD = 3`;
  promotion fires when **three distinct** verified non-submitter confirmations (open
  `OPEN_CONFIRMED` reports and/or current OPEN taps — taps count since the same commit)
  cross the threshold (`app/ShelterReportService.java:303-335`).
- **Artefact.** `openspec/specs/community-self-moderation/spec.md:134-140` — "The
  auto-confirm promotion SHALL remain exactly as shipped: one `OPEN_CONFIRMED` report by a
  user other than the submitter promotes a USER row from NEW to CONFIRMED in the same
  transaction… Trust weighting SHALL NOT gate the positive side." + scenario "A single
  baseline cross-user positive report promotes" (the "exactly as shipped" snapshot anchor
  makes this the worst shape of the class: it forbids the behaviour the code now has).
- **Counter-check.** Exhaustive: no main spec or doc anywhere states the three-distinct-
  confirmer rule — it exists only in code + `CommunityReviewIT`-style tests. The rule is the
  live behaviour; the spec is the stale side.
- **Fix + blast radius.** Rewrite the requirement: promotion requires three distinct
  non-submitter confirmations (reports **or** OPEN taps), audit row actor = the crossing
  user; update the scenario (two reports ≠ promotion; third distinct confirmer promotes).
  One file, one requirement + 2 scenarios. No code change.

### T2 — STALE-HIGH · active `community-review-queue` change still specifies single-confirmation promotion + amber + raw 5× auto-hide

The change is unarchived, so its spec text is read as the current decision.

- **Artefacts.**
  - `openspec/changes/community-review-queue/specs/shelter-submission/spec.md:5-31` —
    "When a positive community report (type OPEN_CONFIRMED) is submitted by a user other
    than the row's submitter, the row's review_status SHALL become CONFIRMED in the same
    transaction" + scenario "A positive report from another user confirms it"; `:20` "with
    the amber 'new community' treatment".
  - `openspec/changes/community-review-queue/design.md:15-19` (D2) — same single-report
    promotion, "inside the report-write transaction"; `:20-21` "5× NON_EXISTENT
    auto-hides… exactly as today" (raw count — the live rule is the trust-weighted tally,
    `ReporterTrust` weights, damped = 0).
  - `design.md:26-31` (D3) "the amber 'just added' treatment"; `:42-50` (D5) "Community:
    amber (NEW)… new design token `--color-new` (amber family…)" — superseded by the W1
    yellow-family unification (`c29b471`; SD-1 §1).
- **Counter-check.** The sibling `map-browse` delta was already annotated "(Superseded by
  …)" at `:9` by `3f0cbe7` — the `shelter-submission` delta and `design.md` were missed in
  the same pass.
- **Fix + blast radius.** Add the three-distinct-confirmer rule to the delta requirement +
  scenario; amber→unified-yellow in the delta, D3, D5. Prose-only, two files.

### T3 — STALE-HIGH · `shelter-reports` main spec still states the raw "five NON_EXISTENT reports" auto-hide

- **Superseded decision.** `shelter-trust-and-reports` D1: five raw `NON_EXISTENT` reports.
  Superseded by `community-self-moderation` D1/D2 (archived): the tally is the **sum of the
  distinct reporters' derived trust weights** (baseline 1, +1 per verification channel /
  contribution, capped; damped = 0) reaching `AUTO_HIDE_THRESHOLD = 5` points
  (`ShelterReport.java:41`; `ShelterReportService.java:160-176, 255`).
- **Artefact.** `openspec/specs/shelter-reports/spec.md:36-60` — "Requirement: Auto-hide on
  five non-existence reports… reaches exactly 5… the 5th distinct user's `NON_EXISTENT`
  report" + scenario "reports before the threshold only flag: 1–4 `NON_EXISTENT` reports".
  Both can fail against reality: two trusted reporters (weights ≥ 3) can hide with 2
  reports; five damped reporters hide nothing.
- **Counter-check.** The README's equivalent bullet is accurate ("five baseline reporters,
  trusted reporters weigh more" — README:11, :51) — only the spec pins the raw-count rule.
- **Fix + blast radius.** Restate as the weighted tally (threshold 5 points; the
  baseline-reporter case as one scenario, a weighted case as another). One file, one
  requirement + 3 scenarios.

### T4 — STALE-HIGH · `legal-recovery` main spec: "the CTA is the ONLY geolocation trigger"

- **Superseded decision.** `legal-recovery` (archived): the map's "Nearest shelter" CTA was
  the sole `navigator.geolocation` call. Since `location-navigation` (archived) the detail
  page has "Distance from you", and `shelter-location-input` (archived) added "Use my
  location" on `/submit` — three triggers.
- **Artefact.** `openspec/specs/legal-recovery/spec.md:175-196` — "…SHALL remain the ONLY
  geolocation trigger…" + scenario `:196` "the CTA is the only geolocation request".
- **Counter-check.** Live callers (verified): `features/map/map-page.ts` (CTA,
  `getCurrentPositionHighAccuracy`), `features/shelter/shelter-detail-page.ts` (distance),
  `features/shelter/submit-shelter-page.ts` (use-my-location). No IP geolocation anywhere
  (the spec's anti-enumeration clause still holds).
- **Fix + blast radius.** Restate as "all three user-initiated triggers show the browser
  permission prompt first; position is never sent to the server". One file. This also gates
  the legal-copy finding D6 below.

### T5 — STALE-HIGH · `entry-verification-meta` main spec pins "Proposed {age} — not yet verified"

- **Superseded decision.** `proposed-community-wording` (M7, archived) reworded the badges
  to "Proposed / Community-reported" and synced this spec. The owner later reverted to
  "Newly added / Community-checked" (shipped copy — served bundle carries both strings).
- **Artefact.** `openspec/specs/entry-verification-meta/spec.md:63` ("Proposed {age} — not
  yet verified" for UNDER_REVIEW rows), `:73` scenario title "A Proposed row shows the
  under-review line", `:77` "reads 'Proposed 3 d ago — not yet verified'".
- **Counter-check.** Code: the under-review line is "Newly added {age} — not yet verified"
  (served `main.js` carries it; zero "Proposed " hits). The fix is **already staged** in
  the active `shelter-meta-truth` change (its `entry-verification-meta` delta uses the new
  copy) — the main spec updates when that change archives.
- **Fix + blast radius.** Copy the staged delta into the main spec (3 lines + 1 scenario
  line). One file.

### T6 — STALE-HIGH · `account-profile` main spec still claims `nationalIdCode` (and self-contradicts)

- **Superseded decision.** `remove-national-id` (archived): V12 dropped the column;
  registration/profile never accept it; `MeResponse` carries name/email/phone/levels/
  isAdmin only (`auth/MeResponse.java:29-42` — verified field-for-field).
- **Artefact.** `openspec/specs/account-profile/spec.md:6` (Purpose: "…lets them correct
  their name (password-confirmed) and shows national ID code"), `:16` ("`GET /account/me`
  — name, email, phone, **nationalIdCode** — together with…"), `:26` (scenario THEN
  "contains the user's name, email, phone, **national ID code**…"). Same spec, `:73`
  "(…no national ID row)" and `:108` "no national ID code is collected" — the spec argues
  with itself.
- **Counter-check.** FE has zero `nationalId` identifiers outside spec files (grep).
  `MeResponse` committed OpenAPI schema = `email, isAdmin, levels, name, phone` — matches
  code.
- **Fix + blast radius.** Strip the three claims. One file, three lines.

### T7 — STALE-HIGH · `user-contributions` main spec still requires inline edit in the account UI

- **Superseded decision.** Original M8 inline edit. Superseded by M5's edit-mode decision:
  "Edit = the shared /submit form in edit mode… The account area no longer hosts its own
  reduced inline edit form" (`contributions-panel.ts:30-34` — the code documents the
  reversal verbatim).
- **Artefact.** `openspec/specs/user-contributions/spec.md:96-111` — "Each shelter row
  SHALL offer view, inline edit (name/description/capacity/location with client-side
  validation mirroring the backend)…" + scenario "editing and saving persists the change
  (row updates without a full page reload)".
- **Counter-check.** Live flow: the Edit entry is a link to `/submit?edit=<id>` (same full
  creation form prefilled; save = `PUT /api/shelters/{id}` on that page).
- **Fix + blast radius.** Restate the requirement as the /submit?edit=<id> flow. One file,
  one requirement + scenario.

### T8 — STALE-HIGH · `map-browse` main spec: green "Confirmed open" badge, `REPORTED_CLOSED` scenario, reported state missing the OR rule

- **Superseded decisions.** (a) `shelter-trust-and-reports` D6: closed/open "net" to a
  display flag incl. a green "Confirmed open" — the current derivation is **latest fresh
  tap wins + agreeing count** (`ShelterQueryService.deriveOpenStatus`, :719-745), and a
  fresh OPEN row renders **no badge** (`shelter-copy.ts` `openStatusBadgeText` returns
  null for OPEN — "open is the default — no noise"). "Confirmed open" survives only as the
  admin report-type label (`admin-copy.ts:23`). (b) W2-B (`7cbe178`): the reported
  state is the OR of `nonexistentReports` and `inaccurateReports` (contract note in
  `ShelterDto`; FE wired in `60e7cb9`).
- **Artefact.** `openspec/specs/map-browse/spec.md:380-392` — "Shelters with
  `nonexistentReports > 0` SHALL render an orange reported marker… (missing the OR); the
  `openStatus` block … SHALL render as an amber 'Reported closed' or green 'Confirmed open'
  badge" + scenario `:399-402` "WHEN a shelter's status flag is REPORTED_CLOSED" (the flag
  no longer exists — the block is `openStatus.state`).
- **Counter-check.** Served bundle renders exactly the current rules (SD-1 §0 verified the
  compiled `markerTone`; SD-1's F2 documents the FE OR wiring that `60e7cb9` landed).
- **Fix + blast radius.** Restate: reported = either open report kind > 0; openStatus =
  latest fresh tap, "Reported closed" at 1 / "Closed" at 2+, no badge for fresh OPEN;
  rename the scenario to the `openStatus` block. One file.

### D1 — STALE-MED · the agent-context docs still narrate single-confirmation, raw 4→5 auto-hide, and the retired net formula

The three current rules (three distinct confirmers incl. OPEN taps; weighted 5-point tally;
latest-tap-wins open/closed) are documented **nowhere** in `context-and-tasks/`:

- `context-and-tasks/agent/01-TASK.md:12` — "NEW → CONFIRMED via an `OPEN_CONFIRMED` report
  from a non-submitter"; `:99` — same.
- `context-and-tasks/agent/02-CONTEXT-DOMAIN.md:25` — two stale claims in the `Shelter`
  row: "can be auto-hidden by the 5th `NON_EXISTENT` report" and "reach `CONFIRMED`
  automatically (an `OPEN_CONFIRMED` report from a user OTHER than the submitter, in the
  same transaction)"; `:70` — "the `OPEN_CONFIRMED` NEW→CONFIRMED promotion in the SAME
  transaction as the report".
- `context-and-tasks/05-shelter-api.puml:703-705` — "V11: OPEN_CONFIRMED additionally
  carries the NEW -> CONFIRMED promotion in the same transaction, audited AUTO_CONFIRM".
- `context-and-tasks/agent/06-CONTEXT-API.md:97-99` — "an `OPEN_CONFIRMED` report …
  promotes it in the same transaction"; `:265` — same.
- `context-and-tasks/agent/07-STEPS.md:368-371` — "auto-hide fires exactly on the 4→5
  NON_EXISTENT insert… CLOSED vs OPEN_CONFIRMED net to a display-only flag (`closed >
  confirmed` → REPORTED_CLOSED; both ≥ 1 → CONFIRMED_OPEN, **a tie counts as confirmed
  open**)" — both clauses retired (weighted tally; latest-tap-wins; no CONFIRMED_OPEN);
  `:489-492` — single-report promotion.
- (Not counted as stale: `06-CONTEXT-API.md:129` carries the net formula **with** its
  "(V9, D1 — retired)" annotation and a pointer to the live `openStatus` block — properly
  marked history.)
- **Counter-check.** `3f0cbe7` touched the *colour* sentences in 02-CONTEXT-DOMAIN
  (ReviewStatus row) and 07-STEPS (D5 palette) but left every trust-rule sentence above.
  `02-verification-flow.puml` — the handed-over candidate — carries only the generic
  "community reports + confirmation govern quality" (`:121, :125`); **no** single-
  confirmation claim → that specific candidate is a false positive (see §3.17).
- **Fix + blast radius.** Rewrite the six passages against `ShelterReportService`'s
  javadoc (which is the accurate source). Six files, prose only.

### D2 — STALE-MED · `admin-moderation` main spec: "two tabs" vs nine

- **Artefact.** `openspec/specs/admin-moderation/spec.md:115` — "The page SHALL have two
  tabs — Shelters [and Reports]"; `:125` scenario "renders the two tabs".
- **Counter-check.** `admin-page.ts:71-80` — `AdminTab = 'unconfirmed' | 'shelters' |
  'reports' | 'alerts' | 'users' | 'guidance' | 'media' | 'settings' | 'audit'` (9 tabs;
  the file's own comment: "Nine tabs, each one queue").
- **Fix + blast radius.** List the nine tabs (or relax to "the moderation tabs incl.
  Unconfirmed + Audit"). One file, two lines.

### D3 — STALE-MED · `app-polish` main spec: shipped paging listed as deferred; EN/ET localization pin

- **Artefacts.** `openspec/specs/app-polish/spec.md:134-142` — "Deferrals are honest"
  scenario lists "paging / nearest-bbox search" among "the true deferred items" — bbox
  paging is shipped (`shelter-bbox-paging` archived; uniform 1..200 bounds since
  `187e697`; admin-list paging since `5473b1c`; README documents all of it). `:253-273` —
  "Requirement: Localization (Estonian/English) … SHALL be available in both English (`en`)
  and Estonian (`et`)".
- **Counter-check.** The app is trilingual: `core/i18n/locale.ts:12` — `LOCALES = ['en',
  'et', 'ru']`; served `/api/site-texts` carries `en, et, ru` (all empty = shipped
  defaults). The spec even self-contradicts at `:138` ("app chrome is trilingual
  EN/ET/RU"). Nuance: `i18n-ru` is still an **active** change, so the EN/ET pin
  formally updates when it archives — but the code is already shipped and the spec's own
  onboarding scenario says trilingual.
- **Fix + blast radius.** Drop paging from the deferral list; extend the requirement to
  three locales (batch with the `i18n-ru` archive). One file.

### D4 — STALE-MED · `security-posture` main spec: "twelve-attack list" and "fake reviews"

- **Artefact.** `openspec/specs/security-posture/spec.md:10-12` — "covering the
  twelve-attack list (false shelter submissions, brigading / fake reviews, …)".
- **Counter-check.** `docs/security/threat-model.md` now has **A1–A13** (A13 "SSRF via the
  admin hero-image import", added with `guidance-hero-import`), and A2 is "Brigading /
  **fake reports**" (`:79`) — "fake reviews" names a layer removed by V21.
- **Fix + blast radius.** Twelve→thirteen, "fake reports", add A13 to the parenthetical.
  One file, one sentence.

### D5 — STALE-MED · `official-dataset-csv` main spec: exact-header failure condition

- **Superseded decision.** The spec's failure scenario predates `7b7ff32` ("accept the
  quoted header the live registry now serves").
- **Artefact.** `openspec/specs/official-dataset-csv/spec.md:19` ("A wrong header … SHALL
  fail the run") and `:39-41` — "WHEN the endpoint answers 404 (or the header is not
  `id;nimi;aadress;lest_x;lest_y`) THEN … the run is recorded FAILED".
- **Counter-check.** `ingestion/RegistryCsvParser.java:13-16, 89-93` — "The header is
  validated quote-aware, so the same five column names are accepted whether or not the
  fields are quoted." A quoted header (which the live registry serves) imports fine — the
  spec's failure condition no longer fires for it. This is the "spec shape that cannot
  fail" class: today the live source exercises the quoted form on every weekly import.
- **Fix + blast radius.** "The header is not the same five column names (quote-aware)".
  One file, two lines.

### D6 — STALE-MED · README API section: four stale/omitted trust claims

- **`:364`** (`POST /api/shelters/{id}/reports` row) — "The 5th NON_EXISTENT auto-hides an
  ACTIVE shelter" — raw-count phrasing; live rule = weighted tally (T3). (The Features
  bullet at `:11`/`:51` is accurate.)
- **`:152`** (Features, Trust & reports) — "Closed vs open reports net to a display flag
  (\"Reported closed\" / \"Confirmed open\") that never hides" — the net formula and the
  public "Confirmed open" badge are gone (latest-tap-wins; OPEN renders no badge).
- **`:362`** (`PUT /api/shelters/{id}` row) — "the **amber** 'pending verification'
  treatment" (NEW is unified yellow) + "until a verification clears it (the admin CONFIRM
  or a community OPEN_CONFIRMED report from a non-submitter)" (single-confirmation
  phrasing). The "provenance UNDER_REVIEW" in the same cell is **correct**
  (`domain/Provenance.java` still derives `UNDER_REVIEW` for USER+NEW rows) — counter-
  checked, not part of the finding.
- **`:358`** / **`:392`** (row-field lists for `GET /api/shelters` and `GET
  /admin/shelters`) — enumerate the trust fields but omit `inaccurateReports` (present in
  both DTOs since `7cbe178`, and in the committed OpenAPI). Omission, not contradiction.
- **Fix + blast radius.** README only, 4–5 lines.

### D7 — STALE-MED · served legal page under-enumerates geolocation and the locale list

- **Artefacts.** `frontend/src/app/core/i18n/en.ts:1050-1053` (`legal.privacy.location.
  p1`) — enumerates the "Show shelters around you" button and the submit form's "Use my
  location" but omits the detail page's "Distance from you" trigger (T4's third trigger);
  `en.ts:~1074` (`legal.privacy.cookies.li2`) — "your language preference (Estonian or
  English)" vs the trilingual switcher (`LOCALES = ['en','et','ru']`).
- **Served.** `:5173/legal/privacy` returns 200 and renders this catalog copy (page is
  fully catalog-driven; `privacy-policy-page.ts`).
- **Counter-check.** SD-2's copy audit did not cover these two strings (its legal hits
  were `cookies.p2` "suled" and the retention months). `map.geoNote` (`en.ts:187-188`,
  "…is used only to find the nearest shelter") is **borderline-acceptable**: it is the
  map-local note for that request's own use — noted, not a finding.
- **Fix + blast radius.** Catalog copy in three locale files each (the RU/ET twins need
  the same edit). Legal wording — flag propose-and-wait for the exact sentence.

### D8 — STALE-MED · CRQ legend decision (4 entries, amber) vs the wave-7 five-entry filter legend

- **Artefacts.** `openspec/changes/community-review-queue/design.md:42-50` (D5: "Legend:
  Registry / New community / Confirmed community / Reported" + amber token) and
  `proposal.md:41-44` (4-entry legend — colour wording updated to yellow by `3f0cbe7`,
  entry list not). `context-and-tasks/agent/07-STEPS.md:506-507` — "the map legend is now
  **Registry / New community / Confirmed community / Reported** (D5)" (same pass updated
  the palette sentence at `:503-505`, left the legend line).
- **Counter-check.** Live legend (wave 7, "the legend IS the filter"): `en.ts:177-182` —
  Registry (Päästeamet) / Added by a partially verified user / Added by a fully verified
  user / Confirmed by community / Reported — five pin-tone entries with toggle affordance
  (`map-page.html:10-24`). The `map-browse` main spec's legend requirement (`:89-97`) is
  generic enough to still hold ("labels registry markers and user markers") — folded into
  this note, not a separate finding.
- **Fix + blast radius.** Restate D5/proposal/07-STEPS legend as the five filter entries.
  Prose only.

### A1 — STALE-LOW · residual amber "NEW-state" wording (the definitive residue list)

SD-1 F5.1 + SD-2's cross-lane note handed over the amber residue; `60e7cb9` (11:31) fixed
several. Definitive current state (verified by grep after that commit):

**Still stale (NEW-state described as amber — the NEW badge/pin is unified yellow
`#fbf0bf`/`#ffd400` family):**
- `frontend/src/app/core/models.ts:23` — "NEW rows are public IMMEDIATELY (amber 'just
  added' treatment…)"; `:422` — "(amber/green marker + …)".
- `frontend/src/styles.scss:700-701` — "new = the amber trust tint (the `--color-badge-
  new` fill with the dark-amber `--color-warning` text…)" — the fill is the re-tinted
  unified yellow (token comment at `:155-163` says so in the same file); the text token
  half is fine.
- `frontend/src/app/features/shelter/shelter-detail-page.spec.ts:154` — "reviewStatus:
  'NEW', // D3: existing USER rows backfill NEW (amber)".
- CRQ `design.md` D3/D5 and the `shelter-submission` delta (T2 — same fix).
- README `:362` (D6).

**Fixed by `60e7cb9` (SD-1 F5.1 items, now clean):** `map-page.ts:139`,
`shelter-detail-page.html:17`, `contributions-panel.scss:76` (now `:100`, a different,
live comment), `contributions-panel.ts:123`.

**Not stale (warning tone is still the amber/ochre pair by design):** `shelter-copy.ts:274`
("(amber — the warning-tone pair, not the red-orange reported fill)"), `map-page.html:357`
+ `shelter-detail-page.html:36,518` (fresh-CLOSED badge = warning tone), `map-page.spec.
ts:1791` + `:968` (fresh CLOSED amber badge), `contributions-panel.scss:100` +
`contributions-panel.spec.ts:196` (info-request chip = warning tone), admin warning-token
comments (`shelters-panel.scss:24`, `_admin-shared.scss:326`), `design-tokens.spec.ts:373,
612` (narrating the unification itself).

- **Fix + blast radius.** Comment-only: 4 FE lines + the CRQ files + README line. Batch
  with D6/D8.

---

## 2. Served contract — OpenAPI + README + served site

### 2.1 Served vs committed OpenAPI

`GET :8080/v3/api-docs` (161,960 bytes, HTTP 200) vs `docs/api/openapi.json` (last touched
by `240b5f9`). Structural diff (machine-run, all 64 operations):

| Dimension | Served (00:07 process) | Committed (≈ current code) |
|---|---|---|
| Operations added/removed either way | **none** (path+method sets identical) | — |
| Response codes | every op lacks `405` and `415` | present on every op (`ApiErrorHandler` documents/handles both — verified) |
| `GET /admin/audit` params | `limit` only | `limit`, `offset` |
| `GET /admin/media` params | none | `limit`, `offset` |
| `GET /admin/users` params | none | `limit`, `offset` |
| `GET /admin/reports` params | `limit`, `shelterId` | `limit`, `offset`, `shelterId`, `excludeDismissed` |
| `ShelterDto` / `AdminShelterDto` | — | + `inaccurateReports` |
| `GuidancePostDto` / `AdminGuidancePostDto` | — | + `heroImageSrcset` |
| `MediaAssetDto` | — | + `srcset` |
| 60 shared schemas | older description text (pre-V31 `submitterVerification` wording etc.) | current |

The gaps map one-to-one onto today's post-00:07 commits: `5473b1c` (admin list paging +
hide-dismissed), `7cbe178` (W2-B: `inaccurateReports`, trust-snapshot DTO docs), `240b5f9`
(media derivatives `srcset`/`heroImageSrcset`, 405/415 error docs). Live evidence:
`GET :8080/api/shelters?limit=2` rows carry `submitterVerification` but **no
`inaccurateReports`** (same masking condition SD-1 F2 reported).

**Committed snapshot vs current code — faithful.** No controller/DTO/OpenApiConfig change
in `7b7ff32` (CSV header) or `2a3fe47` (trust rule — behaviour only); spot-checks pass:
`MeResponse` schema = `email, isAdmin, levels, name, phone` = code; admin paging params +
`excludeDismissed` present in `AdminController`; 405/415 in `ApiErrorHandler`;
`ShelterSourceFilter` = REGISTRY/USER/ALL (old per-source values 400, as the README
claims).

**Verdict.** Served ≠ committed **because the process is stale, not because the committed
snapshot drifted**. A backend restart converges them (no contract-surface change since
`240b5f9`). **Operational caveat:** `GET /api/data-source` shows `lastImport 2026-09-22T
07:54Z, OK, 302 records` — that import ran on the pre-`2a3fe47` code, i.e. **before the
`Lest97AxisOrder` fix** (11:31). After the restart, re-run the registry import so the
served rows are produced by the fixed transformation. (Coordinate sanity on the 2 sampled
rows was in-bounds, but that doesn't verify the 302 registry rows.)

### 2.2 README API section vs committed contract vs code

Verified accurate (counter-checks): all 64 endpoints present with matching paths/
methods/auth; `limit (1…200)` bounds everywhere (no "10-100" survivor — that candidate is
dead); defaults (reports/audit/users 100, alerts 50) match `AdminController`; the
`X-Total-Count` "seven paged reads" claim matches code (CORS-exposed in `SecurityConfig`,
set by all seven endpoints; `GET /api/shelters` deliberately excluded); `register:` OTP
namespace alive (`verification/RollingContactOtpLimiter.java:29`); the 10-active-shelter
cap, 5/24h submission cap, per-IP 5/min geo resolve, `Retry-After` semantics all match
current limits; `MeResponse` description accurate; the `minRating` "stray param is
ignored" note matches the controller (Spring ignores unknown params; the param is gone).

Stale: the four D6 items. Otherwise the README table is the most current contract
document in the repo.

### 2.3 Served site

| Check | Result |
|---|---|
| `:5173/`, `/login`, `/submit`, `/guidance`, `/legal/privacy` | all 200; shell title "OpenShelter" |
| Served bundle vs current source | current ("Newly added" ×2, "Community-checked" ×2, zero "Proposed ") — dev server recompiles; the process start date is not a staleness signal for the FE |
| `:8080/api/site-texts` | `en, et, ru` present (all empty = shipped defaults) — matches README "en/et/ru always present" |
| `:8080/api/guidance` | 3 published posts; fields `alternates`, `localeFallback`, `heroImageUrl/Alt` present (no hero set on dev posts — data, not contract); pinned-first/manual order applied server-side |
| `:8080/api/data-source` | lastImport OK (see caveat above) |
| Accessibility dialog | three themes in code (`core/theme-tokens.ts:18` — `'default' \| 'high-contrast' \| 'black-and-yellow'`) — matches the documented dialog (SD-2's `qa/accessibility-checklist.md` quote drift was fixed by `3f0cbe7`) |
| Language switcher | three locales (`locale.ts:12`) — matches the served catalog |
| Editable site text | mechanism live (site_texts endpoint + admin PUT, both in served OpenAPI) |
| Map badges/legend | served bundle = current source (SD-1 §0 for the compiled detail) |

Backend-side note handed over by SD-2 (cross-lane, "served-contract side of F8"): the
server-resolved moderation labels are English by construction — `AdminModerationService.
DELETED_SHELTER_NAME = "Deleted shelter"` (`:79`) and the audit/history machine labels.
Not a stale decision (no doc promises localized server labels; the README documents the
audit shape, not the language) — a **language-consistency gap**, recorded here so the
merge pass can decide whether it wants an i18n seam for server-resolved names.

---

## 3. False positives explicitly rejected

1. **"10-100 / 20-100 page sizes" in the README** — zero hits; the uniform 1..200 bounds
   (`187e697`) are documented correctly everywhere.
2. **README "five baseline reporters, trusted reporters weigh more"** (`:11`, `:51`) —
   accurate summary of the weighted tally (baseline weight 1, threshold 5 points); the
   stale version is the API-table cell (D6) and the spec (T3).
3. **`06-CONTEXT-API.md:129` net formula** — carries the explicit "(V9, D1 — retired)"
   annotation + pointer to the live `openStatus` block. Marked history, not stale prose.
4. **Warning-tone "amber" references** (fresh-CLOSED badge, info-request chip, admin
   warning tokens, `styles.scss:143-144,155` token comments, `design-tokens.spec.ts:373,
   612`) — the unification retired only the separate NEW-amber hue; the warning tone
   remains the amber/ochre pair by design. All live.
5. **`models.ts:396-401` "orange reported state" + the W2-B OR comments** — current; they
   document the OR rule and the red-orange reported token (`--color-reported #c2410c`).
6. **"The map page fetches no viewport/paging params"** (SD-2's candidate) — still true
   at the FE level: `map-page.ts` calls `list()` without box/paging params; the server-
   side params exist and are exercised by other consumers.
7. **`shelter-provenance-taxonomy` main spec vs the taxonomy's coloured-marker decision**
   — the main spec was rewritten to "the UI SHALL NOT render provenance as its own chips,
   legend entries or marker colours"; the code honours it (no provenance chips/legend).
   SD-1's own false positive #1; re-confirmed.
8. **`remove-shelter-reviews` / `factual-reports-rating-demotion` residue** — zero
   rating/star/review identifiers in any main spec or shipped FE source; the removal was
   fully spec-synced.
9. **Geocode "1 req/s usage policy"** (README `:330`) — matches `geocode-gateway.ts`
   (`MIN_SPACING_MS = 1000`, hard spacing). SD-2's 10s candidate is dead.
10. **Source filter vocabulary** — `ShelterSourceFilter` = REGISTRY/USER/ALL; old
    per-source values (e.g. `PAASETEAMET`) 400 — README, spec and code agree.
11. **`MeResponse` README description** — accurate (no nationalIdCode). The stale claim
    lives only in the main spec (T6).
12. **`02-verification-flow.puml` "single-confirmation" candidate** — the file only says
    "community reports + confirmation govern quality" (`:121, :125`); no promotion-count
    claim exists in it. The precise stale text is in the D1 files. Candidate refuted as
    filed; the real artefacts are reported under D1.
13. **README `:362` "provenance UNDER_REVIEW"** — `Provenance.UNDER_REVIEW` is a live
    derived value (USER + `review_status = NEW`); the owner-edit reset does produce it.
    Correct as written.
14. **`map.geoNote` "used only to find the nearest shelter"** — map-local note for that
    request's own purpose; the other triggers each carry their own copy. Borderline, not
    a finding (D7 records the adjacent real gap).
15. **Served guidance `heroImageId: none`** — data state (no hero set on dev posts), not
    a contract gap; the `heroImageUrl`/`heroImageAlt` fields are served.
16. **`legal.privacy` retention months / `cookies.p2` "suled"** — SD-2 F-items (line 416,
    368 of that report); not re-reported here.
17. **Served-vs-committed OpenAPI drift as a code defect** — it is process staleness
    (00:07 start), not a repo defect; the committed snapshot matches current code (§2.1).
    The only repo-side action is a restart + re-import, which is outside this lane's
    authority (no server touches) and is handed to the merge pass.

---

## 4. Merge-pass handoff

- **Fix-now, spec/docs prose only (no code):** T1, T2, T3, T4, T5 (batch with the
  `shelter-meta-truth` archive), T6, T7, T8, D1–D8, A1. No two findings touch the same
  file except: `community-review-queue` (T2 + D8 + A1's CRQ lines — one owner),
  `context-and-tasks/agent/07-STEPS.md` (D1 + D8 — one owner), `README.md` (D6 + A1 — one
  owner).
- **Propose-and-wait (wording decisions inside):** D7 (legal geolocation enumeration +
  the trilingual cookie line — three locale files each, legal wording); T1/T3's scenario
  phrasing for the weighted/three-confirmer rules (mirror `ShelterReportService`'s
  javadoc to avoid a fourth telling).
- **Operational (owner action, outside all lanes):** restart the backend (converges
  served OpenAPI + `inaccurateReports` + 3-confirmer behaviour), then re-run the registry
  import (the 07:54Z run predates the `Lest97AxisOrder` fix).
- **Cross-lane, do-not-duplicate:** FE amber comment residue in SD-1/SD-2's file sets
  (A1 lists the definitive state so the merge pass doesn't re-hunt); server-resolved
  admin label language (§2.3 note); SD-2's `admin.reports.dismiss` open item.
