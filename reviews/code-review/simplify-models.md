# SIMPLIFY-MODELS — `core/models.ts` + `gateways/**`

**Branch:** `code-review` · **Standard:** `docs/autopilot/CODE-REVIEW-RUN.md`
**Scope:** `frontend/src/app/core/models.ts` (1 222 L) and `frontend/src/app/gateways/**` (21 files, 3 465 L incl. specs). Nothing else touched.

---

## 1. Split decision: NO split — with the evidence that forced it

The inventory named this the frontend's most-coupled file (~60 DTO types in one
shared file, imported by 65 files). I did **not** split it, because the guard
suite pins this file *textually* in a way that makes any domain split
impossible:

1. **`core/models-contract.spec.ts` parses `models.ts` as text.** It does
   `readFileSync('src/app/core/models.ts')` and then
   `RegExp('export interface <Name>\\b')` + brace matching for each of the 29
   pinned interfaces (`ShelterDto`, `AdminShelterDto`, `CommunityPulse`,
   `MediaAssetDto`, …). A pinned interface that moves to a sub-file is "not
   found in core/models.ts" — a red suite. A re-export
   (`export { ShelterDto } from './models/shelter'`) does **not** satisfy the
   regex; only a physical `export interface` body does.
2. **The pinned set is the response-DTO majority.** 29 of the ~60 types are
   pinned (every response shape); the 31 unpinned ones are the request DTOs.
   A split along the pin boundary would tear the trust layer in half
   (`ShelterReportRequest` out, `ShelterReportResult` in, same section) and
   leave `models.ts` still ~950 lines — churn with no readability win.
   A domain split (shelter / admin / guidance) is impossible outright, since
   every domain contains pinned interfaces.
3. **The backend's `DocumentationFactsTest.feShelterDtoFields()`** also
   text-parses `models.ts`: `export interface ShelterDto\s*\{`, brace
   matching, and a field regex anchored on exactly two-space indentation —
   `ShelterDto` must stay in the file with its field lines intact.

The file is also pure type declarations with no logic, already grouped under
section banners (types → requests → public DTOs → admin DTOs → guidance →
site texts). Per the run standard — *minimal working solution, stop when the
code is plain* — the correct change here is the comment/documentation pass,
which is what I did. **Importers stayed untouched by construction: zero
files outside this scope were modified** (verified: `git status` shows only
the four files in §3; the 65 importers of `core/models` are byte-identical).

## 2. What I changed (comments/docs only — 77 changed lines, 0 code lines)

Verified by line-classification of `git diff -U0`: every `+`/`-` line is a
block-comment line. Behaviour preservation is therefore structural, not
empirical — no spec pin could be affected by the diff.

### 2.1 History → constraint (the inventory's 8 history-tone comments)

| File:line (after) | Before | After |
|---|---|---|
| `core/models.ts:549-552` (AdminOccupancy) | "this block **used to read** a `reportedAt` the API never sent, so every row rendered 'just now' (**reviews/11 F1**) — … **now pins**" | "the field names must match the API byte for byte: `core/models-contract.spec.ts` pins this field set against the OpenAPI snapshot, so a name the API never sends (a `reportedAt`, say) fails the suite instead of rendering blank" |
| `core/models.ts:319-321` (ShelterTrustFilter) | "The `reviewed` filter is **gone with** the review model" | "The vocabulary is exactly `hasCapacity`: there is no `reviewed` param (no server-side review queue to filter on) and no 'Open' param (the chip is client-side)" |
| `gateways/shelter-gateway.ts:45-46` (list) | same "gone with the review model" sentence; "Inactive filters" | "Absent filters … (There is no `reviewed` or 'Open' server param — 'Open' is a client-side chip.)" |
| `gateways/admin-gateway.ts:347-348` (publish) | "The hero import **moved to** SAVE time (the trigger)" | "The hero import happens at SAVE time (create/update)" |
| `gateways/admin-gateway.ts:522` (localeQuery) | "the unscoped, **legacy** read" | "the unscoped read" |
| `core/models.ts:636` (AdminShelterFilters.source) | "the source grouping the backend **now speaks**" | "The frontend-facing source grouping (REGISTRY = … )" |
| `core/models.ts:303` (OpenStatusDto) | stray paren `firm ("Closed")).` | `firm ("Closed").` |

### 2.2 Dangling planning ids removed (guard-legal but unresolvable)

- `core/models.ts:548` — `(reviews/11 F1)` (removed with the history above;
  the durable pointer is the guard file itself, which the new wording names).
- `gateways/shelter-gateway.ts:70` (mine) — `(v2 contract)`: a bare version
  reference no reader can resolve. The sentence now states the contract
  directly: "The public list/detail DTOs carry reviewStatus/locationKind too
  — only reviewNote + infoRequest are owner-scoped."
- `gateways/api-contract.spec.ts:4` — `(SW-I2)`: a swagger-ledger row id.
  Comment-only change in the spec (no title, no assertion touched).

