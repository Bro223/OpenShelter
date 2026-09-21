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

## Owner-side queue

1. **ET/RU review packet** — the corpus plus the 38 new strings; every Estonian defect this week
   (`Sule`, `nimekik`, `Hovendatud`, `Kusta`, the word order corrected in `admin.unconfirmed.reject`) has been
   in the machine-written catalog. One word still awaits your call: `admin.reports.dismiss` = `Arvelda`.
2. **Backfill semantics for the trust snapshot** (W2-A) — which standing an already-orphaned row inherits.
3. **Erasure policy** — keep / anonymize / unpublish for a deleted account's submissions.
4. **Visual checks** — black-and-yellow theme including badges, the admin table width, gauge needles on
   shelter 311, and the unified pin colour on a shelter that would previously have shown amber.
5. **Duplicate-race rule** — the researched decision from the earlier queue.
