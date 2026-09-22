# Backlog execution plan — batches with exact tasks

Source: `reviews/12-summary.md` (the twelve-agent sweep, 11 reviewers + summary), plus the owner-reported
defects found outside it. Every task below names its evidence. **Where an anchor is marked
`(re-derive)`, the anchor came from a reviewer's prose and must be re-read from the cited report file
before the edit** — the sweep ran across mid-week commits, so a line number is revision-specific.

Standing rules for every lane:

- One writer per file. A lane that needs a file owned by another wave stops and reports instead.
- Do not commit. The parent gates and commits.
- Gate on **exit codes**, never on a grep of test output. Backend: `flock /tmp/openshelter-mvn.lock mvn -q test`
  (1139 green, JDK 27). Frontend: `cd frontend && npx ng test --watch=false` (1399/59 green) and `npx ng build`.
- A test that passes with the fix reverted is not evidence. Where a lane adds a guard, prove it red by mutation.
- Never edit vendored third-party bytes, never append to an applied migration, never weaken an assertion.
- Report `file:line` for every claim, plus anything not verified.

---

## Wave 1 — in flight (do not dispatch into these files)

| Lane                  | Task                                                                                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QW-BACKEND-CONTRACT` | README citation that fails a clean checkout (CI unblocker) · paging rows + `X-Total-Count` · `source` vocabulary · 400 `content` · 415/405 · `produces=application/json` · permit `/error` · one `Pagination` helper · bounds before the read |
| `QW-ADMIN-PAGE`       | `!live` dropped query-param change · missing fetch-seq on the shelters loader · URL clamping tests · admin i18n bypass (29 sites, ~10 keys, 3 constants) · admin search two sources of truth                                                  |
| `QW-TEST-INTEGRITY`   | `<td>` first-match guard → all-occurrence · Quill `assets` pin · measured doc numbers · pin-colour unification (amber + verified-yellow → one, reported untouched)                                                                            |

---

## Wave 2 — three lanes, disjoint file sets

### W2-A — make paging real, and snapshot trust onto the row

**Goal.** Paging currently slices _after_ the full pipeline: `GET /admin/shelters?limit=1` reads all 308 rows
and issues the same 13 statements as `limit=100`. The public guidance index has a real N+1 (agent 5,
P2-13/P2-1 in the merge). Separately, verified standing is recomputed from a deletable account, so erasure
changes it (owner-reported; part 1 landed as `3c7c2d6`).

**Exact tasks.**

1. `ShelterQueryService` — push `limit`/`offset` into the query and add a count twin so the pipeline stops
   loading the corpus per page. Keep the existing public ordering exactly
   (`pinned DESC, sort_order ASC, published_at DESC, id DESC`) or the pinned rows move; assert the order in a
   test that would fail if the sort changed. Anchor: `ShelterQueryService.java:453` region `(re-derive)`,
   agent 5.
2. Batch the per-row author/trust/report lookups so they run over the **page's** ids only, not the corpus.
   Evidence to reproduce first: the statement count for `limit=1` versus `limit=100` (agent 5 measured both;
   capture your own numbers before and after).
3. Public guidance index — remove the N+1 (hero/media and translation lookups per post). Anchor: agent 5.
4. Page the two unpaged admin lists (media library; the reports queue if it is still unbounded). Anchor:
   agent 5 / agent 10 `(re-derive)`.

   **Owner requirement — pagination on every admin list.** Every admin surface that shows a list
   (reports, users, media, audit, guidance, shelters) must page the same way the shelters list does. Backend
   side: the paging parameters plus a count header on **every** such endpoint in this lane, so the frontend
   work in W3-B and W4 has nothing left to invent. A list left unpaged after this lane is a failure of this
   task, not a follow-up.

   **Owner requirement — report semantics: both report kinds must turn the pin red.** Today only
   "does not exist" reports produce the red pin and the reported badge, while "inaccurate information"
   reports do not — so a shelter its own community has flagged as wrong can look clean. Change the
   derivation so **open** reports of either kind drive the reported state. Open means not dismissed
   (see W3-B's dismiss filter): a dismissed report must stop counting. Keep the change **additive on the
   contract** — do not repurpose `nonexistentReports` (it is published, consumed by the frontend, and in
   the OpenAPI snapshot); add the count that expresses the new rule and let the existing field keep its
   meaning. `Provenance.of` currently takes no author and only a non-existent count; the amber/red state is
   row-owned, so this stays a row-owned computation.
5. Remove the dead `GuidancePostRepository.findPublished` if it is genuinely unreferenced — but only after
   the paging move, because the paging rewrite may be the thing that orphans it (agent 2 noted the order).
6. **Trust snapshot (part 2 of the erasure fix).** Add a column holding the submission's verified standing as
   at write time (migration `V31`, append-only), populate it on write, read it in `ShelterDto`, and keep the
   derivation honest when the column is null on pre-existing rows. `shelters.created_by` is
   `SET NULL` on delete (`V7__shelter_created_by.sql:7`), so `AccountService.deleteAccount` must keep working
   untouched. Live orphans: ids 310–315 (`USER`, `ACTIVE`, `created_by = NULL`).

**Acceptance.** `limit=1` and `limit=100` no longer share a statement count; the pinned-first order is
asserted; the three erasure tests (deletion does not grant standing; registry rows keep theirs; an ordinary
verified author unchanged) stay green; a new test proves the snapshot survives account deletion; a test
proves an orphaned pre-existing row resolves to **unverified** and says so in a comment naming the backfill
decision.

**Must not.** Change the public ordering, change registry pins (registry rows have no author by design and
keep official standing via `source`/provenance), touch `frontend/**`, or append to an applied migration.

**Owner decision required.** Which standing an already-orphaned row inherits. Block the backfill, not the
column.

### W2-C — enforcement

**Goal.** Nothing is enforced. No CI, no application image, no static analysis, no coverage gate, no
dependency scan (P2-16). Every P1 in the sweep was machine-catchable, which is why this is the item that
stops the list recurring.

**Exact tasks.**

1. CI workflow: backend job (JDK 27, `mvn -q verify`, Postgres service container) and frontend job
   (`ng test --watch=false`, `ng build`), triggered on push and PR, with the **clean-checkout** step that
   would have caught the `README.md:645` failure — run the doc/test job against a fresh `git archive`, not
   the working tree.
2. Multi-stage `Dockerfile` (build with Node+Maven, run on a JRE base) and a `/actuator/health`-based
   healthcheck. No secrets in the image; `application.yml` stays the source of runtime config.
3. Static analysis in the build (SpotBugs or PMD — pick one, fail on high-severity only at first) and a
   dependency scan (`mvn dependency-check` or OWASP equivalent) with a documented suppression file.
4. Coverage gate at the **measured** current level minus a small margin, never above the measured value —
   record the measurement in the commit message so the number is auditable.
5. Architecture guard: fail the build when a directory under `frontend/src/app/features/` or an `AdminTab`
   value has no counterpart in the routing/guard tables. The repo already has the backend equivalent
   (`ApiDocsGuard`, `DocumentationFactsTest`); this is its frontend twin.
6. `.env.example`, compose DB binding to `127.0.0.1` only, and a README quickstart that a new developer can
   actually run (today it cannot — P2-11). Anchor: agent 10.

**Acceptance.** A deliberately broken branch fails CI on each gate (prove two of them, e.g. the clean-checkout
job and the coverage gate); the image builds and starts; the guard fails against a synthetic unrouted feature
directory.

**Must not.** Add a gate that fails on the current main branch — land the gates at measured levels first.
Do not bump dependency versions in this lane (that is W3-C, which owns `pom.xml` afterwards).

### W2-D — frontend paging layer and shared control styles

**Goal.** The paging policy is duplicated four times and the newest lane re-created duplication the previous
refactor removed (agent 2). Size-change clamping, page bounds and out-of-range handling exist in three
inconsistent shapes.

**Exact tasks.**

1. `shared/paging.ts` with the size steps, `MIN`/`MAX`, and one clamp/normalize pair; a single
   `PagedRows<T>` shape; one out-of-range component (empty state + a "back to the first page" action) used by
   map, list, shelter detail, admin guidance and admin shelters.
2. Move `.chip`/`.badge` out of feature styles into `styles.scss` next to `.btn`/`.field`, and delete the
   copies. The existing design-token spec parses `styles.scss` one line at a time — keep every token
   declaration on its own line with comments **above** it, or the spec reads it as missing (this has already
   broken the suite once).
3. Keep the rule the admin lane shipped: drag-and-drop only when the scope fits one page; move buttons are
   page-local. Do not re-enable DnD across pages.
4. Re-baseline the bundle budget to the **measured** value with the measurement recorded (the raw budget is
   currently ~151 kB over and permanently red — P2-10). Do not raise it beyond the measurement.

**Acceptance.** One implementation of the clamp (grep proves the copies are gone); the design-token spec
green; a spec per surface proving an out-of-range page normalizes the URL; build budgets green at the
recorded measurement.

**Must not.** Add a runtime dependency (the earlier lane rejected SortableJS/cdk/ngx-drag-drop on purpose),
touch `features/admin/**` (W3-B), or change any backend contract.

---

## Wave 3 — split and harden

### W3-A — split `GuidanceService` by seam

Land this **after** W2-A: splitting a service whose query behaviour is still being corrected just moves the
bug. `GuidanceService` is 1 291 lines / 25 public methods and is the origin of the paging duplication
(agent 2, agent 7). Extract `GuidanceSearch`, `GuidanceOrderingService`, validation, and the neutral list
helper, per `reviews/12-summary.md`'s LR3 plan. In the same lane, extract the `CurrentCaller` primitive
(replacing the authenticated-user lookup copy-pasted five times — `requireUserId`, `requireShelter`,
`inTransaction`, and the dangling-actor variants, agents 2/11) and the `FailClosedGuard` template, and move
shelter-ownership enforcement out of the guidance path into `ShelterService` (agent 2/4). Acceptance:
existing tests untouched and green; every extracted class has a test; the service drops below the size the
plan names. Must not: change any response body, or extract while a caller is mid-refactor in the same file.

### W3-B — shrink `AdminPage`

`admin-page.ts` is 2 072 lines with 26 gateway calls and 26 + 9 tab members; `admin-page.html` is 1 223 lines;
≈3 577 lines together (agent 1/10, LR4). Extract the remaining seven tab panels using the pattern the
guidance panel already follows, and add the frontend architecture diagram + guard if W2-C did not already
include them. **Two owner requirements land in this lane.** (1) The reports list must let a moderator **hide dismissed
reports** — today a dismissed report stays mixed into the same list forever, so the queue never shrinks and
the moderator cannot see what still needs attention. The filter is a first-class control, with a default
state chosen so nothing is hidden silently, and a dismissed report must stop counting toward the red pin
(the W2-A rule). (2) Every list in the admin — reports, users, media, audit, and the rest — gets the same
paging control the shelters list has, built on W2-D's shared component rather than a per-tab copy.

Acceptance: no tab panel inline in `admin-page.*`; the admin specs green; the i18n template
guard (23 templates) still green. Must not: change behaviour, re-introduce English copy (W1's i18n fix must
survive), or touch backend files.

### W3-C — security and ops

HSTS never fires in the documented deployment (agent 4) — fix the documented deployment or the header, and
say which; OTP codes are stored as unkeyed SHA-256 (key them, with the migration path for existing rows);
429 is absent from 58 of 64 operations plus 6 per-operation claims such as `LocationController.java:92-93`,
and `Retry-After` is promised but not sent (P2-7); there are **zero** log lines for throttles or auth failures
while `docs/security/operations.md` tells operators to watch for them; `/auth/refresh` and `/auth/logout` are
unthrottled (P3-B); nine `log.error` calls drop their throwable (P3-C); dependency-advisory bumps (tomcat,
jackson, bcprov) with the suite green after. Acceptance: each item with a test or a documented
non-code change; the ops doc matches what the code actually logs. Must not: change a public response shape,
or weaken throttling that exists.

---

## Wave 4 — cleanup and quality

### W4-A — dead code and surviving duplication

`updateGuidanceTranslation` is referenced only by its own spec, which is why translations still cannot be
edited in the UI (agent 7) — wire it into the admin UI rather than deleting it, and keep its contract.
`listGuidancePosts` is orphaned (P3-E). Remaining copy-paste from P2-3/P2-4: the identical exception messages
(`InvalidAccessTokenException("Unknown user")`, `InvalidContactChangeException("Account not found")`), the
identical contact `normalize` in `ShelterReportService.java:320` and `AdminModerationService.java:616`, the
`attachIfAbsent` and `AdminShelterDto` variants, and the duplicated validation. Also the four P3 groups not
covered above (backend structure/config drift, backend dead code, API/logging polish, test hygiene: two ITs
boot the full app and Postgres just to assert a bean exists). Acceptance: duplication proven gone by grep,
suite green, no behaviour change. Must not: delete something whose only caller is reflection, a template, or
a migration.

### W4-B — media derivatives

Full-size originals are served into 40–72 px slots and there is no `srcset` (P2-9). Generate derivatives at
upload with the existing streaming/magic-byte/size guards extended, store them alongside the original, and
serve `srcset` at every thumbnail slot. Acceptance: a measured byte drop for a thumbnail page; the upload
guards keep their tests; a derivative that fails validation keeps the post a DRAFT (existing behaviour).
Must not: re-encode in a way that loses the original, or change the public media URL shape.

### W4-C — docs and onboarding

Runnable quickstart (P2-11); lazy the five auth routes (P2-10); the gateway's "twenty-nine endpoints" claim
versus 32 methods (P3-F); the remaining doc numbers after W1's corrections. Acceptance:
`DocumentationFactsTest` green from a clean checkout; every corrected number measured in this lane.
Must not: introduce a claim that is not machine-checked or freshly measured.

### W4-D — a distinct shape for the NEW pin

The pin-colour unification (W1) merged amber into the verified yellow, on the premise that shape already
distinguished the states. The lane proved that premise only half true: shape separates **partial from full
verified** (triangle vs circle), but **new and full-verified are both 14px circles** — so on the map a
brand-new community submission now looks identical to a fully verified one. The state is still carried by
badge text on the sidebar, detail header, `/mine` and the admin list, and by the legend's deliberate
absence of a NEW entry, but the pin itself is silent. Commission a distinct marker shape for NEW (a ring or
notch, single-sourced in the marker class so the legend follows), then add the pair to the map re-stack
spec. Acceptance: a NEW pin and a fully verified pin are distinguishable without reading text, asserted in
a spec rather than described in a comment. Must not: re-split the colour family (the owner decided one
yellow), or touch the reported red-orange treatment.

---

## Wave 5 — verification and delivery

One independent auditor that reads the repository rather than the lanes' reports, writing to
`reviews/15-delivery-audit.md`: does it build and run, do the tests actually pin the fixed behaviour
(mutation-check the new guards), did any lane leave a false claim in a doc, and is anything from the sweep
silently unaddressed. Then the full gate set, and the push.

---

## Wave 7 — the legend becomes the filter (owner request, queued)

**Dispatch after I18N-TOKEN-COPY releases `features/map/**`, `styles.scss` and the catalogs.**

Owner request: the legend items that represent map pins become **clickable to select and unselect**, so the legend is the filter; a brief affordance line explains the mechanic ("click to select"), translated into Estonian and Russian. The green square entry is excluded — first identify what that entry actually is and report it rather than assuming.

Constraints that make this safe and the reason it is one lane:
- **One control, not two.** The map already has a separate trust-chip filter row; two controls for one piece of state is the exact "two sources of truth" defect the audits keep finding. Make the legend the single filter and remove or absorb the chip row, reporting which you chose.
- The legend swatches already reuse the real marker classes, so selection state must not fork the geometry or the colours — a selected entry renders the same pin the map draws.
- Selection must be reflected in the URL (the paging/filter work already established URL-only persistence; no localStorage) and must survive a reload, with the same clamp/normalize discipline as the other filters.
- Filtering is a display concern: it must not refetch or alter the underlying data, and must not change what a shelter *is*. An empty result gets the shared empty state, not a blank map.
- Accessibility: entries are real buttons with an accessible name and a pressed state, keyboard operable, and the affordance line is the accessible description — not a colour cue alone.
- The hint string is new copy in three languages: provide it, and route it through the native-speaker review packet rather than treating machine output as final.
- Tests: selecting filters the rendered markers, unselecting restores them, the URL round-trips, keyboard toggling works, and the affordance string exists in all three catalogs. Prove the filter test red against a no-op first.

---

## Wave 8 — mobile legend placement and the filter cleanup (owner requests, queued)

**Dispatch after TAIL-FIXES releases `map-page.spec.ts` and the pin specs.**

1. **Bring the legend out of the map element on small screens.** On mobile and tablet the legend overlays the map heavily enough that the map itself is hard to see. At the small breakpoints it must render **outside** the map container (e.g. below it in the page flow) rather than absolutely positioned over it, while staying inside/over the map at desktop widths where there is room. Verify at the real breakpoints rather than at one width, and check the interaction with the legend-as-filter control added in Wave 7 — the control must remain reachable and keyboard-operable in both placements, and the affordance line must still be visible next to it. Bootstrap/`styles.scss` breakpoint tokens are the single source; do not invent new breakpoints.
3. **Fix the colour semantics the NEW-pin removal exposed (owner-reported) — LANDED by MAP-UX-2.** `--color-shelter-user` was green, so an unverified submission looked verified. Corrected model, which matches the owner's own description ("from yellow to green, to become verified"): **unverified = yellow** (`#ffd400` in all themes) and **verified = green** (light `#237a57`, high-contrast and black-and-yellow `#7fd49a`), with `--color-new` unified to the verified value per theme. Shape still separates partial (triangle) from full (circle); registry stays blue, reported stays red-orange, picked stays teal. Badge tints were re-derived to match and the pairs are enforced in the contrast list, plus a test pinning colour-to-meaning and the absence of any grey. **A mid-flight instruction of mine said "unverified is neutral grey" — that was wrong and superseded; there is no grey in this palette.** `--color-shelter-user` (`styles.scss:168`, "user-submitted — community rows stay green") is rendered by `.shelter-marker--user` for any USER row with no verification, so a freshly added, unverified shelter now shows **green** — while the owner, like the rest of the UI, reads green as "verified". Before today such a row showed the NEW ring, which masked this; removing NEW exposed it.

   Decision: **green means verified, and unverified is neutral.** Re-tint the verified family (`--color-verified` and its unified `--color-new`) to the green the owner expects, keep the shape distinction that separates partial (triangle) from full (circle), and give the unverified user tone a neutral grey so "not yet verified" cannot be mistaken for verified. Update every derived value — badge tints, the legend swatches (which reuse the marker classes), and the trust-scale wording — in **all three themes**, and put every resulting foreground/background pair into the enforced contrast list rather than describing it in a comment. The reported red-orange stays reserved and distinct; registry stays blue; picked stays teal. Pin the mapping with a test so a future re-tint cannot silently separate colour from meaning, and state the before/after token values in the report. 2. **Remove the source-kind filter chips — `Kõik` (All), `Register` (Registry), `Kasutaja` (User).** They are the leftover duplicate of the Wave 7 legend filter, which was meant to absorb them; the owner wants them gone so there is exactly one filter control. Check for anything that still reads their state (URL parameter, a spec, an empty-state message, an accessibility label) and remove it coherently rather than deleting only the markup. If the legend filter does not yet cover the registry-versus-user distinction these chips carried, say so explicitly instead of silently losing the ability to filter by source.

---

## Wave 9 — fetch the hero image when the post is saved (owner request, queued)

The hero image is currently imported only when a post is **published**, so the owner cannot inspect the fetched image while drafting — and by the time he can see it, it is already public. The publish-time coupling is not a safety property.

Change: import the hero on **save** (create and update), regardless of draft or published status, and re-import when the URL changes.

What must NOT be removed — these are correctness, not theatre: the http/https-only scheme check, the no-user-info rule, the per-hop redirect address re-validation, the streaming size cap, the magic-byte type gate, the pixel-dimension cap, and derivative generation with its gates. A fetch that fails validation on save must **not** block saving: store the post, surface the failure to the admin as a clear message against the hero field, and leave no broken or placeholder image behind. State what the post's hero state is after a failed import (none, or the previous image) and why.

Tests: saving a draft with a URL fetches it (the owner's case); changing the URL re-fetches; a URL failing each guard saves the post with the error surfaced and no image stored; a publish no longer triggers a first fetch that could fail after the fact.

---

## Wave 10 — one current-state model document, and a guard that keeps it true (owner request, queued)

**Dispatch after MAP-UX lands** — it is changing the palette, and a sync lane running concurrently would document a model in transit.

Owner's observation: documentation is out of sync with what the system does, which makes it harder for subagents to understand the context. The measurable cost today: a lane stopped mid-task to re-derive the pin palette because the docs disagreed with each other and with the code, and a colour decision was misread because the specs described a retired mapping.

Two parts:
1. **One authoritative current-state entry point** that a lane reads first, covering the live **trust ladder** (what each state means and which tone renders it), the **palette semantics** with the actual token values per theme, the **verification rule** (three distinct confirmers, submitter's own reports excluded), the **reported rule** (either report kind, dismissed excluded), the **paging and filter rules**, and the **legend-as-filter** contract — each claim carrying a `file:line` pointer to the code that implements it. State the standing rule explicitly: documents describe current state; history lives in dated blocks.
2. **A guard that fails the build when a document contradicts the code** on anything machine-checkable: token values against the palette document, the verification-threshold constant against the trust document, the reported rule against the API document, the marker tone set against the map document. `DocumentationFactsTest` already pins Flyway ranges, controller mappings and cited paths — extend that mechanism rather than inventing a parallel one, and prove each new pin red by breaking the document in a throwaway copy.

Evidence base already on disk and verified today: `reviews/stale-decisions/SD-1-colour-rendering.md`, `SD-2-catalogs-copy.md`, `SD-3-docs-and-contract.md`, `reviews/stale-decisions/SUMMARY.md`, and `reviews/15-delivery-audit.md` — seed the work from those rather than re-deriving from scratch.

---

## Wave 11 — complete documents review (owner request, queued)

Not a spot-check: **every** document in the repository, each with a verdict, so the review is provably complete. Inventory at least `README.md`, `frontend/README.md`, `docs/**`, `docs/agent/**`, `frontend/docs/**`, `qa/**`, `openspec/specs/**`, `openspec/changes/**`, `context-and-tasks/**` and `reviews/**`, and produce a file-by-file table saying, for each: current-state claim, verified against code/measurement, historical (date-stamped and correctly scoped), or **false** with the contradiction cited.

Acceptance: every claim is either verified with a `file:line` or measured value, or explicitly scoped as history; anything that cannot be verified is marked as such rather than softened. Extend the Wave 10 guard to every machine-checkable claim found, and prove each new pin red by breaking the document. Seed from the audits already on disk (`reviews/stale-decisions/*`, `reviews/15-delivery-audit.md`) but do not treat them as coverage — they were lens-based and incomplete by design.

Batch as up to three lanes over disjoint document sets (root+frontend, engine docs+agent packs, specs+qa+context), with one merging pass.

---

## Wave 12 — comprehensive codebase review (owner request, queued)

A full pass over the code, not another lens. Cover at minimum: structure and layering, dead code and duplication, correctness and concurrency, authorization and security, query cost and performance, error handling and logging, migration and data integrity, dependency and tooling hygiene, accessibility, i18n completeness, and **test quality** — including a mutation-check of every guard that claims to protect something, because this repository has already produced six guards that passed while their behaviour was gone.

Two requirements that make it a review rather than a re-run of the twelve-agent sweep: it must name what it did **not** examine, and every finding must carry `file:line` plus a counter-check showing the finding is live. Batch as up to three lanes over disjoint subsystems with one merging pass, and sequence it after the current waves land so it reviews a settled tree.

---

## Wave 13 — guidance hero must not be distorted (owner request, queued)

Owner report: the image on a guidance post looks **stretched**. He wants the original aspect ratio preserved, or at minimum no distortion.

The stored derivatives already follow the original's aspect ratio by design, so suspect the **rendering** first: find every place a hero/guidance image is drawn with a fixed width *and* height and no aspect constraint, and check each rendered box against the file's real width/height ratio (measure both; do not eyeball). Then check the import path too — a resize that assigns a width and height independently would distort at the source, and any such case must be fixed there rather than masked in CSS.

Preferred fix: let the box follow the image's own ratio (`aspect-ratio` from the real dimensions). Acceptable fallback where the design needs a fixed box: `object-fit: cover` so the image is cropped, never squashed — and state which slots you chose it for and why. Cover the public detail page, the public list card, the admin editor's hero picker and the selected-hero thumb, in all three themes, and keep the `srcset`/`sizes` wiring intact so a derivative is still chosen correctly at each slot.

Tests: assert the rendered element's declared aspect or object-fit for each slot, and add a case with a deliberately non-square image (a real file, not a mocked dimension) so a future change cannot reintroduce stretching. Also check whether an uploaded portrait image distorts where a landscape one does not.

---

## Wave 14 — copy that earns its place (owner request, queued)

**Blocked on MAP-UX-2 releasing the i18n catalogs.**

Owner's observation: the subject is serious, but strings across the site read like **comments about the implementation** rather than information for the person reading them. His example — "For security, changing the email is confirmed by an SMS code sent to the phone number on your account — never to the new address." — explains *why we built it that way* instead of telling the user what will happen and what they must do. He wants such strings either **removed** or rewritten to carry real value, not decoration (his counter-example: describing a red button as clear and beautiful with rounded corners).

The rule for the pass, and it is not a wording preference: **every user-facing string must state something the reader needs** — what will happen, what they must do, what it costs them, or what they can expect next. A string that explains our reasoning, argues for a design decision, describes an implementation, or comments on the UI is either deleted or replaced with the concrete fact. Test each candidate against: *if this disappeared, would the user make a worse decision?*

Where to look: the auth and account flows, verification and contact-change copy, consent and legal summaries, the guidance/crisis surfaces, admin moderation copy, empty and error states, and the accessibility dialog. Prioritise the strings a user meets when they are stressed — crisis guidance and safety-critical instructions first, in the plainest register, no idioms, no reassurance that does not inform.

Constraints: do not invent policy or promises, and do not change behaviour-announcing copy into something vaguer. Safety, legal and moderation strings need native-speaker sign-off — produce English source plus ET/RU drafts marked as awaiting review, and extend the owner review packet rather than treating machine output as final. Add or update the specs that pin copy so a removed string cannot silently return.

---

## Wave 15 — remove border-left accent styling (owner request, queued)

**Blocked on MAP-UX-2 releasing `styles.scss` and the component stylesheets.**

Owner: the `border-left: 3px solid var(--color-primary)` treatment (and its variants) reads as machine-generated and makes the site look unserious. Remove it everywhere, keeping a subtly different background instead.

Sweep every form across all stylesheets — `border-left`, `border-inline-start`, shorthand `border`/`border-width` that sets a single side, and any token-based or `color-mix` variant — and replace each with a background distinction (a tint from the existing surface tokens). Keep the semantic meaning the border carried: a warning, a success note and an informational block must remain distinguishable **without** the border, in all three themes, and every resulting foreground/background pair must go into the **enforced** contrast list rather than being eyeballed. Check RTL and the two non-default themes explicitly, and keep the design-token spec's invariants satisfied (token declarations on one line, comments above).

Acceptance: a grep for single-side border accents returns nothing outside the vendored files, the three themes are contrast-verified, and the affected specs are updated rather than deleted.

---

## Owner-side queue

1. **ET/RU review packet** — the corpus plus the 38 new strings; every Estonian defect this week
   (`Sule`, `nimekik`, `Hovendatud`, `Kusta`, the word order corrected in `admin.unconfirmed.reject`) has been
   in the machine-written catalog. One word still awaits your call: `admin.reports.dismiss` = `Arvelda`.
2. **Backfill semantics for the trust snapshot** (W2-A) — which standing an already-orphaned row inherits.
3. **Erasure policy** — keep / anonymize / unpublish for a deleted account's submissions.
4. **Visual checks** — black-and-yellow theme including badges, the admin table width, gauge needles on
   shelter 311, and the unified pin colour on a shelter that would previously have shown amber.
5. **Duplicate-race rule** — the researched decision from the earlier queue.