Kept deliberately: kebab feature/spec names (`community-review-queue`,
`crisis-guidance`, `guidance-hero-import`, `admin-locale-scope`, …) — they are
the durable spec references the guard explicitly allows ("a comment either
spells the reason out in words or points at the durable specification path"),
and Flyway versions `V21`/`V26` (the migration files exist in the tree).

### 2.3 Documentation added (non-obvious contracts a reader would otherwise miss)

- **`core/models.ts:7-9` (file header)** — the header now names the guard
  that makes the mirror safe: "`core/models-contract.spec.ts` pins every
  response-DTO field name against the committed OpenAPI snapshot, so a field
  the API never sends fails the suite instead of rendering blank." Also
  disambiguated the contract-source path to `frontend/docs/agent/02-CONTEXT-
  API.md` (the repo-root `docs/agent/` contains only 00-CURRENT-STATE.md, so
  the old unqualified path resolved to nothing from the root).
- **`core/models.ts:629-633` (AdminShelterFilters)** — documents the gap
  between the wire and the FE: "The backend also accepts an optional
  `status` exact-match filter; the FE never sends it — the admin list is
  always the full, hidden-inclusive scope, and hiding is a per-row action,
  not a filter." (Verified against `AdminController.listShelters` — the
  `@RequestParam(required = false) ShelterStatus status` — and the OpenAPI
  snapshot, whose `/admin/shelters` parameter list carries `status`.)
- **`gateways/admin-gateway.ts:604-608` (adminSheltersPath)** — the path
  builder previously had **no** doc comment; the block that should have
  documented it was dangling directly above `localeQuery` and described
  behaviour the function does not have ("fixed order (**status**, source,
  q)" — the function never sends `status`). The comment now sits on
  `adminSheltersPath` and says what it actually does: "fixed param order,
  only the fields actually set appear … The backend's optional `status`
  filter is not part of AdminShelterFilters, so it is never sent."
- **`gateways/admin-gateway.ts:212` (listUsers)** — stale paging semantics
  fixed and verified: "absent = the whole list" → "absent = the backend's
  default 100" (`AdminModerationService.listUsers:686` →
  `Pagination.requireDefaultedLimit(limit, AUDIT_DEFAULT_LIMIT=100)`). This
  is the FE half of the SIMPLIFY-MODERATION board thread; the backend
  `@Operation`/`@Parameter` text + the snapshot description are still stale
  there (not my file — flagged on the board).
- **`gateways/admin-gateway.ts:38` (class table)** — "The thirty-two
  methods, 1:1 (one line per public method below)" was arithmetically
  wrong: the table has 32 endpoint rows but the class has 31 public methods
  (the bare `GET /admin/guidance` and the paged/scoped form are one method,
  `listGuidancePostsPage`). Now: "The endpoints, one line each (thirty-two
  endpoints over thirty-one methods — the bare and the paged guidance list
  share one)."

### 2.4 The deliberate "absent reads as default" idiom — preserved verbatim

Per the lane brief (rule 3), every absence-idiom comment was left exactly as
is, since it documents a deliberate FE-ships-ahead contract:

- `ShelterDto.submitterVerification` — "Optional on purpose: the UI treats
  absent and null identically (no badge), so an older backend that omits the
  field renders exactly as before."
- `ShelterDto.inaccurateReports` / `AdminShelterDto.inaccurateReports` —
  "an older backend omits the field — absent reads as 0".
- `ShelterDetailDto.communityPulse` — "Undefined from an older BE — treat as
  null".
- `GuidancePostDto.heroImageSrcset`, `AdminGuidancePostDto.heroImageSrcset`
  / `heroImportError`, `MediaAssetDto.srcset` — "absent on responses from a
  pre-backend".
- `SiteTextEntryDto.url` — "absent = leave the stored URL alone".

None of these lines appear in the diff.

### 2.5 Deliberately left, and why

- **No reordering.** The file's section order (types → requests → public →
  admin → guidance → site texts) is already the newspaper order; reordering
  1 222 lines is churn with zero readability gain, and the two text-parsing
  guards make the file more fragile than it needs to be.
- **The `.then()`-shaped paged methods** in `admin-gateway.ts` (the
  `ℹ TS 80006 "may be converted to an async function"` hint): pre-existing
  pattern across all five paged methods; converting to `async/await` would
  touch code lines in a comments-only lane.
- **Backend-side stale text** for `/admin/users` ("absent = the whole list"
  in `AdminController.java` + `docs/api/openapi.json`): not my file — board
  thread with SIMPLIFY-MODERATION, backend half still open.
- **`AdminAuditRow`'s `V21` sentence** — kept: it explains *why* the
  `REVIEW_HIDE`/`REVIEW_RESTORE` union members exist but can never arrive
  (the label map must keep them); the migration version is resolvable in the
  tree and legal per the guard.

## 3. Files changed

| File | Before | After | Δ |
|---|---:|---:|---:|
| `frontend/src/app/core/models.ts` | 1 222 | 1 230 | +8 |
| `frontend/src/app/gateways/admin-gateway.ts` | 622 | 624 | +2 |
| `frontend/src/app/gateways/shelter-gateway.ts` | 153 | 152 | −1 |
| `frontend/src/app/gateways/api-contract.spec.ts` | 121 | 121 | 0 (one comment line) |
| **scope total (4 files)** | **2 118** | **2 127** | **+9** |

All other 17 gateway files (10 specs untouched): byte-identical.
`frontend/src/app/core/models-contract.spec.ts`: **byte-identical**
(`git diff` empty).

## 4. Gate evidence

### 4.1 Full frontend gate — GREEN with my diff in place

Detached run (nohup + exit files), started 2026-09-24T06:41+03:00 with only
my diff modified in `frontend/`:

| Gate | Command | Exit | Detail |
|---|---|---:|---|
| test | `cd frontend && npx ng test --watch=false` | **0** | `Test Files 65 passed (65)`, `Tests 1562 passed (1562)` — exact baseline |
| build | `cd frontend && npx ng build` | **0** | pre-existing `users-panel.scss` budget warning (87 B over, not my file, not a failure) |

### 4.2 The contract test passed unmodified

- `git diff --stat frontend/src/app/core/models-contract.spec.ts` → **empty**
  (untouched).
- It ran inside the §4.1 full gate (one of the 1562) — green.
- Isolated re-run after the shared gate went red (below): plain `vitest run`
  (the spec is pure `node:fs` + vitest globals, no Angular transform needed):
  `models-contract.spec.ts` + `api-contract.spec.ts` → **2 files, 5 tests,
  all passed, exit 0** (06:50). This proves both that the pinned interfaces
  still parse out of the edited `models.ts` (all 29 found, ≥100 fields
  checked, subset vs snapshot holds) and that the gateway URL literals are
  unchanged (the `--include`-style scan finds the same ≥20 literals).

### 4.3 Isolated scope verification (after the shared gate went red)

Per the parent's direction, verified in isolation once the parallel map lane
broke the shared bundle build:

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` (current tree, post-map-edit) | **exit 0** — all `.ts` sources incl. my four files typecheck |
| `vitest run` direct: `models-contract.spec.ts` + `api-contract.spec.ts` | **5/5 passed, exit 0** |
| diff line classification (`git diff -U0`, 77 changed lines) | **77/77 comment lines, 0 code lines** |

### 4.4 Shared full-suite gate — BLOCKED by the parallel map lane, named

The 06:47 full re-run (both `ng test` and `ng build`) exits **1** —
`Application bundle generation failed: TS2339: Property 'toneSelected' does
not exist on type 'MapPage'` at `features/map/map-page.html:32-33`
(`map-page.ts` last modified 06:45:32, i.e. **after** my green gate;
untracked `anchor-view.ts`/`legend-view.ts` = the map lane's in-flight seams).
Proof it is foreign to me: my diff is comments-only in four files, none of
them under `features/map/`; `tsc` is green on the same tree. The Angular
unit-test runner serves the **whole pre-built bundle** (its vitest runner
resolves specs from build artifacts), so while that build is broken **no**
subset of frontend specs can run — including `--include`. The shared gate
clears when the map rewrite lands; board entry filed.

## 5. Unverified / out of reach in this lane

- **The TestBed-based gateway specs** (`shelter-gateway.spec.ts` 389 L,
  `admin-gateway.spec.ts` 814 L, and the other seven) were **not** re-run in
  isolation — impossible while the app bundle build is broken (§4.4). Their
  safety with my diff rests on two things: (a) they all passed green inside
  the §4.1 full gate run **with my diff in place** (1562/1562); (b) the diff
  is provably comments-only, so no pin's input changed. They should pass
  again in the parent's final full-gate run after the map lane lands.
- **Per-endpoint 4xx-vocabulary claims** in the gateway javadocs (403/404/
  409 wording etc.): I verified the paging/status semantics I touched
  (`/admin/shelters`, `/admin/users`, `/admin/reports`, `/admin/audit`,
  `/admin/alerts`, `/admin/media`) against the current backend source and
  the OpenAPI snapshot; I did not re-derive every historical 4xx claim —
  the backend ITs pin those, and the backend gate is not this lane's gate.
- **Backend gate**: not run — my scope changed no backend file. (The shared
  backend gate is separately red on the map-page doc anchor; that is the
  SIMPLIFY-GUIDANCE-CTRL board thread.)
- **web-design-guidelines skill**: fetched the current guideline set (per the
  skill's own instruction, from the URL in `docs/skills/web-design-guidelines.md`).
  Its rules cover rendered UI (a11y, forms, animation, theming…); this diff
  changes no UI code, template, style or behaviour, so the audit surface is
  empty. Recorded here per the run rule (a skill rule with nothing to apply
  to is reported, not worked around).

## 6. What I found that is not mine

- `/admin/users` description text is stale on the **backend** side
  (`AdminController.java` listUsers `@Operation`/`@Parameter` + the OpenAPI
  snapshot description, "absent = the whole list") — pre-existing thread,
  backend half still open (board reply filed).
- The map lane's in-flight `MapPage` state blocks the shared frontend gate
  and, transitively, every other frontend lane's gate (board entry filed;
  the backend twin of the same block is already on the board as
  SIMPLIFY-GUIDANCE-CTRL's SHARED GATE RED entry).
